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
          created_at?: string
          updated_at?: string
          completed_at?: string | null
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