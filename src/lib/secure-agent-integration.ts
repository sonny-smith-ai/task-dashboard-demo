// Secure Agent Integration with API Key Authentication
// Replaces direct Supabase access with authenticated API calls

export interface SecureAgentTask {
  title: string
  description?: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
  estimated_steps?: number
  session_id?: string
  task_type?: 'agent' | 'system'
}

export interface TaskProgress {
  task_id: string
  progress_percentage?: number
  current_step?: string
  status?: 'pending' | 'in_progress' | 'completed' | 'cancelled'
  completed_at?: string
}

export class SecureAgentTaskManager {
  private apiKey: string
  private baseUrl: string
  private agentId: string

  constructor(agentId: string, apiKey: string, baseUrl?: string) {
    this.agentId = agentId
    this.apiKey = apiKey
    this.baseUrl = baseUrl || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000')
  }

  private async makeRequest(endpoint: string, options: RequestInit = {}) {
    const url = `${this.baseUrl}/api/bot${endpoint}`
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': this.apiKey,
        ...options.headers,
      },
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || `API request failed: ${response.status}`)
    }

    return data
  }

  // Start a new task
  async startTask(task: SecureAgentTask): Promise<string | null> {
    try {
      const response = await this.makeRequest('/tasks', {
        method: 'POST',
        body: JSON.stringify({
          title: task.title,
          description: task.description,
          priority: task.priority,
          estimated_steps: task.estimated_steps,
          session_id: task.session_id,
          task_type: task.task_type || 'agent'
        })
      })

      console.log(`✅ Task started: ${task.title} (Agent: ${response.agent})`)
      return response.task?.id || null

    } catch (error) {
      console.error('Failed to start task:', error)
      return null
    }
  }

  // Update task progress
  async updateProgress(progress: TaskProgress): Promise<boolean> {
    try {
      await this.makeRequest('/tasks', {
        method: 'PUT',
        body: JSON.stringify(progress)
      })

      return true

    } catch (error) {
      console.error('Failed to update task progress:', error)
      return false
    }
  }

  // Complete a task
  async completeTask(taskId: string, success: boolean = true): Promise<boolean> {
    try {
      await this.updateProgress({
        task_id: taskId,
        status: success ? 'completed' : 'cancelled',
        progress_percentage: success ? 100 : undefined,
        completed_at: new Date().toISOString()
      })

      console.log(`✅ Task ${success ? 'completed' : 'cancelled'}: ${taskId}`)
      return true

    } catch (error) {
      console.error('Failed to complete task:', error)
      return false
    }
  }

  // Send heartbeat (update progress with current activity)
  async heartbeat(taskId: string, currentActivity: string): Promise<boolean> {
    try {
      await this.updateProgress({
        task_id: taskId,
        current_step: currentActivity
      })

      return true

    } catch (error) {
      console.error('Failed to send heartbeat:', error)
      return false
    }
  }
}

// Enhanced wrapper for Sonny's integration
export class SecureSonnyTracker {
  private taskManager: SecureAgentTaskManager
  private currentTaskId: string | null = null
  private currentSteps: string[] = []
  private currentStepIndex: number = 0

  constructor(apiKey: string) {
    this.taskManager = new SecureAgentTaskManager('sonny', apiKey)
  }

  // Start tracking a new task
  async startTask(title: string, steps: string[] = []): Promise<void> {
    try {
      this.currentSteps = steps
      this.currentStepIndex = 0
      
      const taskId = await this.taskManager.startTask({
        title,
        description: steps.length > 0 ? `Task with ${steps.length} estimated steps` : undefined,
        priority: 'medium',
        estimated_steps: steps.length,
        session_id: 'main-session',
        task_type: 'agent'
      })

      if (taskId) {
        this.currentTaskId = taskId
        console.log(`🍆 Sonny task tracking started: ${title}`)
      }
    } catch (error) {
      console.error('Failed to start Sonny task tracking:', error)
    }
  }

  // Update progress
  async updateProgress(stepName?: string): Promise<void> {
    if (!this.currentTaskId) return

    try {
      this.currentStepIndex++
      const percentage = this.currentSteps.length > 0 
        ? Math.round((this.currentStepIndex / this.currentSteps.length) * 100)
        : Math.min(this.currentStepIndex * 20, 90) // Estimate if no steps provided

      await this.taskManager.updateProgress({
        task_id: this.currentTaskId,
        progress_percentage: Math.min(percentage, 90), // Never 100% until complete
        current_step: stepName || this.currentSteps[this.currentStepIndex - 1] || 'Working...'
      })

      console.log(`📊 Progress: ${percentage}% - ${stepName || 'Step completed'}`)
    } catch (error) {
      console.error('Failed to update progress:', error)
    }
  }

  // Send heartbeat
  async heartbeat(currentActivity?: string): Promise<void> {
    if (!this.currentTaskId) return

    try {
      await this.taskManager.heartbeat(
        this.currentTaskId, 
        currentActivity || 'Working...'
      )
    } catch (error) {
      console.error('Failed to send heartbeat:', error)
    }
  }

  // Complete task
  async completeTask(result?: string, success: boolean = true): Promise<void> {
    if (!this.currentTaskId) return

    try {
      await this.taskManager.completeTask(this.currentTaskId, success)
      
      console.log(`✅ Sonny task completed: ${success ? 'Success' : 'Cancelled'}`)
      
      // Reset state
      this.currentTaskId = null
      this.currentSteps = []
      this.currentStepIndex = 0
    } catch (error) {
      console.error('Failed to complete task:', error)
    }
  }

  // Error handling
  async taskError(error: string): Promise<void> {
    if (!this.currentTaskId) return

    try {
      await this.taskManager.updateProgress({
        task_id: this.currentTaskId,
        current_step: `Error: ${error}`,
        status: 'cancelled'
      })
    } catch (err) {
      console.error('Failed to report task error:', err)
    }
  }

  // Get current status
  getCurrentStatus(): { taskId: string | null; currentStep: number; totalSteps: number } {
    return {
      taskId: this.currentTaskId,
      currentStep: this.currentStepIndex,
      totalSteps: this.currentSteps.length
    }
  }
}

// Helper functions for easy integration
let globalSonnyTracker: SecureSonnyTracker | null = null

export function initializeSonnyTracking(apiKey: string): void {
  globalSonnyTracker = new SecureSonnyTracker(apiKey)
}

export async function trackTaskStart(title: string, estimatedSteps: string[] = []): Promise<void> {
  if (!globalSonnyTracker) {
    console.warn('Sonny tracking not initialized. Call initializeSonnyTracking(apiKey) first.')
    return
  }
  await globalSonnyTracker.startTask(title, estimatedSteps)
}

export async function trackProgress(stepName?: string): Promise<void> {
  if (!globalSonnyTracker) return
  await globalSonnyTracker.updateProgress(stepName)
}

export async function trackHeartbeat(currentActivity?: string): Promise<void> {
  if (!globalSonnyTracker) return
  await globalSonnyTracker.heartbeat(currentActivity)
}

export async function trackTaskComplete(result?: string, success: boolean = true): Promise<void> {
  if (!globalSonnyTracker) return
  await globalSonnyTracker.completeTask(result, success)
}

export async function trackError(error: string): Promise<void> {
  if (!globalSonnyTracker) return
  await globalSonnyTracker.taskError(error)
}

// Enhanced protocol functions with error handling
export async function logTaskStarted(title: string, steps: string[] = []): Promise<void> {
  console.log(`[TASK STARTED] ${title}`)
  try {
    await trackTaskStart(title, steps)
  } catch (error) {
    console.warn('Task tracking unavailable:', error)
  }
}

export async function logProgress(stepName: string): Promise<void> {
  console.log(`[PROGRESS] ${stepName}`)
  try {
    await trackProgress(stepName)
  } catch (error) {
    console.warn('Progress tracking unavailable:', error)
  }
}

export async function logHeartbeat(activity: string): Promise<void> {
  console.log(`[HEARTBEAT] ${activity}`)
  try {
    await trackHeartbeat(activity)
  } catch (error) {
    console.warn('Heartbeat tracking unavailable:', error)
  }
}

export async function logTaskComplete(summary: string, success: boolean = true): Promise<void> {
  console.log(`[TASK COMPLETE] ${summary}`)
  try {
    await trackTaskComplete(summary, success)
  } catch (error) {
    console.warn('Task completion tracking unavailable:', error)
  }
}

export async function logError(error: string): Promise<void> {
  console.log(`[ERROR] ${error}`)
  try {
    await trackError(error)
  } catch (error) {
    console.warn('Error tracking unavailable:', error)
  }
}