import { describe, expect, it } from 'vitest'
import { getCompletionRate, searchTasks, sortTasksByPriority } from './task'

const tasks = [
  { id: '1', title: 'Write report', priority: 'medium' as const, tags: ['work'] },
  { id: '2', title: 'Fix urgent bug', priority: 'urgent' as const, tags: ['engineering'] },
  { id: '3', title: 'Plan weekly review', priority: 'low' as const, tags: ['planning'] },
]

describe('task utilities', () => {
  it('sorts tasks from urgent to low priority without mutating input', () => {
    const sorted = sortTasksByPriority(tasks)
    expect(sorted.map(task => task.id)).toEqual(['2', '1', '3'])
    expect(tasks[0].id).toBe('1')
  })

  it('searches titles and tags case-insensitively', () => {
    expect(searchTasks(tasks, 'URGENT').map(task => task.id)).toEqual(['2'])
    expect(searchTasks(tasks, 'planning').map(task => task.id)).toEqual(['3'])
  })

  it('returns all tasks for an empty query', () => {
    expect(searchTasks(tasks, '  ')).toHaveLength(3)
  })

  it('calculates a safe completion percentage', () => {
    expect(getCompletionRate(4, 3)).toBe(75)
    expect(getCompletionRate(0, 0)).toBe(0)
    expect(getCompletionRate(4, 8)).toBe(100)
  })
})
