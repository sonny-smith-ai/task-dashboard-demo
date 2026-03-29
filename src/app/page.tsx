'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/database'

type Task = Database['public']['Tables']['tasks']['Row']
type AuditLog = Database['public']['Tables']['audit_logs']['Row']

export default function TaskDashboard() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([])
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium')
  const [isLoading, setIsLoading] = useState(false)

  // Fetch tasks
  const fetchTasks = async () => {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (error) {
      console.error('Error fetching tasks:', error)
    } else {
      setTasks(data)
    }
  }

  // Fetch audit logs
  const fetchAuditLogs = async () => {
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10)
    
    if (error) {
      console.error('Error fetching audit logs:', error)
    } else {
      setAuditLogs(data)
    }
  }

  // Create task
  const createTask = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return

    setIsLoading(true)
    const { data, error } = await supabase
      .from('tasks')
      .insert({
        title: title.trim(),
        description: description.trim() || null,
        priority,
        status: 'pending'
      })
      .select()

    if (error) {
      console.error('Error creating task:', error)
    } else {
      setTitle('')
      setDescription('')
      setPriority('medium')
      fetchTasks()
    }
    setIsLoading(false)
  }

  // Update task status
  const updateTaskStatus = async (id: string, newStatus: string) => {
    const { error } = await supabase
      .from('tasks')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', id)

    if (error) {
      console.error('Error updating task:', error)
    } else {
      fetchTasks()
    }
  }

  useEffect(() => {
    fetchTasks()
    fetchAuditLogs()

    // Set up real-time subscriptions
    const tasksSubscription = supabase
      .channel('tasks-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'tasks'
      }, () => {
        fetchTasks()
      })
      .subscribe()

    const auditSubscription = supabase
      .channel('audit-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'audit_logs'
      }, () => {
        fetchAuditLogs()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(tasksSubscription)
      supabase.removeChannel(auditSubscription)
    }
  }, [])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'text-amber-400'
      case 'in_progress': return 'text-cyan-400'
      case 'completed': return 'text-emerald-400'
      case 'cancelled': return 'text-red-400'
      default: return 'text-gray-400'
    }
  }

  const getPriorityGlow = (priority: string) => {
    switch (priority) {
      case 'low': return 'shadow-[0_0_10px_rgba(34,197,94,0.5)]'
      case 'medium': return 'shadow-[0_0_10px_rgba(59,130,246,0.5)]'
      case 'high': return 'shadow-[0_0_10px_rgba(251,146,60,0.5)]'
      case 'urgent': return 'shadow-[0_0_15px_rgba(239,68,68,0.7)]'
      default: return ''
    }
  }

  return (
    <div className="min-h-screen bg-black text-green-400 font-mono relative overflow-hidden">
      {/* Scanline Effect */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-green-500/5 to-transparent animate-pulse"></div>
        <div className="absolute inset-0 opacity-20">
          {Array.from({length: 50}).map((_, i) => (
            <div 
              key={i} 
              className="h-px bg-gradient-to-r from-transparent via-green-500/20 to-transparent"
              style={{marginTop: '20px'}}
            ></div>
          ))}
        </div>
      </div>

      {/* CRT Curve Effect */}
      <div className="fixed inset-0 pointer-events-none border-4 border-green-500/30 rounded-3xl shadow-[inset_0_0_100px_rgba(34,197,94,0.1)]"></div>

      <div className="container mx-auto px-6 py-8 relative z-10">
        {/* Header */}
        <header className="text-center mb-12 animate-[fadeInDown_1s_ease-out]">
          <div className="inline-block relative">
            <h1 className="text-5xl font-bold text-green-400 mb-2 tracking-wider [text-shadow:0_0_20px_rgba(34,197,94,0.8)]">
              ▶ TASK_TERMINAL
            </h1>
            <div className="text-cyan-400 text-sm tracking-[0.2em] [text-shadow:0_0_10px_rgba(34,197,94,0.5)]">
              REAL-TIME PRODUCTIVITY MATRIX
            </div>
            <div className="absolute -top-2 -right-2 w-4 h-4 bg-green-400 rounded-full animate-ping"></div>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Create Task Terminal */}
          <div className="lg:col-span-2 animate-[slideInLeft_0.8s_ease-out_0.2s_both]">
            <div className="bg-gray-900/80 backdrop-blur-sm border-2 border-green-500/50 rounded-lg p-6 shadow-[0_0_30px_rgba(34,197,94,0.2)]">
              <div className="flex items-center mb-4">
                <div className="flex space-x-2 mr-4">
                  <div className="w-3 h-3 rounded-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.8)]"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.8)]"></div>
                  <div className="w-3 h-3 rounded-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.8)]"></div>
                </div>
                <h2 className="text-xl font-bold text-cyan-400 [text-shadow:0_0_10px_rgba(6,182,212,0.8)]">
                  // CREATE_NEW_TASK
                </h2>
              </div>
              
              <form onSubmit={createTask} className="space-y-4">
                <div>
                  <label className="block text-green-300 text-sm mb-2 tracking-wider">
                    &gt; TASK_TITLE:
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Enter mission objective..."
                    className="w-full bg-black/70 border-2 border-cyan-500/50 rounded px-4 py-3 text-green-400 placeholder-green-600/60 focus:border-cyan-400 focus:shadow-[0_0_20px_rgba(6,182,212,0.5)] transition-all duration-300 font-mono"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-green-300 text-sm mb-2 tracking-wider">
                      &gt; PRIORITY_LEVEL:
                    </label>
                    <select
                      value={priority}
                      onChange={(e) => setPriority(e.target.value as any)}
                      className={`w-full bg-black/70 border-2 border-cyan-500/50 rounded px-4 py-3 text-green-400 focus:border-cyan-400 transition-all duration-300 font-mono ${getPriorityGlow(priority)}`}
                    >
                      <option value="low">LOW</option>
                      <option value="medium">MEDIUM</option>
                      <option value="high">HIGH</option>
                      <option value="urgent">URGENT</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-green-300 text-sm mb-2 tracking-wider">
                    &gt; DESCRIPTION:
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Optional mission details..."
                    rows={3}
                    className="w-full bg-black/70 border-2 border-cyan-500/50 rounded px-4 py-3 text-green-400 placeholder-green-600/60 focus:border-cyan-400 focus:shadow-[0_0_20px_rgba(6,182,212,0.5)] transition-all duration-300 font-mono resize-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-gradient-to-r from-green-600 to-cyan-600 text-black font-bold py-3 px-6 rounded hover:from-green-500 hover:to-cyan-500 disabled:opacity-50 transition-all duration-300 shadow-[0_0_20px_rgba(34,197,94,0.5)] hover:shadow-[0_0_30px_rgba(34,197,94,0.8)] transform hover:scale-105"
                >
                  {isLoading ? 'EXECUTING...' : '▶ DEPLOY_TASK'}
                </button>
              </form>
            </div>
          </div>

          {/* Audit Terminal */}
          <div className="animate-[slideInRight_0.8s_ease-out_0.4s_both]">
            <div className="bg-gray-900/80 backdrop-blur-sm border-2 border-cyan-500/50 rounded-lg p-6 shadow-[0_0_30px_rgba(6,182,212,0.2)] h-fit">
              <h2 className="text-xl font-bold text-cyan-400 mb-4 [text-shadow:0_0_10px_rgba(6,182,212,0.8)]">
                // SYSTEM_LOGS
              </h2>
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {auditLogs.length === 0 ? (
                  <div className="text-green-600/60 italic">
                    &gt; Waiting for system activity...
                  </div>
                ) : (
                  auditLogs.map((log) => (
                    <div key={log.id} className="text-xs border-l-2 border-green-500/50 pl-3 py-1">
                      <div className="text-cyan-300">
                        [{new Date(log.created_at).toLocaleTimeString()}]
                      </div>
                      <div className="text-green-400">
                        ACTION: {log.action.toUpperCase()}
                      </div>
                      <div className="text-green-600/80">
                        TASK_ID: {log.task_id.slice(0,8)}...
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Tasks Grid */}
          <div className="lg:col-span-3 animate-[fadeInUp_0.8s_ease-out_0.6s_both]">
            <div className="bg-gray-900/80 backdrop-blur-sm border-2 border-green-500/50 rounded-lg p-6 shadow-[0_0_30px_rgba(34,197,94,0.2)]">
              <h2 className="text-2xl font-bold text-green-400 mb-6 [text-shadow:0_0_10px_rgba(34,197,94,0.8)]">
                // ACTIVE_MISSIONS ({tasks.length})
              </h2>
              
              {tasks.length === 0 ? (
                <div className="text-center py-12 text-green-600/60">
                  <div className="text-6xl mb-4">⚡</div>
                  <div className="text-xl">NO ACTIVE MISSIONS</div>
                  <div className="text-sm mt-2">Deploy your first task above...</div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {tasks.map((task, index) => (
                    <div 
                      key={task.id} 
                      className={`bg-black/60 border-2 border-green-500/30 rounded-lg p-4 hover:border-cyan-500/60 transition-all duration-300 ${getPriorityGlow(task.priority)} transform hover:scale-105`}
                      style={{animationDelay: `${index * 0.1}s`}}
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex-1">
                          <h3 className="font-bold text-green-400 text-lg mb-1 [text-shadow:0_0_5px_rgba(34,197,94,0.8)]">
                            {task.title}
                          </h3>
                          {task.description && (
                            <p className="text-green-300/80 text-sm mb-2">
                              {task.description}
                            </p>
                          )}
                        </div>
                        <div className="ml-4">
                          <div className="text-xs text-cyan-400 mb-1">
                            PRI: {task.priority.toUpperCase()}
                          </div>
                        </div>
                      </div>

                      <div className="flex justify-between items-center">
                        <div className="flex space-x-2">
                          {['pending', 'in_progress', 'completed'].map((status) => (
                            <button
                              key={status}
                              onClick={() => updateTaskStatus(task.id, status)}
                              className={`px-2 py-1 rounded text-xs font-mono transition-all duration-300 border ${
                                task.status === status 
                                  ? `border-cyan-400 ${getStatusColor(status)} shadow-[0_0_10px_rgba(6,182,212,0.5)]`
                                  : 'border-gray-600 text-gray-500 hover:border-gray-500'
                              }`}
                            >
                              {status.replace('_', ' ').toUpperCase()}
                            </button>
                          ))}
                        </div>
                        <div className={`text-xs font-mono ${getStatusColor(task.status)} [text-shadow:0_0_5px_currentColor]`}>
                          ● {task.status.toUpperCase()}
                        </div>
                      </div>

                      <div className="text-xs text-green-600/60 mt-3 pt-3 border-t border-green-500/20">
                        INIT: {new Date(task.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @keyframes fadeInDown {
          from { opacity: 0; transform: translateY(-30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideInLeft {
          from { opacity: 0; transform: translateX(-50px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes slideInRight {
          from { opacity: 0; transform: translateX(50px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}