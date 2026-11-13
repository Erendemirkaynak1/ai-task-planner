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
app.use(express.json({ limit: '32kb' }))

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

const requireUser = async (req, res, next) => {
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
}

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }))

app.get('/api/tasks', requireUser, async (req, res) => {
  const { data, error } = await req.db.from('tasks').select('*').order('due_at', { ascending: true, nullsFirst: false })
  if (error) return res.status(400).json({ error: 'Could not load tasks.' })
  res.json({ tasks: data })
})

app.post('/api/tasks', requireUser, async (req, res) => {
  const parsed = taskInput.safeParse(req.body)
  if (!parsed.success) return res.status(422).json({ error: 'Invalid task data.', details: parsed.error.flatten() })
  const { data, error } = await req.db.from('tasks').insert({ ...parsed.data, user_id: req.user.id }).select().single()
  if (error) return res.status(400).json({ error: 'Could not create task.' })
  res.status(201).json({ task: data })
})

app.patch('/api/tasks/:id', requireUser, async (req, res) => {
  const parsed = taskInput.partial().safeParse(req.body)
  if (!parsed.success || Object.keys(parsed.data || {}).length === 0) return res.status(422).json({ error: 'Provide valid task fields to update.' })
  const { data, error } = await req.db.from('tasks').update(parsed.data).eq('id', req.params.id).select().maybeSingle()
  if (error) return res.status(400).json({ error: 'Could not update task.' })
  if (!data) return res.status(404).json({ error: 'Task not found.' })
  res.json({ task: data })
})

app.delete('/api/tasks/:id', requireUser, async (req, res) => {
  const { data, error } = await req.db.from('tasks').delete().eq('id', req.params.id).select('id').maybeSingle()
  if (error) return res.status(400).json({ error: 'Could not delete task.' })
  if (!data) return res.status(404).json({ error: 'Task not found.' })
  res.status(204).end()
})

app.post('/api/ai/plan', requireUser, async (req, res) => {
  const body = z.object({
    goal: z.string().trim().min(8).max(2000),
    deadline: z.string().datetime({ offset: true }).optional(),
    available_minutes_per_day: z.number().int().min(15).max(720).optional().default(120),
    context: z.string().max(2000).optional().default(''),
  }).safeParse(req.body)
  if (!body.success) return res.status(422).json({ error: 'Provide a goal of at least 8 characters and valid planning options.' })
  if (!process.env.OPENAI_API_KEY) return res.status(503).json({ error: 'AI provider is not configured.' })
  try {
    const ai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
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
})

app.use(express.static(path.join(root, 'dist')))
app.get('*', (_req, res) => res.sendFile(path.join(root, 'dist', 'index.html')))
app.listen(port, () => console.log(`Daymark API listening on :${port}`))
