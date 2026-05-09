# Session S01 — Frontend
> Load CLAUDE.md first. Then execute this session top to bottom.

**Goal:** Working React frontend — Firebase Auth (Google OAuth) + Chat UI connected to `/chat/cos` SSE backend.  
**Time:** 3-4 hours  
**Done when:** User can open browser, sign in with Google, chat with CoS agent, see streamed responses.

---

## STEP 1 — Scaffold React app

```bash
cd atlas/frontend
npm create vite@latest . -- --template react-ts
npm install
npm install tailwindcss @tailwindcss/vite
npm install firebase
npm install axios
```

Init Tailwind — add to `vite.config.ts`:
```ts
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
})
```

Add to `src/index.css`:
```css
@import "tailwindcss";
```

---

## STEP 2 — Firebase config

Create `src/lib/firebase.ts`:
```ts
import { initializeApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider } from 'firebase/auth'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const googleProvider = new GoogleAuthProvider()
```

Create `.env.local` (never commit):
```
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_BACKEND_URL=http://localhost:8000
```

---

## STEP 3 — Auth context

Create `src/contexts/AuthContext.tsx`:
```tsx
import { createContext, useContext, useEffect, useState } from 'react'
import { User, onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth'
import { auth, googleProvider } from '../lib/firebase'

interface AuthContextType {
  user: User | null
  loading: boolean
  signIn: () => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u)
      setLoading(false)
    })
    return unsub
  }, [])

  const signIn = async () => {
    await signInWithPopup(auth, googleProvider)
  }

  const signOutUser = async () => {
    await signOut(auth)
  }

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signOut: signOutUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
```

---

## STEP 4 — Chat hook (SSE)

Create `src/hooks/useChat.ts`:
```ts
import { useState, useRef } from 'react'

interface Message {
  role: 'user' | 'assistant'
  content: string
  streaming?: boolean
}

const BACKEND = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000'

export function useChat(startupId: string, sessionId: string) {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(false)

  const sendMessage = async (text: string) => {
    // Add user message
    setMessages(prev => [...prev, { role: 'user', content: text }])
    setLoading(true)

    // Add empty assistant message for streaming
    setMessages(prev => [...prev, { role: 'assistant', content: '', streaming: true }])

    try {
      const response = await fetch(`${BACKEND}/chat/cos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, startup_id: startupId, session_id: sessionId }),
      })

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
      console.error('Chat error:', err)
    } finally {
      setLoading(false)
    }
  }

  return { messages, loading, sendMessage }
}
```

---

## STEP 5 — Pages

Create `src/pages/Login.tsx`:
```tsx
import { useAuth } from '../contexts/AuthContext'

export default function Login() {
  const { signIn } = useAuth()

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-8">
      <div className="text-center">
        <h1 className="text-5xl font-bold text-white mb-2">ATLAS</h1>
        <p className="text-gray-400 text-lg">You're the CEO. Everything below you is AI.</p>
      </div>
      <button
        onClick={signIn}
        className="bg-white text-black px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition"
      >
        Sign in with Google
      </button>
      <p className="text-gray-600 text-sm">$49/month · 6 AI specialists · No hiring required</p>
    </div>
  )
}
```

Create `src/pages/Chat.tsx`:
```tsx
import { useState, useRef, useEffect } from 'react'
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
      {/* Header */}
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

      {/* Messages */}
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
              className={`max-w-2xl px-4 py-3 rounded-2xl text-sm leading-relaxed ${
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

      {/* Input */}
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
```

---

## STEP 6 — App router

Replace `src/App.tsx`:
```tsx
import { AuthProvider, useAuth } from './contexts/AuthContext'
import Login from './pages/Login'
import Chat from './pages/Chat'

function AppInner() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-gray-600 text-sm">Loading...</div>
      </div>
    )
  }

  return user ? <Chat /> : <Login />
}

export default function App() {
  return (
    <AuthProvider>
      <AppInner />
    </AuthProvider>
  )
}
```

---

## STEP 7 — .gitignore additions

Add to `frontend/.gitignore`:
```
.env.local
.env
```

---

## STEP 8 — Run + verify

```bash
cd frontend
npm run dev
```

Open http://localhost:5173  
- See ATLAS login page → sign in with Google → redirects to chat  
- Type "hello" → see CoS response stream in

**If CORS error:** backend already has CORS middleware set to `allow_origins=["*"]` — should be fine locally.

---

## STEP 9 — Commit when working

```bash
cd atlas  # repo root
git add .
git commit -m "feat(frontend): React + Firebase Auth + CoS SSE chat UI — S01 complete"
git push
```

---

## SESSION COMPLETE WHEN
- [ ] Login page renders
- [ ] Google OAuth works
- [ ] Chat page loads after auth
- [ ] "hello" sends → CoS streams back first question
- [ ] Committed and pushed

**Next session:** S02 — wire Firestore so startup profile persists across restarts.
