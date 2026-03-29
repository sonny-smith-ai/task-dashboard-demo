'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/database'

type Task = Database['public']['Tables']['tasks']['Row']
type Agent = Database['public']['Tables']['agents']['Row']
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

export default function BotDashboard() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [agents, setAgents] = useState<Agent[]>([])
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([])
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
      .limit(25)
    if (data) setAuditLogs(data)
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

  const onlineAgents = agents.filter(a => a.status === 'online' || a.status === 'busy')
  const activeTasksCount = tasks.filter(t => t.status === 'in_progress').length

  return (
    <div className="min-h-screen px-4 sm:px-6 lg:px-8 py-8 md:py-12">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <header className="mb-10">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-4 mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-xs font-mono text-[var(--color-text-muted)] uppercase tracking-widest">
                    Real-time Bot Monitoring
                  </span>
                </div>
                <Link 
                  href="/api-keys"
                  className="text-xs font-mono text-[var(--color-accent)] hover:text-[var(--color-accent-hover)] uppercase tracking-wider transition-colors"
                >
                  🔑 Manage API Keys
                </Link>
              </div>
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-[var(--color-text-primary)]">
                Agent Dashboard
              </h1>
              <p className="mt-2 text-[var(--color-text-secondary)] text-base">
                Monitor bot activity and task progress across your workspace.
              </p>
            </div>

            {/* Agent Status Overview */}
            <div className="hidden lg:flex items-center gap-4">
              <div className="text-right">
                <div className="text-2xl font-bold text-[var(--color-text-primary)]">{onlineAgents.length}</div>
                <div className="text-xs text-[var(--color-text-muted)] uppercase">Agents Online</div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-[var(--color-accent)]">{activeTasksCount}</div>
                <div className="text-xs text-[var(--color-text-muted)] uppercase">Active Tasks</div>
              </div>
            </div>
          </div>
        </header>

        {/* Agent Status Pills */}
        <div className="mb-8">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-sm font-medium text-[var(--color-text-secondary)] uppercase tracking-wider">
              Agent Status
            </h2>
            <div className="flex flex-wrap items-center gap-2">
              {agents.map((agent) => {
                const isRecent = new Date(agent.last_heartbeat) > new Date(Date.now() - 5 * 60 * 1000)
                return (
                  <div key={agent.id} className={`flex items-center gap-2 px-3 py-2 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg transition-all duration-200 ${isRecent ? '' : 'opacity-60'}`}>
                    <span className="text-lg">{agent.emoji}</span>
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${AGENT_STATUS_CONFIG[agent.status].color}`} />
                      <span className="text-sm font-medium text-[var(--color-text-primary)]">{agent.name}</span>
                      <span className={`text-xs ${AGENT_STATUS_CONFIG[agent.status].textColor}`}>
                        {agent.status}
                      </span>
                    </div>
                    {agent.total_tasks_completed > 0 && (
                      <div className="text-xs text-[var(--color-text-muted)] ml-2">
                        {agent.total_tasks_completed} tasks
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>

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

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left Column: Tasks */}
          <div className="lg:col-span-3 space-y-6">
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

            {/* Bot Tasks List */}
            <div className="space-y-3">
              {filteredTasks.length === 0 ? (
                <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-12 text-center">
                  <div className="text-4xl mb-3 opacity-40">🤖</div>
                  <h3 className="text-lg font-medium text-[var(--color-text-primary)] mb-2">
                    Waiting for Bot Activity
                  </h3>
                  <p className="text-[var(--color-text-muted)] text-sm mb-4">
                    {filter === 'all' 
                      ? 'No tasks yet. Bots will create tasks automatically when they start working.' 
                      : `No ${filter.replace('_', ' ')} tasks from bots.`
                    }
                  </p>
                  <div className="flex items-center justify-center gap-2 text-xs text-[var(--color-text-muted)]">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span>Monitoring {agents.length} agents for new activity</span>
                  </div>
                </div>
              ) : (
                filteredTasks.map((task) => {
                  const agent = getAgentById(task.agent_id)
                  return (
                    <div key={task.id} className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl transition-all duration-200 hover:border-[var(--color-accent)]/40 hover:shadow-lg hover:shadow-[var(--color-accent)]/5 p-5">
                      <div className="flex items-start justify-between gap-4 mb-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-2">
                            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${PRIORITY_CONFIG[task.priority].dot}`} />
                            <h3 className="font-semibold text-[var(--color-text-primary)] text-lg">
                              {task.title}
                            </h3>
                            {agent && (
                              <div className="flex items-center gap-2 px-3 py-1 bg-[var(--color-bg)] rounded-full text-sm">
                                <span>{agent.emoji}</span>
                                <span className="text-[var(--color-text-secondary)]">{agent.name}</span>
                              </div>
                            )}
                          </div>
                          
                          {task.description && (
                            <p className="text-sm text-[var(--color-text-muted)] mb-3">
                              {task.description}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-3">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${STATUS_CONFIG[task.status].color}`}>
                            {STATUS_CONFIG[task.status].label}
                          </span>
                        </div>
                      </div>

                      {/* Progress Bar for Agent Tasks */}
                      {task.task_type === 'agent' && task.progress_percentage > 0 && (
                        <div className="mb-4">
                          <div className="flex items-center justify-between text-sm text-[var(--color-text-secondary)] mb-2">
                            <span className="font-medium">{task.current_step || 'Processing...'}</span>
                            <span className="font-mono">{task.progress_percentage}%</span>
                          </div>
                          <div className="w-full bg-[var(--color-bg)] rounded-full h-2">
                            <div 
                              className="bg-[var(--color-accent)] h-2 rounded-full transition-all duration-300"
                              style={{ width: `${task.progress_percentage}%` }}
                            />
                          </div>
                        </div>
                      )}
                      
                      <div className="flex items-center justify-between pt-3 border-t border-[var(--color-border)]">
                        <div className="flex items-center gap-4 text-xs text-[var(--color-text-muted)]">
                          <span>Started {timeAgo(task.created_at)}</span>
                          {task.session_id && (
                            <span className="font-mono">Session: {task.session_id}</span>
                          )}
                        </div>
                        {task.estimated_completion && (
                          <div className="text-xs text-[var(--color-text-muted)]">
                            ETA: {new Date(task.estimated_completion).toLocaleTimeString()}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>

          {/* Right Column: Activity Log */}
          <div className="lg:col-span-1">
            <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-6 sticky top-8">
              <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-5 flex items-center gap-2">
                Live Activity
                <span className="text-xs font-mono text-[var(--color-text-muted)] font-normal">
                  {auditLogs.length}
                </span>
              </h2>
              <div className="space-y-1 max-h-[calc(100vh-300px)] overflow-y-auto">
                {auditLogs.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="text-2xl mb-2 opacity-40">📊</div>
                    <p className="text-sm text-[var(--color-text-muted)]">
                      No bot activity yet
                    </p>
                  </div>
                ) : (
                  auditLogs.map((log) => {
                    const agent = getAgentById(log.agent_id)
                    return (
                      <div
                        key={log.id}
                        className="flex items-start gap-3 py-3 px-3 rounded-lg hover:bg-[var(--color-surface-hover)] transition-colors"
                      >
                        <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                          log.action === 'created' ? 'bg-emerald-400' :
                          log.action === 'status_changed' ? 'bg-blue-400' :
                          log.action === 'deleted' ? 'bg-red-400' : 'bg-amber-400'
                        }`} />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            {agent && <span className="text-sm">{agent.emoji}</span>}
                            <p className="text-sm text-[var(--color-text-secondary)]">
                              <span className="font-medium text-[var(--color-text-primary)]">
                                {agent?.name || 'Unknown Bot'}
                              </span>
                              {' '}{log.action.replace('_', ' ')} a task
                            </p>
                          </div>
                          <p className="text-xs text-[var(--color-text-muted)] font-mono">
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
            Bot Dashboard &middot; Real-time Agent Monitoring
          </p>
        </footer>
      </div>
    </div>
  )
}