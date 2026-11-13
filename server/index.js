import 'dotenv/config'
import express from 'express'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'
import { z } from 'zod'

const app = express()
const port = Number(process.env.PORT || 3001)
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
app.disable('x-powered-by')
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
  res.setHeader('X-Frame-Options', 'DENY')
  next()
})
app.use(express.json({ limit: '32kb' }))

const asyncHandler = handler => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next)

const env = z.object({
  SUPABASE_URL: z.string().url(),
  SUPABASE_ANON_KEY: z.string().min(1),
}).safeParse(process.env)

const taskInput = z.object({
  title: z.string().trim().min(1).max(240),
  description: z.string().max(5000).optional().default(''),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional().default('medium'),
  status: z.enum(['todo', 'in_progress', 'done', 'cancelled']).optional().default('todo'),
  category: z.string().max(80).nullable().optional(),
  tags: z.array(z.string().trim().min(1).max(32)).max(12).optional().default([]),
  due_at: z.string().datetime({ offset: true }).nullable().optional(),
  estimated_minutes: z.number().int().min(1).max(10080).nullable().optional(),
  recurrence_rule: z.string().max(200).nullable().optional(),
})

const proposalSchema = z.object({
  summary: z.string().min(1).max(500),
  tasks: z.array(z.object({
    title: z.string().min(1).max(240),
    description: z.string().max(1000).default(''),
    priority: z.enum(['low', 'medium', 'high', 'urgent']),
    estimated_minutes: z.number().int().min(5).max(480),
    suggested_due_offset_days: z.number().int().min(0).max(365),
    reason: z.string().max(300).default(''),
  })).min(1).max(20),
  tips: z.array(z.string().max(240)).max(5).default([]),
})

let supabase = null
if (env.success) supabase = createClient(env.data.SUPABASE_URL, env.data.SUPABASE_ANON_KEY, { auth: { persistSession: false } })

const requireUser = asyncHandler(async (req, res, next) => {
  if (!supabase) return res.status(503).json({ error: 'Supabase is not configured on the server.' })
  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : ''
  if (!token) return res.status(401).json({ error: 'Authentication required.' })
  const { data, error } = await supabase.auth.getUser(token)
  if (error || !data.user) return res.status(401).json({ error: 'Invalid or expired session.' })
  req.user = data.user
  req.db = createClient(env.data.SUPABASE_URL, env.data.SUPABASE_ANON_KEY, {
    auth: { persistSession: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  })
  next()
})

// A small per-process limit protects the paid AI endpoint from accidental request loops.
const aiRequestWindows = new Map()
const limitAiRequests = (req, res, next) => {
  const now = Date.now()
  const key = req.ip
  const windowMs = 60_000
  const maxRequests = 12
  let entry = aiRequestWindows.get(key)
  if (!entry || now - entry.startedAt >= windowMs) {
    entry = { startedAt: now, count: 0 }
    aiRequestWindows.set(key, entry)
  }
  if (entry.count >= maxRequests) {
    const retryAfter = Math.max(1, Math.ceil((windowMs - (now - entry.startedAt)) / 1000))
    res.setHeader('Retry-After', String(retryAfter))
    return res.status(429).json({ error: 'Too many AI planning requests. Please try again shortly.' })
  }
  entry.count += 1
  if (aiRequestWindows.size > 10_000) {
    for (const [ip, item] of aiRequestWindows) {
      if (now - item.startedAt >= windowMs) aiRequestWindows.delete(ip)
    }
  }
  next()
}

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }))

app.get('/api/tasks', requireUser, asyncHandler(async (req, res) => {
  const { data, error } = await req.db.from('tasks').select('*').order('due_at', { ascending: true, nullsFirst: false })
  if (error) return res.status(400).json({ error: 'Could not load tasks.' })
  res.json({ tasks: data })
}))

app.post('/api/tasks', requireUser, asyncHandler(async (req, res) => {
  const parsed = taskInput.safeParse(req.body)
  if (!parsed.success) return res.status(422).json({ error: 'Invalid task data.', details: parsed.error.flatten() })
  const { data, error } = await req.db.from('tasks').insert({ ...parsed.data, user_id: req.user.id }).select().single()
  if (error) return res.status(400).json({ error: 'Could not create task.' })
  res.status(201).json({ task: data })
}))

app.patch('/api/tasks/:id', requireUser, asyncHandler(async (req, res) => {
  if (!z.string().uuid().safeParse(req.params.id).success) return res.status(400).json({ error: 'Invalid task ID.' })
  const parsed = taskInput.partial().safeParse(req.body)
  if (!parsed.success || Object.keys(parsed.data || {}).length === 0) return res.status(422).json({ error: 'Provide valid task fields to update.' })
  const { data, error } = await req.db.from('tasks').update(parsed.data).eq('id', req.params.id).select().maybeSingle()
  if (error) return res.status(400).json({ error: 'Could not update task.' })
  if (!data) return res.status(404).json({ error: 'Task not found.' })
  res.json({ task: data })
}))

app.delete('/api/tasks/:id', requireUser, asyncHandler(async (req, res) => {
  if (!z.string().uuid().safeParse(req.params.id).success) return res.status(400).json({ error: 'Invalid task ID.' })
  const { data, error } = await req.db.from('tasks').delete().eq('id', req.params.id).select('id').maybeSingle()
  if (error) return res.status(400).json({ error: 'Could not delete task.' })
  if (!data) return res.status(404).json({ error: 'Task not found.' })
  res.status(204).end()
}))

app.post('/api/ai/plan', requireUser, limitAiRequests, asyncHandler(async (req, res) => {
  const body = z.object({
    goal: z.string().trim().min(8).max(2000),
    deadline: z.string().datetime({ offset: true }).optional(),
    available_minutes_per_day: z.number().int().min(15).max(720).optional().default(120),
    context: z.string().max(2000).optional().default(''),
  }).safeParse(req.body)
  if (!body.success) return res.status(422).json({ error: 'Provide a goal of at least 8 characters and valid planning options.' })
  if (!process.env.OPENAI_API_KEY) return res.status(503).json({ error: 'AI provider is not configured.' })

  try {
    const ai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, timeout: 30_000, maxRetries: 1 })
    const completion = await ai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      temperature: 0.3,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: 'You are a pragmatic productivity planner. Return JSON only with keys summary, tasks, tips. Create a realistic sequence of small actionable tasks. Never claim to have changed any existing task or calendar. Each task needs title, description, priority (low|medium|high|urgent), estimated_minutes (5-480), suggested_due_offset_days (0-365), and reason. Include no more than 20 tasks and 5 tips. Respect the daily time budget and deadline.' },
        { role: 'user', content: JSON.stringify(body.data) },
      ],
    })
    const raw = completion.choices[0]?.message?.content
    if (!raw) throw new Error('Empty AI response')
    const proposal = proposalSchema.parse(JSON.parse(raw))
    res.json({ proposal, requires_approval: true })
  } catch (error) {
    console.error('AI planning failed:', error instanceof Error ? error.message : 'Unknown error')
    res.status(502).json({ error: 'The AI planner could not produce a valid plan. Please try again.' })
  }
}))

// Unknown API paths should return JSON instead of the SPA's index.html.
app.use('/api', (_req, res) => res.status(404).json({ error: 'API route not found.' }))
app.use(express.static(path.join(root, 'dist')))
app.get('*', (_req, res, next) => res.sendFile(path.join(root, 'dist', 'index.html'), error => {
  if (error) next(error)
}))

app.use((error, _req, res, _next) => {
  if (error?.type === 'entity.too.large') {
    return res.status(413).json({ error: 'Request body is too large. Maximum size is 32 KB.' })
  }
  if (error instanceof SyntaxError && error.status === 400 && 'body' in error) {
    return res.status(400).json({ error: 'Request body contains invalid JSON.' })
  }
  console.error('Request failed:', error instanceof Error ? error.message : 'Unknown error')
  res.status(500).json({ error: 'An unexpected server error occurred.' })
})

app.listen(port, () => console.log(`Daymark API listening on :${port}`))
