import { useState } from 'react'
import { auth } from '../lib/firebase'

interface Message {
  role: 'user' | 'assistant'
  content: string
  streaming?: boolean
}

const BACKEND = import.meta.env.VITE_BACKEND_URL || 'http://127.0.0.1:8002'

export function useChat(_startupId: string, sessionId: string) {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(false)

  const sendMessage = async (text: string) => {
    setMessages(prev => [...prev, { role: 'user', content: text }])
    setLoading(true)
    setMessages(prev => [...prev, { role: 'assistant', content: '', streaming: true }])

    try {
      const user = auth.currentUser
      if (!user) throw new Error('Not signed in')
      const idToken = await user.getIdToken()

      const response = await fetch(`${BACKEND}/chat/cos`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ message: text, session_id: sessionId }),
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

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          try {
            const data = JSON.parse(line.slice(6))
            if (data.response) {
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
          } catch {}
        }
      }
    } catch (err) {
      console.error('[atlas:chat]', err)
      const detail =
        err instanceof Error ? err.message : 'Unknown error'
      setMessages(prev => {
        const updated = [...prev]
        updated[updated.length - 1] = {
          role: 'assistant',
          content: `Chat failed: ${detail}. Verify ${BACKEND}/health responds and you're signed in.`,
          streaming: false,
        }
        return updated
      })
    } finally {
      setLoading(false)
    }
  }

  return { messages, loading, sendMessage }
}
