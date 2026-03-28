export interface Task {
  id: string
  title: string
  description?: string
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  assigned_to?: string
  created_at: string
  updated_at: string
  completed_at?: string
}

export interface AuditLog {
  id: string
  task_id: string
  action: 'created' | 'updated' | 'status_changed' | 'deleted'
  old_values?: Record<string, any>
  new_values?: Record<string, any>
  user_id?: string
  created_at: string
}