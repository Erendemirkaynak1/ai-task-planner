export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent'
export type TaskStatus = 'todo' | 'in_progress' | 'done' | 'cancelled'
export type TaskRecord = {
  id: string
  title: string
  priority: TaskPriority
  status: TaskStatus
  due_at?: string | null
  tags?: string[]
}

const priorityRank: Record<TaskPriority, number> = { urgent: 0, high: 1, medium: 2, low: 3 }

export function sortTasksByPriority<T extends Pick<TaskRecord, 'priority'>>(tasks: T[]): T[] {
  return [...tasks].sort((a, b) => priorityRank[a.priority] - priorityRank[b.priority])
}

export function searchTasks<T extends Pick<TaskRecord, 'title' | 'tags'>>(tasks: T[], query: string): T[] {
  const normalized = query.trim().toLocaleLowerCase()
  if (!normalized) return [...tasks]
  return tasks.filter(task =>
    task.title.toLocaleLowerCase().includes(normalized) ||
    (task.tags ?? []).some(tag => tag.toLocaleLowerCase().includes(normalized)),
  )
}

export function getCompletionRate(total: number, completed: number): number {
  if (!Number.isFinite(total) || !Number.isFinite(completed) || total <= 0) return 0
  return Math.round(Math.min(Math.max(completed, 0), total) / total * 100)
}
