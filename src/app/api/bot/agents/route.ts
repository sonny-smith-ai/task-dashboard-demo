// Agent Management and Status API
// GET /api/bot/agents - List agents with real-time status
// POST /api/bot/agents - Create/update agent
// PUT /api/bot/agents/[id] - Update agent status

import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// GET - List all agents
export async function GET() {
  try {
    // Initialize default agents if they don't exist
    await initializeAgents()

    const { data, error } = await supabase
      .from('agents')
      .select('*')
      .order('name')

    if (error) {
      console.error('Failed to fetch agents:', error)
      return NextResponse.json({ error: 'Failed to fetch agents' }, { status: 500 })
    }

    return NextResponse.json({ agents: data })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Create or update agent
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, name, emoji, status = 'offline', current_activity } = body

    if (!id || !name) {
      return NextResponse.json({ error: 'Agent ID and name are required' }, { status: 400 })
    }

    // Upsert agent (insert or update)
    const { data, error } = await supabase
      .from('agents')
      .upsert({
        id,
        name,
        emoji: emoji || '🤖',
        status,
        last_heartbeat: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'id'
      })
      .select()
      .single()

    if (error) {
      console.error('Failed to create/update agent:', error)
      return NextResponse.json({ error: 'Failed to create agent' }, { status: 500 })
    }

    return NextResponse.json({ success: true, agent: data })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Initialize default agents
async function initializeAgents() {
  try {
    const defaultAgents = [
      { id: 'sonny', name: 'Sonny Smith', emoji: '🍆' },
      { id: 'jarvis', name: 'Jarvis', emoji: '🧠' },
      { id: 'system', name: 'System', emoji: '⚙️' }
    ]

    // Check if agents table exists and has the required columns
    const { data: existing } = await supabase
      .from('agents')
      .select('id')
      .limit(1)

    // If query succeeded, table exists, so upsert agents
    for (const agent of defaultAgents) {
      await supabase
        .from('agents')
        .upsert({
          ...agent,
          status: 'offline',
          total_tasks_completed: 0,
          last_heartbeat: new Date().toISOString(),
          created_at: new Date().toISOString()
        }, {
          onConflict: 'id',
          ignoreDuplicates: false
        })
    }

    console.log('Default agents initialized')
  } catch (error) {
    console.error('Failed to initialize agents - database schema may need to be applied:', error)
    
    // Try to create the agents table if it doesn't exist
    try {
      await supabase.rpc('exec', {
        sql: `
          CREATE TABLE IF NOT EXISTS agents (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            emoji TEXT DEFAULT '🤖',
            status TEXT NOT NULL CHECK (status IN ('online', 'busy', 'offline', 'error')) DEFAULT 'offline',
            current_task_id UUID,
            last_heartbeat TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            total_tasks_completed INTEGER DEFAULT 0,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
          );
        `
      })
      console.log('Agents table created')
    } catch (createError) {
      console.error('Failed to create agents table:', createError)
    }
  }
}