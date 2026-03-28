'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Task, AuditLog } from '@/types/database'
import { v4 as uuidv4 } from 'uuid'

export default function Dashboard() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([])
  const [newTask, setNewTask] = useState<{ title: string; description: string; priority: Task['priority'] }>({ title: '', description: '', priority: 'medium' })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchTasks()
    fetchAuditLogs()
    
    // Set up real-time subscriptions
    const tasksSubscription = supabase
      .channel('tasks')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, fetchTasks)
      .subscribe()

    const auditSubscription = supabase
      .channel('audit_logs')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'audit_logs' }, fetchAuditLogs)
      .subscribe()

    return () => {
      supabase.removeChannel(tasksSubscription)
      supabase.removeChannel(auditSubscription)
    }
  }, [])

  const fetchTasks = async () => {
    const { data } = await supabase
      .from('tasks')
      .select('*')
      .order('created_at', { ascending: false })
    setTasks(data || [])
    setLoading(false)
  }

  const fetchAuditLogs = async () => {
    const { data } = await supabase
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50)
    setAuditLogs(data || [])
  }

  const createTask = async (e: React.FormEvent) => {
    e.preventDefault()
    const task: Omit<Task, 'created_at' | 'updated_at'> = {
      id: uuidv4(),
      title: newTask.title,
      description: newTask.description,
      status: 'pending',
      priority: newTask.priority,
    }

    await supabase.from('tasks').insert([task])
    await logAudit(task.id, 'created', null, task)
    setNewTask({ title: '', description: '', priority: 'medium' })
  }

  const updateTaskStatus = async (taskId: string, newStatus: Task['status']) => {
    const oldTask = tasks.find(t => t.id === taskId)
    await supabase.from('tasks').update({ 
      status: newStatus, 
      updated_at: new Date().toISOString(),
      ...(newStatus === 'completed' && { completed_at: new Date().toISOString() })
    }).eq('id', taskId)
    
    if (oldTask) {
      await logAudit(taskId, 'status_changed', 
        { status: oldTask.status }, 
        { status: newStatus }
      )
    }
  }

  const logAudit = async (taskId: string, action: AuditLog['action'], oldValues: any, newValues: any) => {
    const auditLog: Omit<AuditLog, 'created_at'> = {
      id: uuidv4(),
      task_id: taskId,
      action,
      old_values: oldValues,
      new_values: newValues,
      user_id: 'sonny-ai',
    }
    await supabase.from('audit_logs').insert([auditLog])
  }

  const getStatusColor = (status: Task['status']) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
      case 'in_progress': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
      case 'completed': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      case 'cancelled': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
    }
  }

  const getPriorityColor = (priority: Task['priority']) => {
    switch (priority) {
      case 'low': return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
      case 'medium': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'  
      case 'high': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'
      case 'urgent': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">
          Task Dashboard
        </h1>

        {/* Create Task Form */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Create New Task</h2>
          <form onSubmit={createTask} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <input
                  type="text"
                  placeholder="Task title..."
                  value={newTask.title}
                  onChange={(e) => setNewTask(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  required
                />
              </div>
              <div>
                <select
                  value={newTask.priority}
                  onChange={(e) => setNewTask(prev => ({ ...prev, priority: e.target.value as Task['priority'] }))}
                  className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="low">Low Priority</option>
                  <option value="medium">Medium Priority</option>
                  <option value="high">High Priority</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
            </div>
            <textarea
              placeholder="Task description (optional)..."
              value={newTask.description}
              onChange={(e) => setNewTask(prev => ({ ...prev, description: e.target.value }))}
              className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              rows={3}
            />
            <button
              type="submit"
              className="bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-lg transition-colors"
            >
              Create Task
            </button>
          </form>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Tasks List */}
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Tasks ({tasks.length})
                </h2>
              </div>
              <div className="p-6 space-y-4">
                {tasks.map((task) => (
                  <div
                    key={task.id}
                    className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900 dark:text-white mb-2">
                          {task.title}
                        </h3>
                        {task.description && (
                          <p className="text-gray-600 dark:text-gray-300 mb-3">
                            {task.description}
                          </p>
                        )}
                        <div className="flex items-center space-x-2">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(task.status)}`}>
                            {task.status.replace('_', ' ')}
                          </span>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(task.priority)}`}>
                            {task.priority}
                          </span>
                        </div>
                      </div>
                      <div className="ml-4">
                        <select
                          value={task.status}
                          onChange={(e) => updateTaskStatus(task.id, e.target.value as Task['status'])}
                          className="text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white p-1"
                        >
                          <option value="pending">Pending</option>
                          <option value="in_progress">In Progress</option>
                          <option value="completed">Completed</option>
                          <option value="cancelled">Cancelled</option>
                        </select>
                      </div>
                    </div>
                    <div className="mt-3 text-xs text-gray-500 dark:text-gray-400">
                      Created: {new Date(task.created_at).toLocaleDateString()}
                      {task.completed_at && (
                        <span className="ml-4">
                          Completed: {new Date(task.completed_at).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
                {tasks.length === 0 && (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    No tasks yet. Create your first task above!
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Audit Logs */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Audit Logs
                </h2>
              </div>
              <div className="p-6">
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {auditLogs.map((log) => (
                    <div
                      key={log.id}
                      className="text-sm border-l-2 border-blue-500 pl-3 py-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-gray-900 dark:text-white capitalize">
                          {log.action.replace('_', ' ')}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {new Date(log.created_at).toLocaleTimeString()}
                        </span>
                      </div>
                      <div className="text-gray-600 dark:text-gray-300 mt-1">
                        Task: {tasks.find(t => t.id === log.task_id)?.title || 'Unknown'}
                      </div>
                      {log.old_values && log.new_values && (
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {Object.keys(log.old_values).map(key => (
                            <div key={key}>
                              {key}: {log.old_values![key]} → {log.new_values![key]}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                  {auditLogs.length === 0 && (
                    <div className="text-center py-4 text-gray-500 dark:text-gray-400 text-sm">
                      No audit logs yet
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}