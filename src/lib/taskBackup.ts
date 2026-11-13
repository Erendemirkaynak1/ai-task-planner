export type BackupPriority = 'Urgent' | 'High' | 'Medium' | 'Low'

export type BackupTask = {
  id: string
  title: string
  project: string
  priority: BackupPriority
  due: string
  done: boolean
  estimate: string
}

const priorities: BackupPriority[] = ['Urgent', 'High', 'Medium', 'Low']
const MAX_TASKS = 5000

export function createTaskBackup<T extends BackupTask>(tasks: T[], exportedAt = new Date().toISOString()) {
  return JSON.stringify({ format: 'daymark-task-backup', version: 1, exportedAt, tasks }, null, 2)
}

export function parseTaskBackup(value: unknown): BackupTask[] {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('The selected file is not a valid Daymark backup.')
  }
  const backup = value as Record<string, unknown>
  if (backup.format !== 'daymark-task-backup' || backup.version !== 1 || !Array.isArray(backup.tasks)) {
    throw new Error('Unsupported backup format or version.')
  }
  if (backup.tasks.length > MAX_TASKS) throw new Error('A backup can contain at most 5000 tasks.')

  const ids = new Set<string>()
  return backup.tasks.map((item, index) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) throw new Error('Task ' + (index + 1) + ' is invalid.')
    const task = item as Record<string, unknown>
    const valid = typeof task.id === 'string' && task.id.length > 0 &&
      typeof task.title === 'string' && task.title.trim().length > 0 && task.title.length <= 240 &&
      typeof task.project === 'string' && task.project.length <= 80 &&
      typeof task.priority === 'string' && priorities.includes(task.priority as BackupPriority) &&
      typeof task.due === 'string' && task.due.length <= 40 &&
      typeof task.done === 'boolean' &&
      typeof task.estimate === 'string' && task.estimate.length <= 40
    if (!valid) throw new Error('Task ' + (index + 1) + ' contains invalid fields.')
    if (ids.has(task.id as string)) throw new Error('The backup contains duplicate task IDs.')
    ids.add(task.id as string)
    return {
      id: task.id as string,
      title: (task.title as string).trim(),
      project: task.project as string,
      priority: task.priority as BackupPriority,
      due: task.due as string,
      done: task.done as boolean,
      estimate: task.estimate as string,
    }
  })
}
