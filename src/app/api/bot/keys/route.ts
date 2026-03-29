// API Key Management Endpoint
// GET /api/bot/keys - List API keys
// POST /api/bot/keys - Create new API key
// DELETE /api/bot/keys/[id] - Revoke API key

import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// GET - List API keys (for management)
export async function GET() {
  try {
    const { data, error } = await supabase
      .from('api_keys')
      .select(`
        id,
        key_name,
        agent_id,
        agents(name, emoji),
        permissions,
        is_active,
        last_used_at,
        expires_at,
        created_at
      `)
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch API keys' },
        { status: 500 }
      )
    }

    return NextResponse.json({ keys: data })

  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST - Create new API key
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      key_name,
      agent_id,
      permissions = {
        "tasks": {
          "create": true,
          "update": true,
          "read": true
        }
      },
      expires_days
    } = body

    if (!key_name || !agent_id) {
      return NextResponse.json(
        { error: 'key_name and agent_id are required' },
        { status: 400 }
      )
    }

    // Check if agent exists
    const { data: agent } = await supabase
      .from('agents')
      .select('id, name')
      .eq('id', agent_id)
      .single()

    if (!agent) {
      return NextResponse.json(
        { error: 'Agent not found' },
        { status: 404 }
      )
    }

    // Calculate expiration date
    const expires_at = expires_days 
      ? new Date(Date.now() + expires_days * 24 * 60 * 60 * 1000).toISOString()
      : null

    // Create API key using database function
    const { data, error } = await supabase.rpc('create_api_key', {
      p_key_name: key_name,
      p_agent_id: agent_id,
      p_permissions: permissions,
      p_expires_at: expires_at,
      p_created_by: 'dashboard'
    })

    if (error || !data || data.length === 0) {
      console.error('API key creation error:', error)
      return NextResponse.json(
        { error: 'Failed to create API key' },
        { status: 500 }
      )
    }

    const result = data[0]

    return NextResponse.json({
      success: true,
      api_key: result.api_key, // Only shown once
      key_id: result.key_id,
      agent_name: agent.name,
      warning: 'Store this API key securely. It will not be shown again.'
    })

  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE - Revoke API key
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const keyId = searchParams.get('id')

    if (!keyId) {
      return NextResponse.json(
        { error: 'Key ID is required' },
        { status: 400 }
      )
    }

    const { error } = await supabase
      .from('api_keys')
      .update({ 
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', keyId)

    if (error) {
      return NextResponse.json(
        { error: 'Failed to revoke API key' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}