// Phase 3: Sonny's Personal Integration with Task Dashboard
// Connects existing [PROGRESS] protocol to live dashboard

import { AgentTaskManager } from './agent-integration'

class SonnyTaskTracker {
  private taskManager: AgentTaskManager
  private currentTaskId: string | null = null
  private currentSteps: string[] = []
  private currentStepIndex: number = 0

  constructor() {
    this.taskManager = new AgentTaskManager('sonny', 'main-session')
  }

  // Start tracking a new task (call at [TASK STARTED])
  async startTask(title: string, steps: string[] = []): Promise<void> {
    try {
      this.currentSteps = steps
      this.currentStepIndex = 0
      
      const taskId = await this.taskManager.startTask({
        title,
        description: `Task with ${steps.length} estimated steps`,
        agent_id: 'sonny',
        task_type: 'agent',
        priority: 'medium',
        estimated_steps: steps.length,
        session_id: 'main-session'
      })

      if (taskId) {
        this.currentTaskId = taskId
        console.log(`✅ Task tracking started: ${title}`)
      }
    } catch (error) {
      console.error('Failed to start task tracking:', error)
    }
  }

  // Update progress (call at each [PROGRESS])
  async updateProgress(stepName?: string): Promise<void> {
    if (!this.currentTaskId || !this.currentSteps.length) return

    try {
      this.currentStepIndex++
      const percentage = Math.round((this.currentStepIndex / this.currentSteps.length) * 100)
      
      await this.taskManager.updateProgress(this.currentTaskId, {
        percentage: Math.min(percentage, 90), // Never show 100% until complete
        current_step: stepName || this.currentSteps[this.currentStepIndex - 1] || 'Working...',
        step_number: this.currentStepIndex,
        step_status: 'completed'
      })

      // Mark current step as running
      if (this.currentStepIndex < this.currentSteps.length) {
        await this.taskManager.updateProgress(this.currentTaskId, {
          step_number: this.currentStepIndex + 1,
          step_status: 'running'
        })
      }

      console.log(`📊 Progress: ${percentage}% - ${stepName || 'Step completed'}`)
    } catch (error) {
      console.error('Failed to update progress:', error)
    }
  }

  // Send heartbeat (call during [HEARTBEAT])
  async heartbeat(currentActivity?: string): Promise<void> {
    if (!this.currentTaskId) return

    try {
      await this.taskManager.updateProgress(this.currentTaskId, {
        current_step: currentActivity || 'Working...'
      })
      
      await this.taskManager.heartbeat()
    } catch (error) {
      console.error('Failed to send heartbeat:', error)
    }
  }

  // Complete task (call at [TASK COMPLETE])
  async completeTask(result?: string, success: boolean = true): Promise<void> {
    if (!this.currentTaskId) return

    try {
      await this.taskManager.updateProgress(this.currentTaskId, {
        percentage: 100,
        current_step: success ? 'Completed successfully' : 'Task cancelled'
      })

      await this.taskManager.completeTask(this.currentTaskId, success, result)
      
      console.log(`✅ Task completed: ${success ? 'Success' : 'Cancelled'}`)
      
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
      await this.taskManager.updateProgress(this.currentTaskId, {
        current_step: `Error: ${error}`,
        step_status: 'failed',
        error_message: error
      })

      await this.taskManager.updateAgentStatus('error')
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

// Global instance for Sonny's task tracking
export const sonnyTracker = new SonnyTaskTracker()

// Helper functions that match my existing protocol style

export async function trackTaskStart(title: string, estimatedSteps: string[] = []): Promise<void> {
  await sonnyTracker.startTask(title, estimatedSteps)
}

export async function trackProgress(stepName?: string): Promise<void> {
  await sonnyTracker.updateProgress(stepName)
}

export async function trackHeartbeat(currentActivity?: string): Promise<void> {
  await sonnyTracker.heartbeat(currentActivity)
}

export async function trackTaskComplete(result?: string, success: boolean = true): Promise<void> {
  await sonnyTracker.completeTask(result, success)
}

export async function trackError(error: string): Promise<void> {
  await sonnyTracker.taskError(error)
}

// Enhanced protocol functions that I can use instead of console logs
export async function logTaskStarted(title: string, steps: string[] = []): Promise<void> {
  console.log(`[TASK STARTED] ${title}`)
  await trackTaskStart(title, steps)
}

export async function logProgress(stepName: string): Promise<void> {
  console.log(`[PROGRESS] ${stepName}`)
  await trackProgress(stepName)
}

export async function logHeartbeat(activity: string): Promise<void> {
  console.log(`[HEARTBEAT] ${activity}`)
  await trackHeartbeat(activity)
}

export async function logTaskComplete(summary: string, success: boolean = true): Promise<void> {
  console.log(`[TASK COMPLETE] ${summary}`)
  await trackTaskComplete(summary, success)
}

export async function logError(error: string): Promise<void> {
  console.log(`[ERROR] ${error}`)
  await trackError(error)
}