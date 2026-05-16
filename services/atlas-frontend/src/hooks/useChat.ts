import { useCallback, useRef, useState } from 'react'
import { auth } from '../lib/firebase'

interface Message {
  role: 'user' | 'assistant'
  content: string
  streaming?: boolean
}

const BACKEND = import.meta.env.VITE_BACKEND_URL || 'http://127.0.0.1:8002'

const STEP_TIMEOUT_MS = 120_000

const STEP_LABELS: Record<string, string> = {
  task_brief: 'Reading your tasks',
  market_brief: 'Searching the market',
  brief_synthesizer: 'Synthesizing your brief',
  chief_of_staff: 'Thinking',
  cto: 'Checking your repo',
  cmo: 'Researching',
  cfo: 'Crunching numbers',
  coo: 'Looking up tasks',
  research: 'Searching',
}

function labelFor(step: string | null): string | null {
  if (!step) return null
  return STEP_LABELS[step] || 'Working on it'
}

export function useChat(endpoint: string, sessionId: string) {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const reset = useCallback(() => {
    abortRef.current?.abort()
    abortRef.current = null
    setMessages([])
    setProgress(null)
    setLoading(false)
  }, [])

  const cancel = useCallback(() => {
    abortRef.current?.abort()
    abortRef.current = null
  }, [])

  const sendMessage = async (text: string) => {
    if (loading) return

    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setMessages(prev => [
      ...prev,
      { role: 'user', content: text },
      { role: 'assistant', content: '', streaming: true },
    ])
    setLoading(true)
    setProgress('Thinking')

    let watchdog: ReturnType<typeof setTimeout> | null = null
    const armWatchdog = () => {
      if (watchdog) clearTimeout(watchdog)
      watchdog = setTimeout(() => controller.abort(), STEP_TIMEOUT_MS)
    }
    armWatchdog()

    try {
      const user = auth.currentUser
      if (!user) throw new Error('Not signed in')
      const idToken = await user.getIdToken()

      const response = await fetch(`${BACKEND}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ message: text, session_id: sessionId }),
        signal: controller.signal,
      })

      if (!response.ok) {
        throw new Error(`Backend ${response.status}`)
      }

      const reader = response.body!.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        armWatchdog()
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          try {
            const data = JSON.parse(line.slice(6))

            if (data.error) {
              throw new Error(data.error)
            }

            if (data.type === 'step') {
              if (data.status === 'running') {
                setProgress(labelFor(data.step))
              }
              continue
            }

            if (data.response) {
              setProgress(null)
              setMessages(prev => {
                const updated = [...prev]
                updated[updated.length - 1] = {
                  role: 'assistant',
                  content: data.response,
                  streaming: false,
                }
                return updated
              })
            }
          } catch (parseErr) {
            if (parseErr instanceof Error && parseErr.message.includes('Backend')) {
              throw parseErr
            }
          }
        }
      }
    } catch (err) {
      const aborted = (err as { name?: string })?.name === 'AbortError'
      const detail = aborted
        ? 'This took too long and was cancelled. The morning brief runs three steps and can be slow — try again.'
        : err instanceof Error
          ? err.message
          : 'Unknown error'
      console.error('[atlas:chat]', err)
      setMessages(prev => {
        const updated = [...prev]
        const last = updated[updated.length - 1]
        if (last && last.role === 'assistant' && !last.content) {
          updated[updated.length - 1] = {
            role: 'assistant',
            content: aborted
              ? detail
              : `Chat failed: ${detail}. Verify ${BACKEND}/health responds and you're signed in.`,
            streaming: false,
          }
        }
        return updated
      })
    } finally {
      if (watchdog) clearTimeout(watchdog)
      setLoading(false)
      setProgress(null)
      abortRef.current = null
    }
  }

  return { messages, loading, progress, sendMessage, reset, cancel }
}
