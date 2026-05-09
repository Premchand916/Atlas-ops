import { useRef, useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useChat } from '../hooks/useChat'

export default function Chat() {
  const { user, signOut } = useAuth()
  const startupId = user?.uid || 'default'
  const sessionId = `${startupId}_cos`
  const { messages, loading, sendMessage } = useChat(startupId, sessionId)
  const [input, setInput] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async () => {
    if (!input.trim() || loading) return
    const msg = input.trim()
    setInput('')
    await sendMessage(msg)
  }

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="min-h-screen bg-black flex flex-col">
      <div className="border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <div>
          <span className="text-white font-bold text-xl">ATLAS</span>
          <span className="ml-3 text-xs text-green-400 bg-green-400/10 px-2 py-1 rounded-full">
            Chief of Staff
          </span>
        </div>
        <button onClick={signOut} className="text-gray-500 hover:text-white text-sm transition">
          Sign out
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4 max-w-3xl mx-auto w-full">
        {messages.length === 0 && (
          <div className="text-center py-20">
            <p className="text-gray-500 text-lg">Your Chief of Staff is ready.</p>
            <p className="text-gray-600 text-sm mt-2">Say hello to begin your startup onboarding.</p>
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-2xl px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                msg.role === 'user'
                  ? 'bg-white text-black'
                  : 'bg-gray-900 text-gray-100 border border-gray-800'
              }`}
            >
              {msg.content || (msg.streaming ? <span className="animate-pulse">●</span> : '')}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="border-t border-gray-800 px-6 py-4 max-w-3xl mx-auto w-full">
        <div className="flex gap-3">
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Talk to your Chief of Staff..."
            rows={1}
            className="flex-1 bg-gray-900 border border-gray-700 text-white rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:border-gray-500 placeholder-gray-600"
          />
          <button
            onClick={handleSend}
            disabled={loading || !input.trim()}
            className="bg-white text-black px-5 py-3 rounded-xl font-semibold text-sm hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            Send
          </button>
        </div>
        <p className="text-gray-700 text-xs mt-2 text-center">Enter to send · Shift+Enter for new line</p>
      </div>
    </div>
  )
}
