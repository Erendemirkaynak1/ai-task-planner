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

import { createTaskBackup, parseStoredTasks, parseTaskBackup } from './taskBackup'

describe('task backup', () => {
  const sample = [{ id: 'a1', title: 'Write docs', project: 'Work', priority: 'High' as const, due: 'Today', done: false, estimate: '30 min' }]

  it('round-trips task data through a versioned backup', () => {
    const backup = createTaskBackup(sample, '2026-11-13T12:00:00.000Z')
    expect(parseTaskBackup(JSON.parse(backup))).toEqual(sample)
  })

  it('rejects unsupported formats and malformed task data', () => {
    expect(() => parseTaskBackup({ format: 'other', version: 1, tasks: [] })).toThrow('Unsupported backup')
    expect(() => parseTaskBackup({ format: 'daymark-task-backup', version: 1, tasks: [{ id: 'x' }] })).toThrow('invalid fields')
  })

  it('rejects duplicate IDs and excessive task counts', () => {
    expect(() => parseTaskBackup({ format: 'daymark-task-backup', version: 1, tasks: [...sample, ...sample] })).toThrow('duplicate')
    expect(() => parseTaskBackup({ format: 'daymark-task-backup', version: 1, tasks: Array(5001).fill(sample[0]) })).toThrow('at most')
  })
})

describe('stored task validation', () => {
  it('accepts an empty list and valid task data', () => {
    expect(parseStoredTasks([])).toEqual([])
    expect(parseStoredTasks([{ id: 'x', title: 'Task', project: 'Work', priority: 'Low', due: 'No date', done: false, estimate: '15 min' }])).toHaveLength(1)
  })

  it('rejects malformed local storage and duplicate IDs', () => {
    expect(() => parseStoredTasks({})).toThrow('array')
    const duplicate = { id: 'same', title: 'Task', project: 'Work', priority: 'Low', due: 'Today', done: false, estimate: '15 min' }
    expect(() => parseStoredTasks([duplicate, duplicate])).toThrow('duplicate')
  })

  it('rejects oversized task lists and invalid identifiers', () => {
    expect(() => parseStoredTasks(Array(5001).fill({}))).toThrow('5000')
    expect(() => parseStoredTasks([{ id: 'x'.repeat(101), title: 'Task', project: 'Work', priority: 'Low', due: 'Today', done: false, estimate: '15 min' }])).toThrow('invalid fields')
  })
})
