'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface APIKey {
  id: string
  key_name: string
  agent_id: string
  agents: { name: string; emoji: string }
  permissions: any
  is_active: boolean
  last_used_at: string | null
  expires_at: string | null
  created_at: string
}

export default function APIKeysPage() {
  const [apiKeys, setApiKeys] = useState<APIKey[]>([])
  const [agents, setAgents] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newKey, setNewKey] = useState<{ api_key: string; warning: string } | null>(null)
  
  // Form state
  const [keyName, setKeyName] = useState('')
  const [selectedAgent, setSelectedAgent] = useState('')
  const [expireDays, setExpireDays] = useState<number | ''>('')

  const fetchAPIKeys = async () => {
    try {
      const response = await fetch('/api/bot/keys')
      const data = await response.json()
      setApiKeys(data.keys || [])
    } catch (error) {
      console.error('Failed to fetch API keys:', error)
    }
  }

  const fetchAgents = async () => {
    try {
      // This would need to be a public endpoint or use Supabase client
      // For now, we'll use hardcoded agents
      setAgents([
        { id: 'sonny', name: 'Sonny Smith', emoji: '🍆' },
        { id: 'jarvis', name: 'Jarvis', emoji: '🧠' },
        { id: 'system', name: 'System', emoji: '⚙️' }
      ])
    } catch (error) {
      console.error('Failed to fetch agents:', error)
    }
  }

  useEffect(() => {
    Promise.all([fetchAPIKeys(), fetchAgents()]).finally(() => {
      setIsLoading(false)
    })
  }, [])

  const createAPIKey = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!keyName || !selectedAgent) return

    setIsCreating(true)
    try {
      const response = await fetch('/api/bot/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key_name: keyName,
          agent_id: selectedAgent,
          expires_days: expireDays || null
        })
      })

      const data = await response.json()
      
      if (data.success) {
        setNewKey({
          api_key: data.api_key,
          warning: data.warning
        })
        setKeyName('')
        setSelectedAgent('')
        setExpireDays('')
        setShowCreateForm(false)
        fetchAPIKeys()
      } else {
        alert(data.error || 'Failed to create API key')
      }
    } catch (error) {
      console.error('Failed to create API key:', error)
      alert('Failed to create API key')
    }
    setIsCreating(false)
  }

  const revokeAPIKey = async (keyId: string, keyName: string) => {
    if (!confirm(`Are you sure you want to revoke the API key "${keyName}"?`)) return

    try {
      const response = await fetch(`/api/bot/keys?id=${keyId}`, {
        method: 'DELETE'
      })

      const data = await response.json()
      
      if (data.success) {
        fetchAPIKeys()
      } else {
        alert(data.error || 'Failed to revoke API key')
      }
    } catch (error) {
      console.error('Failed to revoke API key:', error)
      alert('Failed to revoke API key')
    }
  }

  const timeAgo = (date: string) => {
    const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000)
    if (seconds < 60) return 'just now'
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
    return `${Math.floor(seconds / 86400)}d ago`
  }

  if (isLoading) {
    return (
      <div className="min-h-screen px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-12">
            <div className="text-2xl mb-4">🔑</div>
            <p className="text-[var(--color-text-muted)]">Loading API keys...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen px-4 sm:px-6 lg:px-8 py-8 md:py-12">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <header className="mb-10">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <Link 
                  href="/" 
                  className="text-xs font-mono text-[var(--color-accent)] hover:text-[var(--color-accent-hover)] uppercase tracking-widest"
                >
                  ← Dashboard
                </Link>
              </div>
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-[var(--color-text-primary)]">
                API Key Management
              </h1>
              <p className="mt-2 text-[var(--color-text-secondary)] text-base">
                Secure bot access to the task dashboard.
              </p>
            </div>
            <button
              onClick={() => setShowCreateForm(true)}
              className="bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white font-medium py-2 px-4 rounded-lg transition-all duration-200"
            >
              Create API Key
            </button>
          </div>
        </header>

        {/* New API Key Display */}
        {newKey && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-6 mb-8">
            <h3 className="text-lg font-semibold text-emerald-400 mb-3">
              API Key Created Successfully
            </h3>
            <div className="bg-black/50 border border-emerald-500/20 rounded-lg p-4 mb-4">
              <p className="text-xs text-emerald-300 mb-2">API Key (copy and store securely):</p>
              <code className="text-emerald-400 font-mono text-sm break-all">
                {newKey.api_key}
              </code>
            </div>
            <p className="text-sm text-emerald-300">{newKey.warning}</p>
            <button
              onClick={() => setNewKey(null)}
              className="mt-4 text-xs text-emerald-400 hover:text-emerald-300"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Create Form */}
        {showCreateForm && (
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-6 mb-8">
            <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4">
              Create New API Key
            </h3>
            <form onSubmit={createAPIKey} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1.5">
                    Key Name
                  </label>
                  <input
                    type="text"
                    value={keyName}
                    onChange={(e) => setKeyName(e.target.value)}
                    placeholder="e.g., Sonny Production Key"
                    className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg px-4 py-3 text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1.5">
                    Agent
                  </label>
                  <select
                    value={selectedAgent}
                    onChange={(e) => setSelectedAgent(e.target.value)}
                    className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg px-4 py-3 text-[var(--color-text-primary)]"
                    required
                  >
                    <option value="">Select Agent</option>
                    {agents.map((agent) => (
                      <option key={agent.id} value={agent.id}>
                        {agent.emoji} {agent.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1.5">
                  Expires After (days, optional)
                </label>
                <input
                  type="number"
                  value={expireDays}
                  onChange={(e) => setExpireDays(e.target.value ? parseInt(e.target.value) : '')}
                  placeholder="Leave empty for no expiration"
                  className="w-full md:w-48 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg px-4 py-3 text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)]"
                  min="1"
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={isCreating}
                  className="bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white font-medium py-2 px-4 rounded-lg transition-all duration-200 disabled:opacity-50"
                >
                  {isCreating ? 'Creating...' : 'Create Key'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] py-2 px-4"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* API Keys List */}
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-[var(--color-border)]">
            <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">
              Active API Keys ({apiKeys.filter(k => k.is_active).length})
            </h2>
          </div>
          
          {apiKeys.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-4xl mb-4 opacity-40">🔑</div>
              <p className="text-[var(--color-text-muted)] text-sm">
                No API keys created yet. Create one to enable bot access.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-[var(--color-border)]">
              {apiKeys.map((key) => (
                <div key={key.id} className={`px-6 py-5 ${!key.is_active ? 'opacity-60' : ''}`}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-medium text-[var(--color-text-primary)]">
                          {key.key_name}
                        </h3>
                        <div className="flex items-center gap-2 px-2 py-1 bg-[var(--color-bg)] rounded text-xs">
                          <span>{key.agents.emoji}</span>
                          <span className="text-[var(--color-text-secondary)]">{key.agents.name}</span>
                        </div>
                        {!key.is_active && (
                          <span className="text-xs text-red-400 bg-red-500/10 px-2 py-1 rounded">
                            Revoked
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-[var(--color-text-muted)] space-y-1">
                        <p>Created {timeAgo(key.created_at)}</p>
                        {key.last_used_at && (
                          <p>Last used {timeAgo(key.last_used_at)}</p>
                        )}
                        {key.expires_at && (
                          <p>Expires {new Date(key.expires_at).toLocaleDateString()}</p>
                        )}
                      </div>
                    </div>
                    {key.is_active && (
                      <button
                        onClick={() => revokeAPIKey(key.id, key.key_name)}
                        className="text-red-400 hover:text-red-300 text-sm py-1 px-3 rounded transition-colors"
                      >
                        Revoke
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Usage Instructions */}
        <div className="mt-8 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl p-6">
          <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4">
            Usage Instructions
          </h3>
          <div className="space-y-4 text-sm">
            <div>
              <h4 className="font-medium text-[var(--color-text-secondary)] mb-2">For Bots:</h4>
              <pre className="bg-black/50 border border-[var(--color-border)] rounded-lg p-3 text-xs overflow-x-auto">
{`// Initialize secure tracking
import { initializeSonnyTracking, logTaskStarted, logProgress, logTaskComplete } from '@/lib/secure-agent-integration'

// Set up your API key
initializeSonnyTracking('ak_your_api_key_here')

// Track tasks
await logTaskStarted('Deploy new feature', ['Build', 'Test', 'Deploy'])
await logProgress('Building application...')
await logTaskComplete('Deployment successful')`}
              </pre>
            </div>
            <div>
              <h4 className="font-medium text-[var(--color-text-secondary)] mb-2">API Endpoints:</h4>
              <ul className="space-y-1 text-[var(--color-text-muted)]">
                <li><code>POST /api/bot/tasks</code> - Create new task</li>
                <li><code>PUT /api/bot/tasks</code> - Update task progress</li>
                <li>Header: <code>X-API-Key: ak_your_key</code></li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}