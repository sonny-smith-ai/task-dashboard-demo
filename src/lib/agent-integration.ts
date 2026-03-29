// Agent Integration Functions
// Phase 1: Bot Helper Functions for Task Management

import { supabase } from './supabase'

export interface AgentTask {
  id?: string
  title: string
  description?: string
  agent_id: string
  task_type: 'agent' | 'manual' | 'system'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  estimated_steps?: number
  session_id?: string
}

export interface TaskStep {
  step_number: number
  step_name: string
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped'
  error_message?: string
}

export class AgentTaskManager {
  private agentId: string
  private sessionId?: string

  constructor(agentId: string, sessionId?: string) {
    this.agentId = agentId
    this.sessionId = sessionId
  }

  // Start a new agent task
  async startTask(task: AgentTask): Promise<string | null> {
    try {
      // Update agent status to busy
      await this.updateAgentStatus('busy')

      const { data, error } = await supabase
        .from('tasks')
        .insert({
          title: task.title,
          description: task.description,
          agent_id: this.agentId,
          task_type: task.task_type,
          priority: task.priority,
          status: 'in_progress',
          progress_percentage: 0,
          session_id: task.session_id || this.sessionId,
          estimated_completion: task.estimated_steps 
            ? new Date(Date.now() + (task.estimated_steps * 2 * 60 * 1000)) // 2 minutes per step estimate
            : null
        })
        .select()
        .single()

      if (error) {
        console.error('Error creating agent task:', error)
        return null
      }

      // Create task steps if estimated
      if (task.estimated_steps) {
        const steps = Array.from({ length: task.estimated_steps }, (_, i) => ({
          task_id: data.id,
          step_number: i + 1,
          step_name: `Step ${i + 1}`,
          status: 'pending' as const
        }))

        await supabase.from('task_steps').insert(steps)
      }

      // Update agent's current task
      await supabase
        .from('agents')
        .update({ 
          current_task_id: data.id,
          last_heartbeat: new Date().toISOString()
        })
        .eq('id', this.agentId)

      return data.id
    } catch (error) {
      console.error('Failed to start agent task:', error)
      return null
    }
  }

  // Update task progress
  async updateProgress(taskId: string, progress: {
    percentage?: number
    current_step?: string
    step_number?: number
    step_status?: 'running' | 'completed' | 'failed'
    error_message?: string
  }) {
    try {
      // Update main task
      if (progress.percentage !== undefined || progress.current_step) {
        await supabase
          .from('tasks')
          .update({
            progress_percentage: progress.percentage,
            current_step: progress.current_step,
            updated_at: new Date().toISOString()
          })
          .eq('id', taskId)
      }

      // Update specific step if provided
      if (progress.step_number && progress.step_status) {
        const updateData: any = {
          status: progress.step_status,
          error_message: progress.error_message
        }

        if (progress.step_status === 'running' && !updateData.started_at) {
          updateData.started_at = new Date().toISOString()
        }
        
        if (progress.step_status === 'completed' || progress.step_status === 'failed') {
          updateData.completed_at = new Date().toISOString()
        }

        await supabase
          .from('task_steps')
          .update(updateData)
          .eq('task_id', taskId)
          .eq('step_number', progress.step_number)
      }

      // Update agent heartbeat
      await this.heartbeat()

    } catch (error) {
      console.error('Failed to update task progress:', error)
    }
  }

  // Complete a task
  async completeTask(taskId: string, success: boolean = true, result?: string) {
    try {
      await supabase
        .from('tasks')
        .update({
          status: success ? 'completed' : 'cancelled',
          progress_percentage: success ? 100 : undefined,
          completed_at: new Date().toISOString(),
          description: result ? `${result}` : undefined
        })
        .eq('id', taskId)

      // Update agent status back to online
      await this.updateAgentStatus('online')
      
      // Clear current task and increment counter
      await supabase
        .from('agents')
        .update({
          current_task_id: null,
          total_tasks_completed: success ? 
            supabase.rpc('increment_tasks_completed', { agent_id: this.agentId }) : 
            undefined,
          last_heartbeat: new Date().toISOString()
        })
        .eq('id', this.agentId)

    } catch (error) {
      console.error('Failed to complete task:', error)
    }
  }

  // Update agent status
  async updateAgentStatus(status: 'online' | 'busy' | 'offline' | 'error') {
    try {
      await supabase
        .from('agents')
        .update({
          status,
          last_heartbeat: new Date().toISOString()
        })
        .eq('id', this.agentId)
    } catch (error) {
      console.error('Failed to update agent status:', error)
    }
  }

  // Send heartbeat
  async heartbeat() {
    await supabase
      .from('agents')
      .update({ last_heartbeat: new Date().toISOString() })
      .eq('id', this.agentId)
  }

  // Get current task for agent
  async getCurrentTask() {
    const { data } = await supabase
      .from('tasks')
      .select('*, task_steps(*)')
      .eq('agent_id', this.agentId)
      .eq('status', 'in_progress')
      .single()

    return data
  }
}

// Convenience function for quick task creation
export async function createAgentTask(
  agentId: string,
  title: string,
  options?: Partial<AgentTask>
): Promise<string | null> {
  const manager = new AgentTaskManager(agentId)
  return await manager.startTask({
    title,
    agent_id: agentId,
    task_type: 'agent',
    priority: 'medium',
    ...options
  })
}

// RPC function for incrementing task count (needs to be created in Supabase)
export async function createIncrementFunction() {
  const { error } = await supabase.rpc('exec', {
    sql: `
      CREATE OR REPLACE FUNCTION increment_tasks_completed(agent_id TEXT)
      RETURNS INTEGER AS $$
      BEGIN
        UPDATE agents 
        SET total_tasks_completed = total_tasks_completed + 1 
        WHERE id = agent_id;
        RETURN (SELECT total_tasks_completed FROM agents WHERE id = agent_id);
      END;
      $$ LANGUAGE plpgsql;
    `
  })
  
  return !error
}