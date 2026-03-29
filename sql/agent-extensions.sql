-- Agent Integration Extensions for Task Dashboard
-- Phase 1: Database Schema Updates

-- Add agent tracking fields to existing tasks table
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS agent_id TEXT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100);
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS current_step TEXT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS session_id TEXT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS estimated_completion TIMESTAMP WITH TIME ZONE;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS task_type TEXT DEFAULT 'manual' CHECK (task_type IN ('manual', 'agent', 'system'));

-- Create agents table for tracking active bots
CREATE TABLE IF NOT EXISTS agents (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    emoji TEXT DEFAULT '🤖',
    status TEXT NOT NULL CHECK (status IN ('online', 'busy', 'offline', 'error')) DEFAULT 'offline',
    current_task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
    last_heartbeat TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    total_tasks_completed INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create task_steps table for detailed progress tracking
CREATE TABLE IF NOT EXISTS task_steps (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    step_number INTEGER NOT NULL,
    step_name TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('pending', 'running', 'completed', 'failed', 'skipped')) DEFAULT 'pending',
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(task_id, step_number)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_tasks_agent_id ON tasks(agent_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status_agent ON tasks(status, agent_id);
CREATE INDEX IF NOT EXISTS idx_agents_status ON agents(status);
CREATE INDEX IF NOT EXISTS idx_task_steps_task_id ON task_steps(task_id);

-- RLS Policies for security
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_steps ENABLE ROW LEVEL SECURITY;

-- Allow read access to agents table
CREATE POLICY IF NOT EXISTS "Public read access for agents" ON agents FOR SELECT USING (true);

-- Allow read access to task_steps
CREATE POLICY IF NOT EXISTS "Public read access for task_steps" ON task_steps FOR SELECT USING (true);

-- Insert default agents
INSERT INTO agents (id, name, emoji, status) VALUES 
    ('sonny', 'Sonny Smith', '🍆', 'offline'),
    ('jarvis', 'Jarvis', '🧠', 'offline'),
    ('system', 'System', '⚙️', 'offline')
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    emoji = EXCLUDED.emoji;

-- Update audit_logs to track agent actions
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS agent_id TEXT;