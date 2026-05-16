import { useRef, useEffect, useState } from 'react'
import { Navigate, useParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useChat } from '../hooks/useChat'
import { agentBySlug } from '../lib/agents'

const SUGGESTIONS: Record<string, string[]> = {
  cos: [
    'Help me onboard my startup',
    'What should I focus on this week?',
    'Draft my one-line pitch',
    'Recap what we know about my company',
  ],
  cto: [
    'Review my latest PRs',
    'List open issues in my repo',
    'Suggest a refactor for the auth flow',
    'What broke in CI today?',
  ],
  cmo: [
    'Draft a launch tweet',
    'Research competitors in my space',
    'Plan a 5-day launch campaign',
    'Write a cold outreach email',
  ],
  cfo: [
    'Calculate my runway',
    'Project MRR for 12 months',
    'Help me model unit economics',
    'When do I hit break-even?',
  ],
  coo: [
    'List my open tasks',
    'Create a task: ship landing page',
    'Mark all bug-fixes as done',
    'What\'s overdue?',
  ],
  research: [
    'Deep dive on my top 3 competitors',
    'Find recent funding in my space',
    'Map the customer journey for SaaS',
    'Summarize the latest AI agent papers',
  ],
  'morning-brief': [
    'Give me today\'s brief',
    'What\'s the most important thing today?',
    'Any urgent signals I should know about?',
  ],
}

export default function Chat() {
  const { agent: slug } = useParams<{ agent: string }>()
  const agent = agentBySlug(slug)
  const { user } = useAuth()
  const startupId = user?.uid || 'default'
  const sessionId = agent ? `${startupId}_${agent.slug}` : ''
  const { messages, loading, progress, sendMessage, reset } = useChat(
    agent?.endpoint || '',
    sessionId,
  )
  const [input, setInput] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    reset()
    setInput('')
  }, [slug, reset])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    const ta = textareaRef.current
    if (!ta) return
    ta.style.height = '0px'
    ta.style.height = Math.min(ta.scrollHeight, 220) + 'px'
  }, [input])

  if (!agent) {
    return <Navigate to="/dashboard" replace />
  }

  const handleSend = async (text?: string) => {
    const msg = (text ?? input).trim()
    if (!msg || loading) return
    setInput('')
    await sendMessage(msg)
  }

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const firstName = user?.displayName?.split(' ')[0] || 'there'
  const suggestions = SUGGESTIONS[agent.slug] || []

  return (
    <div className="h-screen md:h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-[var(--color-line)] bg-[var(--color-canvas)]/85 backdrop-blur sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center gap-3">
          <span
            className="w-8 h-8 rounded-md flex items-center justify-center text-[11px] font-medium text-white flex-shrink-0"
            style={{ backgroundColor: agent.accent }}
          >
            {agent.short}
          </span>
          <div className="flex-1 min-w-0">
            <p className="font-serif text-lg tracking-tight leading-tight">
              {agent.role}
            </p>
            <p className="text-xs text-[var(--color-ink-muted)] truncate">
              {agent.tools}
            </p>
          </div>
        </div>
      </header>

      {/* Messages */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-6 py-8 md:py-10">
          {messages.length === 0 ? (
            <div className="pt-8 pb-6">
              <div className="flex items-center gap-3 mb-6">
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: agent.accent }}
                >
                  <span className="text-white font-medium text-xs">
                    {agent.short}
                  </span>
                </div>
                <div>
                  <p className="font-serif text-2xl tracking-tight">
                    Hi {firstName}.
                  </p>
                  <p className="text-[var(--color-ink-soft)] text-sm mt-1">
                    {agent.blurb}
                  </p>
                </div>
              </div>
              {suggestions.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-8">
                  {suggestions.map(s => (
                    <button
                      key={s}
                      onClick={() => handleSend(s)}
                      className="text-left px-4 py-3 rounded-lg border border-[var(--color-line)] bg-[var(--color-canvas)] hover:bg-[var(--color-canvas-2)] hover:border-[var(--color-line-strong)] transition text-sm text-[var(--color-ink-soft)]"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-8">
              {messages.map((msg, i) => {
                const isLast = i === messages.length - 1
                return (
                  <Message
                    key={i}
                    msg={msg}
                    agentRole={agent.role}
                    agentShort={agent.short}
                    accent={agent.accent}
                    progress={isLast ? progress : null}
                  />
                )
              })}
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </main>

      {/* Composer */}
      <div className="border-t border-[var(--color-line)] bg-[var(--color-canvas)]">
        <div className="max-w-3xl mx-auto px-6 py-4">
          <div className="flex items-end gap-2 rounded-2xl border border-[var(--color-line-strong)] bg-[var(--color-canvas)] px-4 py-3 shadow-sm focus-within:border-[var(--color-claude)]/60 transition">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder={agent.placeholder}
              rows={1}
              className="flex-1 bg-transparent text-[var(--color-ink)] text-[15px] resize-none focus:outline-none placeholder:text-[var(--color-ink-muted)] leading-relaxed"
            />
            <button
              onClick={() => handleSend()}
              disabled={loading || !input.trim()}
              className="text-white w-9 h-9 rounded-lg flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed transition flex-shrink-0 hover:opacity-90"
              style={{ backgroundColor: agent.accent }}
              aria-label="Send message"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden
              >
                <path d="M10 3a1 1 0 01.7.29l5 5a1 1 0 11-1.4 1.42L11 6.41V16a1 1 0 11-2 0V6.41L5.7 9.71a1 1 0 11-1.4-1.42l5-5A1 1 0 0110 3z" />
              </svg>
            </button>
          </div>
          <p className="text-[11px] text-[var(--color-ink-muted)] mt-2 text-center">
            Press <kbd className="font-sans">Enter</kbd> to send ·{' '}
            <kbd className="font-sans">Shift + Enter</kbd> for a new line
          </p>
        </div>
      </div>
    </div>
  )
}

function Message({
  msg,
  agentRole,
  agentShort,
  accent,
  progress,
}: {
  msg: { role: 'user' | 'assistant'; content: string; streaming?: boolean }
  agentRole: string
  agentShort: string
  accent: string
  progress: string | null
}) {
  if (msg.role === 'user') {
    return (
      <div className="flex justify-end">
        <div
          className="max-w-[85%] px-4 py-3 rounded-2xl rounded-br-md text-white text-[15px] leading-relaxed whitespace-pre-wrap shadow-sm"
          style={{ backgroundColor: accent }}
        >
          {msg.content}
        </div>
      </div>
    )
  }

  return (
    <div className="flex gap-3">
      <div
        className="w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0 mt-0.5"
        style={{ backgroundColor: accent }}
      >
        <span className="text-white font-medium text-[10px]">{agentShort}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-[var(--color-ink-muted)] mb-1 font-medium">
          {agentRole}
        </p>
        <div className="text-[15px] leading-relaxed text-[var(--color-ink)] whitespace-pre-wrap">
          {msg.content || (
            <span className="inline-flex gap-2 items-center text-[var(--color-ink-muted)]">
              <span className="inline-flex gap-1 items-center">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-ink-muted)] animate-pulse" />
                <span
                  className="w-1.5 h-1.5 rounded-full bg-[var(--color-ink-muted)] animate-pulse"
                  style={{ animationDelay: '150ms' }}
                />
                <span
                  className="w-1.5 h-1.5 rounded-full bg-[var(--color-ink-muted)] animate-pulse"
                  style={{ animationDelay: '300ms' }}
                />
              </span>
              {progress && (
                <span className="text-sm italic">{progress}…</span>
              )}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
