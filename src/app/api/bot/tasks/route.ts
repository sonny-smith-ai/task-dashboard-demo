// Secure API endpoint for bot task management
// POST /api/bot/tasks - Create new task
// PUT /api/bot/tasks/[id] - Update task progress
// Authentication via API key in header

import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import crypto from 'crypto'

interface AuthenticatedRequest {
  agent_id: string
  agent_name: string
  permissions: any
  api_key_id: string
}

// Authenticate API key
async function authenticateRequest(request: NextRequest): Promise<AuthenticatedRequest | null> {
  const apiKey = request.headers.get('X-API-Key') || request.headers.get('Authorization')?.replace('Bearer ', '')
  
  if (!apiKey || !apiKey.startsWith('ak_')) {
    return null
  }

  // Hash the provided key to match stored hash
  const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex')
  
  // Verify against database
  const { data, error } = await supabase.rpc('verify_api_key', { 
    api_key_hash: keyHash 
  })

  if (error || !data || data.length === 0 || !data[0].is_valid) {
    return null
  }

  const result = data[0]
  return {
    agent_id: result.agent_id,
    agent_name: result.agent_name,
    permissions: result.permissions,
    api_key_id: keyHash
  }
}

// POST - Create new task
export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request)
    if (!auth) {
      return NextResponse.json(
        { error: 'Invalid or missing API key' },
        { status: 401 }
      )
    }

    // Check permissions
    if (!auth.permissions?.tasks?.create) {
      return NextResponse.json(
        { error: 'Insufficient permissions to create tasks' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const {
      title,
      description,
      priority = 'medium',
      estimated_steps,
      session_id,
      task_type = 'agent'
    } = body

    if (!title) {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 }
      )
    }

    // Create task
    const { data, error } = await supabase
      .from('tasks')
      .insert({
        title,
        description,
        priority,
        agent_id: auth.agent_id,
        task_type,
        status: 'in_progress',
        progress_percentage: 0,
        session_id,
        estimated_completion: estimated_steps 
          ? new Date(Date.now() + (estimated_steps * 2 * 60 * 1000)).toISOString()
          : null,
        api_key_id: auth.api_key_id
      })
      .select()
      .single()

    if (error) {
      console.error('Task creation error:', error)
      return NextResponse.json(
        { error: 'Failed to create task' },
        { status: 500 }
      )
    }

    // Update agent status to busy
    await supabase
      .from('agents')
      .update({ 
        status: 'busy',
        current_task_id: data.id,
        last_heartbeat: new Date().toISOString()
      })
      .eq('id', auth.agent_id)

    return NextResponse.json({ 
      success: true, 
      task: data,
      agent: auth.agent_name
    })

  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT - Update task progress  
export async function PUT(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request)
    if (!auth) {
      return NextResponse.json(
        { error: 'Invalid or missing API key' },
        { status: 401 }
      )
    }

    if (!auth.permissions?.tasks?.update) {
      return NextResponse.json(
        { error: 'Insufficient permissions to update tasks' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const {
      task_id,
      progress_percentage,
      current_step,
      status,
      completed_at
    } = body

    if (!task_id) {
      return NextResponse.json(
        { error: 'task_id is required' },
        { status: 400 }
      )
    }

    // Verify task belongs to this agent
    const { data: taskCheck } = await supabase
      .from('tasks')
      .select('agent_id')
      .eq('id', task_id)
      .single()

    if (!taskCheck || taskCheck.agent_id !== auth.agent_id) {
      return NextResponse.json(
        { error: 'Task not found or access denied' },
        { status: 404 }
      )
    }

    // Update task
    const updateData: any = {
      updated_at: new Date().toISOString()
    }

    if (progress_percentage !== undefined) updateData.progress_percentage = progress_percentage
    if (current_step !== undefined) updateData.current_step = current_step
    if (status !== undefined) updateData.status = status
    if (completed_at !== undefined) updateData.completed_at = completed_at

    const { data, error } = await supabase
      .from('tasks')
      .update(updateData)
      .eq('id', task_id)
      .select()
      .single()

    if (error) {
      return NextResponse.json(
        { error: 'Failed to update task' },
        { status: 500 }
      )
    }

    // Update agent heartbeat and status
    const agentUpdate: any = {
      last_heartbeat: new Date().toISOString()
    }

    // If task is completed, update agent status
    if (status === 'completed' || status === 'cancelled') {
      agentUpdate.status = 'online'
      agentUpdate.current_task_id = null
      
      // Increment completed count if successful
      if (status === 'completed') {
        const { data: agent } = await supabase
          .from('agents')
          .select('total_tasks_completed')
          .eq('id', auth.agent_id)
          .single()
        
        if (agent) {
          agentUpdate.total_tasks_completed = (agent.total_tasks_completed || 0) + 1
        }
      }
    }

    await supabase
      .from('agents')
      .update(agentUpdate)
      .eq('id', auth.agent_id)

    return NextResponse.json({ 
      success: true, 
      task: data 
    })

  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}