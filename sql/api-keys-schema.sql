-- API Key Authentication System for Bot Integration
-- Secure bot access to task dashboard

-- API Keys table for bot authentication
CREATE TABLE IF NOT EXISTS api_keys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key_name TEXT NOT NULL,
    key_hash TEXT NOT NULL UNIQUE, -- Store hashed version for security
    agent_id TEXT NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    permissions JSONB DEFAULT '{"tasks": {"create": true, "update": true, "read": true}}',
    is_active BOOLEAN DEFAULT true,
    last_used_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_by TEXT, -- Who created this key
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_api_keys_agent ON api_keys(agent_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_active ON api_keys(is_active) WHERE is_active = true;

-- Function to verify API key and return agent info
CREATE OR REPLACE FUNCTION verify_api_key(api_key_hash TEXT)
RETURNS TABLE(
    agent_id TEXT,
    agent_name TEXT,
    permissions JSONB,
    is_valid BOOLEAN
) AS $$
BEGIN
    -- Update last_used_at and return agent info
    UPDATE api_keys 
    SET last_used_at = NOW(), updated_at = NOW()
    WHERE key_hash = api_key_hash 
      AND is_active = true 
      AND (expires_at IS NULL OR expires_at > NOW());
    
    -- Return agent info if key is valid
    RETURN QUERY
    SELECT 
        ak.agent_id,
        a.name as agent_name,
        ak.permissions,
        true as is_valid
    FROM api_keys ak
    JOIN agents a ON ak.agent_id = a.id
    WHERE ak.key_hash = api_key_hash 
      AND ak.is_active = true 
      AND (ak.expires_at IS NULL OR ak.expires_at > NOW());
    
    -- If no rows returned, return invalid result
    IF NOT FOUND THEN
        RETURN QUERY SELECT NULL::TEXT, NULL::TEXT, NULL::JSONB, false;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create new API key (returns the actual key, not hash)
CREATE OR REPLACE FUNCTION create_api_key(
    p_key_name TEXT,
    p_agent_id TEXT,
    p_permissions JSONB DEFAULT '{"tasks": {"create": true, "update": true, "read": true}}',
    p_expires_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    p_created_by TEXT DEFAULT NULL
)
RETURNS TABLE(
    api_key TEXT,
    key_id UUID
) AS $$
DECLARE
    new_key TEXT;
    new_key_hash TEXT;
    new_id UUID;
BEGIN
    -- Generate a secure API key (32 characters)
    new_key := 'ak_' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 29);
    
    -- Create hash for storage (using digest if available)
    new_key_hash := encode(sha256(new_key::bytea), 'hex');
    
    -- Insert the new API key
    INSERT INTO api_keys (key_name, key_hash, agent_id, permissions, expires_at, created_by)
    VALUES (p_key_name, new_key_hash, p_agent_id, p_permissions, p_expires_at, p_created_by)
    RETURNING id INTO new_id;
    
    -- Return the actual key (only time it's shown) and ID
    RETURN QUERY SELECT new_key, new_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS Policies
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

-- Allow read access to API keys (for management interface)
CREATE POLICY IF NOT EXISTS "Public read access for api_keys" ON api_keys 
    FOR SELECT USING (true);

-- Allow insert/update for API key management
CREATE POLICY IF NOT EXISTS "Public manage access for api_keys" ON api_keys 
    FOR ALL USING (true);

-- Add API key tracking to audit logs
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS api_key_id UUID REFERENCES api_keys(id) ON DELETE SET NULL;

-- Update tasks table to track API key used for creation
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS api_key_id UUID REFERENCES api_keys(id) ON DELETE SET NULL;