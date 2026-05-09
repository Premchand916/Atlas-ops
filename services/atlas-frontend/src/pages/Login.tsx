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
