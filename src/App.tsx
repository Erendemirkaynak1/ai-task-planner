import { useMemo, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { CalendarView, KanbanBoard } from './components/PlannerViews'
import { createTaskBackup, parseTaskBackup } from './lib/taskBackup'
import { Activity, ArrowUpRight, Bell, Download, Upload, CalendarDays, Check, CheckCircle2, ChevronDown, Circle, Clock3, Command, Filter, LayoutDashboard, ListTodo, MoreHorizontal, Pencil, Plus, Search, Sparkles, Target, Trash2, TrendingUp, X } from 'lucide-react'

type Priority = 'Urgent' | 'High' | 'Medium' | 'Low'
type Task = { id: string; title: string; project: string; priority: Priority; due: string; done: boolean; estimate: string }
const seed: Task[] = [
  { id: '1', title: 'Finalize product roadmap', project: 'Product', priority: 'Urgent', due: 'Today', done: false, estimate: '45 min' },
  { id: '2', title: 'Review pull requests', project: 'Development', priority: 'High', due: 'Today', done: false, estimate: '30 min' },
  { id: '3', title: 'Prepare weekly team update', project: 'Operations', priority: 'Medium', due: 'Today', done: true, estimate: '25 min' },
  { id: '4', title: 'Explore AI workflow ideas', project: 'Research', priority: 'Low', due: 'Tomorrow', done: false, estimate: '1 hour' },
]
const priorityOrder: Priority[] = ['Urgent', 'High', 'Medium', 'Low']
const todayLabel = new Intl.DateTimeFormat('en', { weekday: 'long', month: 'long', day: 'numeric' }).format(new Date())

export default function App() {
  const [tasks, setTasks] = useState<Task[]>(() => {
    try { const saved = localStorage.getItem('daymark.tasks'); return saved ? JSON.parse(saved) as Task[] : seed } catch { return seed }
  })
  const [active, setActive] = useState('Today')
  const [query, setQuery] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newPriority, setNewPriority] = useState<Priority>('Medium')
  const [newDue, setNewDue] = useState('Today')
  const [newProject, setNewProject] = useState('Personal')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [aiPrompt, setAiPrompt] = useState('')
  const [showAiPlan, setShowAiPlan] = useState(false)
  const [dark, setDark] = useState(false)
  const importRef = useRef<HTMLInputElement>(null)
  const [backupMessage, setBackupMessage] = useState('')

  const persist = (next: Task[]) => { setTasks(next); localStorage.setItem('daymark.tasks', JSON.stringify(next)) }
  const visible = useMemo(() => tasks.filter(t => {
    const matches = (t.title + ' ' + t.project).toLowerCase().includes(query.toLowerCase())
    return matches && (active === 'Today' ? t.due === 'Today' : active === 'Upcoming' ? t.due !== 'Today' : active === 'Completed' ? t.done : true)
  }).sort((a,b) => priorityOrder.indexOf(a.priority) - priorityOrder.indexOf(b.priority)), [tasks, query, active])
  const completed = tasks.filter(t => t.done).length
  const progress = tasks.length ? Math.round(completed / tasks.length * 100) : 0
  const toggle = (id: string) => persist(tasks.map(t => t.id === id ? { ...t, done: !t.done } : t))
  const openCreate = () => {
    setEditingId(null); setNewTitle(''); setNewPriority('Medium'); setNewDue('Today'); setNewProject('Personal'); setShowAdd(true)
  }
  const openEdit = (task: Task) => {
    setEditingId(task.id); setNewTitle(task.title); setNewPriority(task.priority); setNewDue(task.due); setNewProject(task.project); setShowAdd(true)
  }
  const addTask = () => {
    if (!newTitle.trim()) return
    if (editingId) {
      persist(tasks.map(task => task.id === editingId ? { ...task, title: newTitle.trim(), priority: newPriority, due: newDue, project: newProject.trim() || 'Personal' } : task))
    } else {
      persist([{ id: crypto.randomUUID(), title: newTitle.trim(), project: newProject.trim() || 'Personal', priority: newPriority, due: newDue, done: false, estimate: '30 min' }, ...tasks])
    }
    setNewTitle(''); setEditingId(null); setShowAdd(false)
  }
  const remove = (id: string) => persist(tasks.filter(t => t.id !== id))
  const exportBackup = () => {
    const blob = new Blob([createTaskBackup(tasks)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'daymark-backup-' + new Date().toISOString().slice(0, 10) + '.json'
    link.click()
    URL.revokeObjectURL(url)
    setBackupMessage('Backup exported successfully.')
  }
  const importBackup = async (file?: File) => {
    if (!file) return
    try {
      if (file.size > 2 * 1024 * 1024) throw new Error('Backup file must be smaller than 2 MB.')
      const imported = parseTaskBackup(JSON.parse(await file.text()))
      if (!window.confirm('Import ' + imported.length + ' tasks and replace your current local task list?')) return
      persist(imported)
      setActive('All tasks')
      setQuery('')
      setBackupMessage('Imported ' + imported.length + ' tasks. Your previous local list was replaced.')
    } catch (error) {
      setBackupMessage(error instanceof Error ? error.message : 'Could not read this backup.')
    } finally {
      if (importRef.current) importRef.current.value = ''
    }
  }

  return <div className={dark ? 'app dark' : 'app'}>
    <aside className="sidebar">
      <div className="brand"><div className="brand-mark"><Target size={19} /></div><span>daymark</span><span className="brand-beta">BETA</span></div>
      <div className="workspace"><div className="avatar">E</div><div><strong>My workspace</strong><small>Personal plan</small></div><ChevronDown size={15} /></div>
      <div className="nav-label">WORKSPACE</div>
      <nav>
        {[{ name: 'Today', icon: LayoutDashboard }, { name: 'Upcoming', icon: CalendarDays }, { name: 'All tasks', icon: ListTodo }, { name: 'Completed', icon: CheckCircle2 }, { name: 'Calendar', icon: CalendarDays }, { name: 'Board', icon: ListTodo }].map(({ name, icon: Icon }) => <button key={name} className={active === name ? 'nav-item active' : 'nav-item'} onClick={() => setActive(name)}><Icon size={17}/><span>{name}</span>{name === 'Today' && <i>{tasks.filter(t => t.due === 'Today' && !t.done).length}</i>}</button>)}
      </nav>
      <div className="nav-label projects-label">YOUR SPACE</div>
      <button className="nav-item" onClick={() => setActive('All tasks')}><span className="project-dot violet"/>Projects <MoreHorizontal size={16} className="nav-more"/></button>
      <button className="nav-item" onClick={() => setActive('All tasks')}><span className="project-dot green"/>Personal <MoreHorizontal size={16} className="nav-more"/></button>
      <div className="sidebar-bottom">
        <div className="upgrade-card"><div className="upgrade-icon"><Sparkles size={16}/></div><strong>Make every day count</strong><p>Let AI turn your goals into a clear plan.</p><button onClick={() => document.getElementById('ai-input')?.focus()}>Try AI planner <ArrowUpRight size={14}/></button></div>
        <button className="nav-item settings-item" onClick={() => setDark(!dark)}><span>{dark ? '☀️' : '🌙'}</span>{dark ? 'Light appearance' : 'Dark appearance'}</button>
        <div className="profile"><div className="avatar profile-avatar">E</div><div><strong>Erendemir</strong><small>Free plan</small></div><MoreHorizontal size={18}/></div>
      </div>
    </aside>

    <main className="main">
      <header className="topbar"><div className="breadcrumb">Workspace <span>/</span> <strong>{active}</strong></div><div className="top-actions"><div className="searchbox"><Search size={16}/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search tasks..." /><kbd>⌘ K</kbd></div><button className="icon-button" aria-label="Notifications"><Bell size={18}/><b/></button><div className="top-avatar">E</div></div></header>
      <div className="content">
        <section className="welcome"><div><div className="eyebrow">{todayLabel.toUpperCase()}</div><h1>Make today <span>meaningful.</span></h1><p>A little progress each day adds up to big results.</p></div><button className="primary-button" onClick={openCreate}><Plus size={17}/> New task</button></section>
        <section className="stats-grid">
          <div className="stat-card"><div className="stat-top"><span>Tasks completed</span><span className="stat-icon mint"><CheckCircle2 size={17}/></span></div><div className="stat-value">{completed}<small> / {tasks.length}</small></div><div className="stat-foot"><span className="positive"><TrendingUp size={13}/> {progress}%</span> of all tasks</div><div className="progress-track"><div style={{width: progress + '%'}}/></div></div>
          <div className="stat-card"><div className="stat-top"><span>Due today</span><span className="stat-icon blue"><Clock3 size={17}/></span></div><div className="stat-value">{tasks.filter(t => t.due === 'Today' && !t.done).length}<small> tasks</small></div><div className="stat-foot">Keep your momentum going</div><div className="mini-bars"><i/><i/><i/><i/><i/><i/><i/></div></div>
          <div className="stat-card"><div className="stat-top"><span>High priority</span><span className="stat-icon orange"><Activity size={17}/></span></div><div className="stat-value">{tasks.filter(t => ['Urgent','High'].includes(t.priority) && !t.done).length}<small> tasks</small></div><div className="stat-foot">Focus on what matters most</div><div className="priority-dots"><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/></div></div>
        </section>
        {active === 'Calendar' ? <CalendarView tasks={tasks}/> : active === 'Board' ? <KanbanBoard tasks={tasks} onToggle={toggle}/> : <section className="planner-grid">
          <div className="panel tasks-panel"><div className="panel-heading"><div><div className="panel-title">Your tasks <span className="count-pill">{visible.length}</span></div><p>Stay focused on your next step.</p></div><div className="task-tools"><button className="subtle-button" onClick={exportBackup} title="Export all tasks"><Download size={14}/> Export</button><button className="subtle-button" onClick={() => importRef.current?.click()} title="Import a Daymark backup"><Upload size={14}/> Import</button><button className="subtle-button" onClick={() => setActive('All tasks')}><Filter size={15}/> View all</button><input ref={importRef} type="file" accept="application/json,.json" hidden onChange={event => void importBackup(event.target.files?.[0])}/></div></div>{backupMessage && <div className="backup-message" role="status">{backupMessage}<button onClick={() => setBackupMessage('')} aria-label="Dismiss message"><X size={13}/></button></div>}
            <div className="task-tabs">{['Today','Upcoming','All tasks','Completed'].map(tab => <button key={tab} onClick={() => setActive(tab)} className={active === tab ? 'selected' : ''}>{tab}</button>)}</div>
            <div className="task-list">{visible.length ? visible.map(task => <div className={task.done ? 'task-row is-done' : 'task-row'} key={task.id}><button className={task.done ? 'check checked' : 'check'} onClick={() => toggle(task.id)} aria-label={task.done ? 'Mark incomplete' : 'Complete task'}>{task.done && <Check size={13}/>}</button><div className="task-info"><strong>{task.title}</strong><div className="task-meta"><span className="project-name">{task.project}</span><span>·</span><span><Clock3 size={12}/> {task.estimate}</span><span>·</span><span>{task.due}</span></div></div><span className={'priority priority-' + task.priority.toLowerCase()}><i/>{task.priority}</span><button className="delete-task" onClick={() => openEdit(task)} aria-label="Edit task"><Pencil size={14}/></button><button className="delete-task" onClick={() => remove(task.id)} aria-label="Delete task"><Trash2 size={15}/></button></div>) : <div className="empty-state"><Circle size={24}/><strong>Nothing on your list</strong><span>Add a task or try a different view.</span></div>}</div>
            <button className="add-inline" onClick={openCreate}><Plus size={15}/> Add a task</button>
          </div>
          <div className="right-column">
            <div className="panel focus-panel"><div className="panel-heading"><div><div className="panel-title"><span className="sparkle-title"><Sparkles size={17}/></span> AI planning assistant</div><p>Turn a goal into your next steps.</p></div><span className="online-dot"/></div><div className="ai-prompt"><textarea id="ai-input" value={aiPrompt} onChange={e => setAiPrompt(e.target.value)} placeholder="e.g. Launch my portfolio website in 2 weeks..." rows={3}/><div className="ai-prompt-footer"><span><Command size={12}/> Be as specific as you like</span><button disabled={!aiPrompt.trim()} onClick={() => setShowAiPlan(true)}><Sparkles size={14}/> Build a plan</button></div></div>{showAiPlan && <div className="ai-notice"><Sparkles size={15}/><span>Your goal is ready for AI planning. Connect an AI provider to generate and review a suggested task breakdown.</span><button onClick={() => setShowAiPlan(false)} aria-label="Dismiss"><X size={14}/></button></div>}<div className="ai-tip"><div className="tip-icon"><Target size={15}/></div><div><strong>Small steps, big momentum</strong><p>Break ambitious goals into focused 25–45 minute sessions.</p></div></div></div>
            <div className="panel week-panel"><div className="panel-heading"><div><div className="panel-title">This week</div><p>Your progress at a glance.</p></div><button className="more-button"><MoreHorizontal size={18}/></button></div><div className="week-progress"><div className="week-ring" style={{'--progress': progress + '%'} as CSSProperties}><div><strong>{progress}%</strong><small>done</small></div></div><div className="week-legend"><div><i className="legend-done"/>Completed <strong>{completed}</strong></div><div><i className="legend-open"/>Remaining <strong>{tasks.length - completed}</strong></div></div></div><div className="week-foot"><span><ArrowUpRight size={14}/> Keep it up!</span><span>{tasks.length} total tasks</span></div></div>
          </div>
        </section>}
      </div>
    </main>
    {showAdd && <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) setShowAdd(false) }}><div className="modal"><div className="modal-head"><div><h2>{editingId ? 'Edit task' : 'Create a task'}</h2><p>Make your next step clear and actionable.</p></div><button onClick={() => setShowAdd(false)} aria-label="Close"><X size={18}/></button></div><label>Task name<input autoFocus value={newTitle} onChange={e => setNewTitle(e.target.value)} onKeyDown={e => e.key === 'Enter' && addTask()} placeholder="What needs to get done?"/></label><label>Project or category<input value={newProject} onChange={e => setNewProject(e.target.value)} placeholder="Personal, Work, Learning..."/></label><div className="modal-row"><label>Priority<select value={newPriority} onChange={e => setNewPriority(e.target.value as Priority)}>{priorityOrder.map(p => <option key={p}>{p}</option>)}</select></label><label>Due date<select value={newDue} onChange={e => setNewDue(e.target.value)}><option>Today</option><option>Tomorrow</option><option>Next week</option><option>No date</option></select></label></div><div className="modal-actions"><button className="cancel-button" onClick={() => setShowAdd(false)}>Cancel</button><button className="primary-button" onClick={addTask} disabled={!newTitle.trim()}>{editingId ? 'Save changes' : <><Plus size={16}/> Create task</>}</button></div></div></div>}
  </div>
}