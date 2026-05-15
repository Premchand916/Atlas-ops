import { useAuth } from '../contexts/AuthContext'

const AGENTS = [
  {
    role: 'Chief of Staff',
    blurb: 'Onboards you, remembers everything, routes work to the right specialist.',
    tools: 'Firestore profile',
  },
  {
    role: 'CTO',
    blurb: 'Ships code, reviews PRs, manages your GitHub repo end-to-end.',
    tools: 'GitHub MCP · 26 tools',
  },
  {
    role: 'CMO',
    blurb: 'Researches markets, writes copy, plans launches with live search.',
    tools: 'Google Search',
  },
  {
    role: 'CFO',
    blurb: 'Runway, MRR, unit economics, break-even — and live Stripe data.',
    tools: 'Stripe MCP · 5 calculators',
  },
  {
    role: 'COO',
    blurb: 'Tracks every task, status, and deadline across the company.',
    tools: 'Firestore task CRUD',
  },
  {
    role: 'Research',
    blurb: 'Deep dives on competitors, customers, and market signals on demand.',
    tools: 'Google Search',
  },
]

export default function Login() {
  const { authError, signIn } = useAuth()

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Nav */}
      <header className="px-6 py-5 flex items-center justify-between max-w-6xl mx-auto">
        <span className="font-bold text-xl tracking-tight">ATLAS</span>
        <button
          onClick={signIn}
          className="bg-white text-black px-4 py-2 rounded-lg text-sm font-semibold hover:bg-gray-100 transition"
        >
          Sign in
        </button>
      </header>

      {/* Hero */}
      <section className="px-6 py-20 max-w-4xl mx-auto text-center">
        <p className="text-green-400 text-xs uppercase tracking-widest mb-6">
          For solo founders
        </p>
        <h1 className="text-5xl md:text-7xl font-bold tracking-tight leading-[1.05] mb-6">
          You're the CEO.
          <br />
          <span className="text-gray-500">Everything below you is AI.</span>
        </h1>
        <p className="text-gray-400 text-lg md:text-xl max-w-2xl mx-auto mb-10">
          Six AI specialists — Chief of Staff, CTO, CMO, CFO, COO, Research —
          working for you 24/7. No hiring. No equity. No drama.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
          <button
            onClick={signIn}
            className="bg-white text-black px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition w-full sm:w-auto"
          >
            Sign in with Google
          </button>
          <span className="text-gray-600 text-sm">$49/month · cancel anytime</span>
        </div>
        {authError && (
          <p className="mt-4 text-sm text-red-300" role="alert">
            {authError}
          </p>
        )}
      </section>

      {/* Agents */}
      <section className="px-6 py-16 max-w-6xl mx-auto">
        <h2 className="text-3xl font-bold mb-2">Your team, on day one.</h2>
        <p className="text-gray-500 mb-10">
          Each agent has the tools they need to actually do the work — not just talk about it.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {AGENTS.map(a => (
            <div
              key={a.role}
              className="border border-gray-800 rounded-xl p-5 hover:border-gray-700 transition"
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-white">{a.role}</h3>
                <span className="text-[10px] text-gray-600 uppercase tracking-wider">
                  {a.tools}
                </span>
              </div>
              <p className="text-sm text-gray-400 leading-relaxed">{a.blurb}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section className="px-6 py-20 max-w-3xl mx-auto text-center">
        <h2 className="text-3xl font-bold mb-4">One price. One team.</h2>
        <div className="border border-gray-800 rounded-2xl p-10 mt-8">
          <div className="text-6xl font-bold mb-2">$49</div>
          <div className="text-gray-500 mb-8">per month</div>
          <ul className="text-sm text-gray-400 space-y-2 mb-8 max-w-sm mx-auto text-left">
            <li>· All six specialists, always on</li>
            <li>· Live GitHub + Stripe integrations</li>
            <li>· Persistent memory across sessions</li>
            <li>· Morning brief, daily</li>
            <li>· Cancel anytime</li>
          </ul>
          <button
            onClick={signIn}
            className="bg-white text-black px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition"
          >
            Start with Google
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-6 py-10 border-t border-gray-900 text-center text-xs text-gray-600">
        ATLAS · auxteam.in · You're the CEO. Everything below you is AI.
      </footer>
    </div>
  )
}
