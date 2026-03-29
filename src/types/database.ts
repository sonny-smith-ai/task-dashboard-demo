export interface Database {
  public: {
    Tables: {
      tasks: {
        Row: {
          id: string
          title: string
          description: string | null
          status: 'pending' | 'in_progress' | 'completed' | 'cancelled'
          priority: 'low' | 'medium' | 'high' | 'urgent'
          assigned_to: string | null
          agent_id: string | null
          progress_percentage: number
          current_step: string | null
          session_id: string | null
          estimated_completion: string | null
          task_type: 'manual' | 'agent' | 'system'
          created_at: string
          updated_at: string
          completed_at: string | null
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          status?: 'pending' | 'in_progress' | 'completed' | 'cancelled'
          priority?: 'low' | 'medium' | 'high' | 'urgent'
          assigned_to?: string | null
          agent_id?: string | null
          progress_percentage?: number
          current_step?: string | null
          session_id?: string | null
          estimated_completion?: string | null
          task_type?: 'manual' | 'agent' | 'system'
          created_at?: string
          updated_at?: string
          completed_at?: string | null
        }
        Update: {
          id?: string
          title?: string
          description?: string | null
          status?: 'pending' | 'in_progress' | 'completed' | 'cancelled'
          priority?: 'low' | 'medium' | 'high' | 'urgent'
          assigned_to?: string | null
          agent_id?: string | null
          progress_percentage?: number
          current_step?: string | null
          session_id?: string | null
          estimated_completion?: string | null
          task_type?: 'manual' | 'agent' | 'system'
          created_at?: string
          updated_at?: string
          completed_at?: string | null
        }
      }
      agents: {
        Row: {
          id: string
          name: string
          emoji: string
          status: 'online' | 'busy' | 'offline' | 'error'
          current_task_id: string | null
          last_heartbeat: string
          total_tasks_completed: number
          created_at: string
        }
        Insert: {
          id: string
          name: string
          emoji?: string
          status?: 'online' | 'busy' | 'offline' | 'error'
          current_task_id?: string | null
          last_heartbeat?: string
          total_tasks_completed?: number
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          emoji?: string
          status?: 'online' | 'busy' | 'offline' | 'error'
          current_task_id?: string | null
          last_heartbeat?: string
          total_tasks_completed?: number
          created_at?: string
        }
      }
      task_steps: {
        Row: {
          id: string
          task_id: string
          step_number: number
          step_name: string
          status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped'
          started_at: string | null
          completed_at: string | null
          error_message: string | null
          created_at: string
        }
        Insert: {
          id?: string
          task_id: string
          step_number: number
          step_name: string
          status?: 'pending' | 'running' | 'completed' | 'failed' | 'skipped'
          started_at?: string | null
          completed_at?: string | null
          error_message?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          task_id?: string
          step_number?: number
          step_name?: string
          status?: 'pending' | 'running' | 'completed' | 'failed' | 'skipped'
          started_at?: string | null
          completed_at?: string | null
          error_message?: string | null
          created_at?: string
        }
      }
      audit_logs: {
        Row: {
          id: string
          task_id: string
          action: 'created' | 'updated' | 'status_changed' | 'deleted'
          old_values: any
          new_values: any
          user_id: string | null
          agent_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          task_id: string
          action: 'created' | 'updated' | 'status_changed' | 'deleted'
          old_values?: any
          new_values?: any
          user_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          task_id?: string
          action?: 'created' | 'updated' | 'status_changed' | 'deleted'
          old_values?: any
          new_values?: any
          user_id?: string | null
          created_at?: string
        }
      }
    }
  }
}