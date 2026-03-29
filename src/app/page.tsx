'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/database'

type Task = Database['public']['Tables']['tasks']['Row']
type Agent = Database['public']['Tables']['agents']['Row']
type TaskStep = Database['public']['Tables']['task_steps']['Row']
type AuditLog = Database['public']['Tables']['audit_logs']['Row']

const STATUS_CONFIG = {
  pending: { label: 'Pending', color: 'bg-amber-500/15 text-amber-400 border-amber-500/30' },
  in_progress: { label: 'In Progress', color: 'bg-blue-500/15 text-blue-400 border-blue-500/30' },
  completed: { label: 'Completed', color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' },
  cancelled: { label: 'Cancelled', color: 'bg-red-500/15 text-red-400 border-red-500/30' },
} as const

const PRIORITY_CONFIG = {
  low: { label: 'Low', dot: 'bg-emerald-400' },
  medium: { label: 'Medium', dot: 'bg-blue-400' },
  high: { label: 'High', dot: 'bg-amber-400' },
  urgent: { label: 'Urgent', dot: 'bg-red-400 animate-pulse' },
} as const

const AGENT_STATUS_CONFIG = {
  online: { label: 'Online', color: 'bg-emerald-500', textColor: 'text-emerald-400' },
  busy: { label: 'Busy', color: 'bg-blue-500 animate-pulse', textColor: 'text-blue-400' },
  offline: { label: 'Offline', color: 'bg-gray-500', textColor: 'text-gray-400' },
  error: { label: 'Error', color: 'bg-red-500', textColor: 'text-red-400' },
} as const

export default function TaskDashboard() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [agents, setAgents] = useState<Agent[]>([])
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([])
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium')
  const [isLoading, setIsLoading] = useState(false)
  const [filter, setFilter] = useState<string>('all')

  const fetchTasks = async () => {
    const { data } = await supabase
      .from('tasks')
      .select('*')
      .order('created_at', { ascending: false })
    if (data) setTasks(data)
  }

  const fetchAgents = async () => {
    const { data } = await supabase
      .from('agents')
      .select('*')
      .order('name')
    if (data) setAgents(data)
  }

  const fetchAuditLogs = async () => {
    const { data } = await supabase
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20)
    if (data) setAuditLogs(data)
  }

  const createTask = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    setIsLoading(true)

    await supabase.from('tasks').insert({
      title: title.trim(),
      description: description.trim() || null,
      priority,
      status: 'pending',
      task_type: 'manual',
      progress_percentage: 0,
    })

    setTitle('')
    setDescription('')
    setPriority('medium')
    setIsLoading(false)
    fetchTasks()
    fetchAuditLogs()
  }

  const updateStatus = async (id: string, status: string) => {
    await supabase
      .from('tasks')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id)
    fetchTasks()
    fetchAuditLogs()
  }

  const deleteTask = async (id: string) => {
    await supabase.from('tasks').delete().eq('id', id)
    fetchTasks()
    fetchAuditLogs()
  }

  useEffect(() => {
    fetchTasks()
    fetchAgents()
    fetchAuditLogs()

    const tasksSub = supabase
      .channel('tasks-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, fetchTasks)
      .subscribe()

    const agentsSub = supabase
      .channel('agents-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'agents' }, fetchAgents)
      .subscribe()

    const auditSub = supabase
      .channel('audit-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'audit_logs' }, fetchAuditLogs)
      .subscribe()

    return () => {
      supabase.removeChannel(tasksSub)
      supabase.removeChannel(agentsSub)
      supabase.removeChannel(auditSub)
    }
  }, [])

  const filteredTasks = filter === 'all' ? tasks : tasks.filter((t) => t.status === filter)
  const taskCounts = {
    all: tasks.length,
    pending: tasks.filter((t) => t.status === 'pending').length,
    in_progress: tasks.filter((t) => t.status === 'in_progress').length,
    completed: tasks.filter((t) => t.status === 'completed').length,
  }

  const timeAgo = (date: string) => {
    const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000)
    if (seconds < 60) return 'just now'
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
    return `${Math.floor(seconds / 86400)}d ago`
  }

  const getAgentById = (agentId: string | null) => {
    return agents.find(a => a.id === agentId)
  }

  return (
    <div className="min-h-screen px-4 sm:px-6 lg:px-8 py-8 md:py-12">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <header className="mb-10">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs font-mono text-[var(--color-text-muted)] uppercase tracking-widest">
                  Real-time Agent Dashboard
                </span>
              </div>
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-[var(--color-text-primary)]">
                Task Dashboard
              </h1>
              <p className="mt-2 text-[var(--color-text-secondary)] text-base">
                Track tasks and monitor bot activity across your workspace.
              </p>
            </div>

            {/* Agent Status Pills */}
            <div className="hidden lg:flex items-center gap-2">
              {agents.map((agent) => (
                <div key={agent.id} className="flex items-center gap-2 px-3 py-1.5 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg">
                  <span className="text-sm">{agent.emoji}</span>
                  <div className="flex items-center gap-1.5">
                    <div className={`w-2 h-2 rounded-full ${AGENT_STATUS_CONFIG[agent.status].color}`} />
                    <span className="text-xs font-medium text-[var(--color-text-secondary)]">{agent.name}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </header>

        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          {[
            { label: 'Total', value: taskCounts.all, accent: 'border-[var(--color-accent)]/40' },
            { label: 'Pending', value: taskCounts.pending, accent: 'border-amber-500/40' },
            { label: 'In Progress', value: taskCounts.in_progress, accent: 'border-blue-500/40' },
            { label: 'Completed', value: taskCounts.completed, accent: 'border-emerald-500/40' },
          ].map((stat) => (
            <div key={stat.label} className={`bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl border-l-2 ${stat.accent} px-4 py-3`}>
              <div className="text-2xl font-bold font-mono text-[var(--color-text-primary)]">
                {stat.value}
              </div>
              <div className="text-xs text-[var(--color-text-muted)] uppercase tracking-wider mt-0.5">
                {stat.label}
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Create + Tasks */}
          <div className="lg:col-span-2 space-y-6">
            {/* Create Task */}
            <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-6">
              <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-5">
                New Task
              </h2>
              <form onSubmit={createTask} className="space-y-4">
                <div>
                  <label htmlFor="title" className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1.5">
                    Title
                  </label>
                  <input
                    id="title"
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="What needs to be done?"
                    className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg px-4 py-3 text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/50 focus:border-[var(--color-accent)]"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="priority" className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1.5">
                      Priority
                    </label>
                    <select
                      id="priority"
                      value={priority}
                      onChange={(e) => setPriority(e.target.value as any)}
                      className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg px-4 py-3 text-[var(--color-text-primary)] transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/50 focus:border-[var(--color-accent)]"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="desc" className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1.5">
                      Description
                    </label>
                    <input
                      id="desc"
                      type="text"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Optional details..."
                      className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg px-4 py-3 text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/50 focus:border-[var(--color-accent)]"
                    />
                  </div>
                </div>

                <button type="submit" disabled={isLoading} className="w-full bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white font-medium py-3 px-6 rounded-lg transition-all duration-200 shadow-md shadow-[var(--color-accent)]/20 hover:shadow-lg hover:shadow-[var(--color-accent)]/30 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed">
                  {isLoading ? 'Creating...' : 'Create Task'}
                </button>
              </form>
            </div>

            {/* Filter Tabs */}
            <div className="flex gap-1 p-1 bg-[var(--color-surface)] rounded-lg border border-[var(--color-border)] w-fit">
              {(['all', 'pending', 'in_progress', 'completed'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-3.5 py-1.5 rounded-md text-sm font-medium transition-all duration-200 ${
                    filter === f
                      ? 'bg-[var(--color-accent)] text-white shadow-sm'
                      : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]'
                  }`}
                >
                  {f === 'all' ? 'All' : f === 'in_progress' ? 'In Progress' : f.charAt(0).toUpperCase() + f.slice(1)}
                  <span className="ml-1.5 text-xs opacity-70">
                    {taskCounts[f as keyof typeof taskCounts] ?? 0}
                  </span>
                </button>
              ))}
            </div>

            {/* Task List */}
            <div className="space-y-3">
              {filteredTasks.length === 0 ? (
                <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-12 text-center">
                  <div className="text-4xl mb-3 opacity-40">📋</div>
                  <p className="text-[var(--color-text-muted)] text-sm">
                    {filter === 'all' ? 'No tasks yet. Create your first one above.' : `No ${filter.replace('_', ' ')} tasks.`}
                  </p>
                </div>
              ) : (
                filteredTasks.map((task) => {
                  const agent = getAgentById(task.agent_id)
                  return (
                    <div key={task.id} className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl transition-all duration-200 hover:border-[var(--color-accent)]/40 hover:shadow-lg hover:shadow-[var(--color-accent)]/5 p-4 group">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2.5 mb-1.5">
                            <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${PRIORITY_CONFIG[task.priority].dot}`} />
                            <h3 className="font-medium text-[var(--color-text-primary)] truncate">
                              {task.title}
                            </h3>
                            {agent && (
                              <div className="flex items-center gap-1.5 px-2 py-0.5 bg-[var(--color-bg)] rounded text-xs">
                                <span>{agent.emoji}</span>
                                <span className="text-[var(--color-text-muted)]">{agent.name}</span>
                              </div>
                            )}
                          </div>
                          
                          {task.description && (
                            <p className="text-sm text-[var(--color-text-muted)] ml-4 mb-2 line-clamp-2">
                              {task.description}
                            </p>
                          )}

                          {/* Progress Bar for Agent Tasks */}
                          {task.task_type === 'agent' && task.progress_percentage > 0 && (
                            <div className="ml-4 mb-2">
                              <div className="flex items-center justify-between text-xs text-[var(--color-text-muted)] mb-1">
                                <span>{task.current_step || 'Processing...'}</span>
                                <span>{task.progress_percentage}%</span>
                              </div>
                              <div className="w-full bg-[var(--color-bg)] rounded-full h-1.5">
                                <div 
                                  className="bg-[var(--color-accent)] h-1.5 rounded-full transition-all duration-300"
                                  style={{ width: `${task.progress_percentage}%` }}
                                />
                              </div>
                            </div>
                          )}
                          
                          <div className="flex items-center gap-3 ml-4">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${STATUS_CONFIG[task.status].color}`}>
                              {STATUS_CONFIG[task.status].label}
                            </span>
                            <span className="text-xs text-[var(--color-text-muted)]">
                              {timeAgo(task.created_at)}
                            </span>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {task.status !== 'in_progress' && (
                            <button
                              onClick={() => updateStatus(task.id, 'in_progress')}
                              className="p-1.5 rounded-md hover:bg-blue-500/10 text-[var(--color-text-muted)] hover:text-blue-400 transition-colors"
                              title="Start"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                              </svg>
                            </button>
                          )}
                          {task.status !== 'completed' && (
                            <button
                              onClick={() => updateStatus(task.id, 'completed')}
                              className="p-1.5 rounded-md hover:bg-emerald-500/10 text-[var(--color-text-muted)] hover:text-emerald-400 transition-colors"
                              title="Complete"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                            </button>
                          )}
                          <button
                            onClick={() => deleteTask(task.id)}
                            className="p-1.5 rounded-md hover:bg-red-500/10 text-[var(--color-text-muted)] hover:text-red-400 transition-colors"
                            title="Delete"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>

          {/* Right Column: Agents + Activity */}
          <div className="lg:col-span-1 space-y-6">
            {/* Agent Status */}
            <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-5">
              <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4">
                Agents
              </h2>
              <div className="space-y-3">
                {agents.map((agent) => {
                  const isRecent = new Date(agent.last_heartbeat) > new Date(Date.now() - 5 * 60 * 1000)
                  return (
                    <div key={agent.id} className="flex items-center justify-between p-3 bg-[var(--color-bg)] rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="text-lg">{agent.emoji}</div>
                        <div>
                          <div className="font-medium text-[var(--color-text-primary)] text-sm">
                            {agent.name}
                          </div>
                          <div className="text-xs text-[var(--color-text-muted)]">
                            {agent.total_tasks_completed} tasks completed
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${AGENT_STATUS_CONFIG[agent.status].color} ${!isRecent ? 'opacity-50' : ''}`} />
                        <span className={`text-xs font-medium ${AGENT_STATUS_CONFIG[agent.status].textColor} ${!isRecent ? 'opacity-50' : ''}`}>
                          {agent.status}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Activity Log */}
            <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-5 sticky top-8">
              <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4 flex items-center gap-2">
                Activity
                <span className="text-xs font-mono text-[var(--color-text-muted)] font-normal">
                  {auditLogs.length}
                </span>
              </h2>
              <div className="space-y-1 max-h-[calc(100vh-400px)] overflow-y-auto">
                {auditLogs.length === 0 ? (
                  <p className="text-sm text-[var(--color-text-muted)] py-4 text-center">
                    No activity yet
                  </p>
                ) : (
                  auditLogs.map((log) => {
                    const agent = getAgentById(log.agent_id)
                    return (
                      <div
                        key={log.id}
                        className="flex items-start gap-3 py-2.5 px-2 rounded-lg hover:bg-[var(--color-surface-hover)] transition-colors"
                      >
                        <div className={`w-1.5 h-1.5 rounded-full mt-2 flex-shrink-0 ${
                          log.action === 'created' ? 'bg-emerald-400' :
                          log.action === 'status_changed' ? 'bg-blue-400' :
                          log.action === 'deleted' ? 'bg-red-400' : 'bg-amber-400'
                        }`} />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            {agent && <span className="text-xs">{agent.emoji}</span>}
                            <p className="text-sm text-[var(--color-text-secondary)]">
                              Task <span className="font-medium text-[var(--color-text-primary)]">{log.action.replace('_', ' ')}</span>
                            </p>
                          </div>
                          <p className="text-xs text-[var(--color-text-muted)] font-mono mt-0.5">
                            {timeAgo(log.created_at)}
                          </p>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="mt-16 pb-8 text-center">
          <p className="text-xs text-[var(--color-text-muted)]">
            Built with Next.js &middot; Supabase &middot; Tailwind CSS
          </p>
        </footer>
      </div>
    </div>
  )
}