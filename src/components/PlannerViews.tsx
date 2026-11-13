import { addDays, endOfMonth, endOfWeek, format, isSameDay, isSameMonth, startOfMonth, startOfWeek } from 'date-fns'
import { CheckCircle2, ChevronLeft, ChevronRight, Circle, Clock3 } from 'lucide-react'
import { useMemo, useState } from 'react'

export type PlannerTask = {
  id: string
  title: string
  project: string
  priority: 'Urgent' | 'High' | 'Medium' | 'Low'
  due: string
  done: boolean
  estimate: string
}

const priorityClass = (priority: PlannerTask['priority']) => `priority priority-${priority.toLowerCase()}`

export function KanbanBoard({ tasks, onToggle }: { tasks: PlannerTask[]; onToggle: (id: string) => void }) {
  const columns = [
    { title: 'To do', items: tasks.filter(task => !task.done) },
    { title: 'Completed', items: tasks.filter(task => task.done) },
  ]
  return <div className="kanban-grid">
    {columns.map(column => <section className="kanban-column" key={column.title}>
      <header><strong>{column.title}</strong><span>{column.items.length}</span></header>
      {column.items.length ? column.items.map(task => <article className="kanban-card" key={task.id}>
        <div className="kanban-card-top"><span className={priorityClass(task.priority)}><i/>{task.priority}</span><button onClick={() => onToggle(task.id)} aria-label={task.done ? 'Move to to do' : 'Complete task'}>{task.done ? <CheckCircle2 size={17} className="board-done-icon"/> : <Circle size={16}/>}</button></div>
        <strong>{task.title}</strong><div className="kanban-card-meta"><span>{task.project}</span><span><Clock3 size={12}/>{task.estimate}</span></div>
      </article>) : <div className="kanban-empty">No tasks here yet</div>}
    </section>)}
  </div>
}

export function CalendarView({ tasks }: { tasks: PlannerTask[] }) {
  const [month, setMonth] = useState(() => startOfMonth(new Date()))
  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(month), { weekStartsOn: 1 })
    const end = endOfWeek(endOfMonth(month), { weekStartsOn: 1 })
    const result: Date[] = []
    for (let day = start; day <= end; day = addDays(day, 1)) result.push(day)
    return result
  }, [month])
  const today = new Date()
  return <section className="calendar-panel">
    <div className="calendar-toolbar"><div><strong>{format(month, 'MMMM yyyy')}</strong><span>Plan your time, one day at a time.</span></div><div className="calendar-controls"><button onClick={() => setMonth(value => addDays(startOfMonth(value), -1))} aria-label="Previous month"><ChevronLeft size={17}/></button><button onClick={() => setMonth(startOfMonth(today))}>Today</button><button onClick={() => setMonth(value => addDays(endOfMonth(value), 1))} aria-label="Next month"><ChevronRight size={17}/></button></div></div>
    <div className="calendar-grid">{['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(day => <div className="calendar-weekday" key={day}>{day}</div>)}
      {days.map(day => {
        const dayTasks = tasks.filter(task => task.due === 'Today' ? isSameDay(day, today) : task.due === 'Tomorrow' ? isSameDay(day, addDays(today, 1)) : task.due === 'Next week' ? isSameDay(day, addDays(today, 7)) : false)
        return <div className={`calendar-day ${isSameMonth(day, month) ? '' : 'outside'} ${isSameDay(day, today) ? 'is-today' : ''}`} key={day.toISOString()}>
          <span className="calendar-date">{format(day, 'd')}</span>
          {dayTasks.slice(0, 2).map(task => <div className={`calendar-event ${task.done ? 'event-done' : ''}`} key={task.id} title={task.title}>{task.title}</div>)}
          {dayTasks.length > 2 && <small>+{dayTasks.length - 2} more</small>}
        </div>
      })}
    </div>
  </section>
}
