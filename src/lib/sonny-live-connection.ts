// Live Connection for Sonny to Dashboard
// Real-time status updates, API limit monitoring, availability tracking

import { SecureSonnyTracker } from './secure-agent-integration'

export interface SonnyStatus {
  availability: 'online' | 'busy' | 'offline' | 'rate_limited' | 'error'
  current_activity: string
  session_info: {
    model: string
    tokens_used: number
    context_usage: string
    rate_limit_status: 'ok' | 'warning' | 'limited'
  }
  last_heartbeat: string
}

export class SonnyLiveConnection {
  private apiKey: string | null = null
  private tracker: SecureSonnyTracker | null = null
  private heartbeatInterval: NodeJS.Timeout | null = null
  private isConnected: boolean = false

  constructor() {
    // Will initialize when API key is provided
  }

  // Initialize connection with API key
  async connect(apiKey: string): Promise<boolean> {
    try {
      this.apiKey = apiKey
      this.tracker = new SecureSonnyTracker(apiKey)
      
      // Register myself as an active agent
      await this.registerAgent()
      
      // Start heartbeat monitoring
      this.startHeartbeat()
      
      this.isConnected = true
      console.log('🍆 Sonny connected to dashboard')
      
      return true
    } catch (error) {
      console.error('Failed to connect to dashboard:', error)
      return false
    }
  }

  // Register or update my agent status
  private async registerAgent(): Promise<void> {
    try {
      await fetch(`${this.getBaseUrl()}/api/bot/agents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: 'sonny',
          name: 'Sonny Smith',
          emoji: '🍆',
          status: 'online'
        })
      })
    } catch (error) {
      console.error('Failed to register agent:', error)
    }
  }

  // Update my live status
  async updateStatus(status: SonnyStatus): Promise<void> {
    if (!this.isConnected || !this.apiKey) return

    try {
      // Update agent status in database
      await fetch(`${this.getBaseUrl()}/api/bot/agents`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-API-Key': this.apiKey 
        },
        body: JSON.stringify({
          id: 'sonny',
          name: 'Sonny Smith',
          emoji: '🍆',
          status: status.availability,
          current_activity: status.current_activity,
          session_info: status.session_info
        })
      })

      console.log(`🍆 Status update: ${status.availability} - ${status.current_activity}`)
    } catch (error) {
      console.error('Failed to update status:', error)
    }
  }

  // Start automated heartbeat
  private startHeartbeat(): void {
    if (this.heartbeatInterval) clearInterval(this.heartbeatInterval)
    
    this.heartbeatInterval = setInterval(async () => {
      await this.sendHeartbeat()
    }, 30000) // Every 30 seconds
  }

  // Send heartbeat with current status
  private async sendHeartbeat(): Promise<void> {
    if (!this.isConnected) return

    try {
      const status = await this.getCurrentStatus()
      await this.updateStatus(status)
    } catch (error) {
      console.error('Heartbeat failed:', error)
    }
  }

  // Get my current status
  private async getCurrentStatus(): Promise<SonnyStatus> {
    // This would ideally read from OpenClaw session status
    // For now, we'll return basic status
    return {
      availability: this.isConnected ? 'online' : 'offline',
      current_activity: 'Monitoring OpenClaw session',
      session_info: {
        model: 'claude-sonnet-4-20250514',
        tokens_used: 0, // Would get from actual session
        context_usage: '50k/200k',
        rate_limit_status: 'ok'
      },
      last_heartbeat: new Date().toISOString()
    }
  }

  // Disconnect from dashboard
  disconnect(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
      this.heartbeatInterval = null
    }
    
    this.isConnected = false
    console.log('🍆 Sonny disconnected from dashboard')
  }

  // Track when I start working on something
  async startWork(title: string, steps: string[] = []): Promise<void> {
    if (!this.tracker) return

    await this.updateStatus({
      availability: 'busy',
      current_activity: `Working: ${title}`,
      session_info: await this.getSessionInfo(),
      last_heartbeat: new Date().toISOString()
    })

    await this.tracker.startTask(title, steps)
  }

  // Track progress updates
  async updateWork(stepName: string): Promise<void> {
    if (!this.tracker) return

    await this.updateStatus({
      availability: 'busy',
      current_activity: stepName,
      session_info: await this.getSessionInfo(),
      last_heartbeat: new Date().toISOString()
    })

    await this.tracker.updateProgress(stepName)
  }

  // Track completion
  async completeWork(result?: string, success: boolean = true): Promise<void> {
    if (!this.tracker) return

    await this.tracker.completeTask(result, success)

    await this.updateStatus({
      availability: 'online',
      current_activity: success ? 'Task completed successfully' : 'Task cancelled',
      session_info: await this.getSessionInfo(),
      last_heartbeat: new Date().toISOString()
    })
  }

  // Get session info (placeholder - would integrate with OpenClaw session_status)
  private async getSessionInfo(): Promise<SonnyStatus['session_info']> {
    return {
      model: 'claude-sonnet-4-20250514',
      tokens_used: 0, // TODO: Get from actual session
      context_usage: 'Unknown', // TODO: Get from session_status
      rate_limit_status: 'ok'
    }
  }

  private getBaseUrl(): string {
    return 'https://task-dashboard-demo.vercel.app'
  }

  // Check if connected
  isLive(): boolean {
    return this.isConnected
  }
}

// Global instance
let globalSonnyConnection: SonnyLiveConnection | null = null

// Initialize global connection
export function initializeLiveConnection(apiKey: string): Promise<boolean> {
  if (!globalSonnyConnection) {
    globalSonnyConnection = new SonnyLiveConnection()
  }
  return globalSonnyConnection.connect(apiKey)
}

// Enhanced tracking functions that also update live status
export async function startLiveWork(title: string, steps: string[] = []): Promise<void> {
  if (globalSonnyConnection?.isLive()) {
    await globalSonnyConnection.startWork(title, steps)
  } else {
    console.log(`[TASK STARTED] ${title} (dashboard not connected)`)
  }
}

export async function updateLiveWork(stepName: string): Promise<void> {
  if (globalSonnyConnection?.isLive()) {
    await globalSonnyConnection.updateWork(stepName)
  } else {
    console.log(`[PROGRESS] ${stepName} (dashboard not connected)`)
  }
}

export async function completeLiveWork(result?: string, success: boolean = true): Promise<void> {
  if (globalSonnyConnection?.isLive()) {
    await globalSonnyConnection.completeWork(result, success)
  } else {
    console.log(`[TASK COMPLETE] ${result} (dashboard not connected)`)
  }
}

export async function updateActivity(activity: string): Promise<void> {
  if (globalSonnyConnection?.isLive()) {
    const status: SonnyStatus = {
      availability: 'online',
      current_activity: activity,
      session_info: {
        model: 'claude-sonnet-4-20250514',
        tokens_used: 0,
        context_usage: 'Active session',
        rate_limit_status: 'ok'
      },
      last_heartbeat: new Date().toISOString()
    }
    await globalSonnyConnection.updateStatus(status)
  }
}

export function getLiveConnection(): SonnyLiveConnection | null {
  return globalSonnyConnection
}