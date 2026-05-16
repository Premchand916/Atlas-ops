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

const FEATURES = [
  'All six specialists, always on',
  'Live GitHub + Stripe integrations',
  'Persistent memory across sessions',
  'Morning brief, every day',
  'Cancel anytime',
]

export default function Login() {
  const { authError, signIn } = useAuth()

  return (
    <div className="min-h-screen bg-[var(--color-canvas)] text-[var(--color-ink)]">
      {/* Nav */}
      <header className="px-6 py-5 border-b border-[var(--color-line)]">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-[var(--color-claude)] flex items-center justify-center">
              <span className="text-[var(--color-canvas)] font-serif text-sm">A</span>
            </div>
            <span className="font-serif text-xl tracking-tight">Atlas</span>
          </div>
          <button
            onClick={signIn}
            className="text-sm font-medium text-[var(--color-ink-soft)] hover:text-[var(--color-ink)] transition"
          >
            Sign in →
          </button>
        </div>
      </header>

      {/* Hero */}
      <section className="px-6 pt-24 pb-20 max-w-4xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--color-claude-soft)] text-[var(--color-claude-hover)] text-xs font-medium mb-8">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-claude)]" />
          For solo founders
        </div>
        <h1 className="font-serif text-5xl md:text-7xl leading-[1.05] tracking-tight mb-6">
          You're the CEO.
          <br />
          <span className="text-[var(--color-ink-muted)] italic">
            Everything below you is AI.
          </span>
        </h1>
        <p className="text-[var(--color-ink-soft)] text-lg md:text-xl leading-relaxed max-w-2xl mb-10">
          Six AI specialists — Chief of Staff, CTO, CMO, CFO, COO, Research — working
          for you around the clock. No hiring. No equity. No drama.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
          <button
            onClick={signIn}
            className="bg-[var(--color-claude)] text-white px-6 py-3 rounded-lg font-medium hover:bg-[var(--color-claude-hover)] transition shadow-sm"
          >
            Continue with Google
          </button>
          <span className="text-[var(--color-ink-muted)] text-sm">
            $49/month · cancel anytime
          </span>
        </div>
        {authError && (
          <div
            className="mt-6 max-w-md px-4 py-3 rounded-lg bg-[var(--color-claude-soft)] border border-[var(--color-claude)]/20 text-sm text-[var(--color-claude-hover)]"
            role="alert"
          >
            {authError}
          </div>
        )}
      </section>

      {/* Divider */}
      <div className="max-w-6xl mx-auto px-6">
        <div className="border-t border-[var(--color-line)]" />
      </div>

      {/* Agents */}
      <section className="px-6 py-24 max-w-6xl mx-auto">
        <div className="max-w-2xl mb-14">
          <p className="text-[var(--color-claude)] text-xs uppercase tracking-[0.18em] font-medium mb-3">
            The team
          </p>
          <h2 className="font-serif text-4xl md:text-5xl tracking-tight mb-4">
            Your team, on day one.
          </h2>
          <p className="text-[var(--color-ink-soft)] text-lg leading-relaxed">
            Each agent has the tools they need to actually do the work — not just
            talk about it.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-[var(--color-line)] rounded-2xl overflow-hidden border border-[var(--color-line)]">
          {AGENTS.map(a => (
            <div
              key={a.role}
              className="bg-[var(--color-canvas)] p-7 hover:bg-[var(--color-canvas-2)] transition"
            >
              <div className="flex items-center gap-2 mb-4">
                <div className="w-2 h-2 rounded-full bg-[var(--color-claude)]" />
                <h3 className="font-serif text-xl tracking-tight">{a.role}</h3>
              </div>
              <p className="text-[var(--color-ink-soft)] text-[15px] leading-relaxed mb-5">
                {a.blurb}
              </p>
              <p className="text-[11px] text-[var(--color-ink-muted)] uppercase tracking-[0.14em]">
                {a.tools}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section className="px-6 py-24 max-w-3xl mx-auto">
        <div className="text-center mb-12">
          <p className="text-[var(--color-claude)] text-xs uppercase tracking-[0.18em] font-medium mb-3">
            Pricing
          </p>
          <h2 className="font-serif text-4xl md:text-5xl tracking-tight">
            One price. One team.
          </h2>
        </div>
        <div className="bg-[var(--color-canvas-2)] border border-[var(--color-line)] rounded-2xl p-10 md:p-12">
          <div className="flex items-baseline gap-2 mb-1">
            <span className="font-serif text-6xl tracking-tight">$49</span>
            <span className="text-[var(--color-ink-muted)] text-lg">/month</span>
          </div>
          <p className="text-[var(--color-ink-soft)] mb-8">
            Everything. No add-ons. No seats. No tiers.
          </p>
          <ul className="space-y-3 mb-10">
            {FEATURES.map(f => (
              <li
                key={f}
                className="flex items-start gap-3 text-[var(--color-ink-soft)]"
              >
                <svg
                  className="w-5 h-5 mt-0.5 text-[var(--color-claude)] flex-shrink-0"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  aria-hidden
                >
                  <path
                    fillRule="evenodd"
                    d="M16.704 5.29a1 1 0 010 1.42l-7.5 7.5a1 1 0 01-1.42 0l-3.5-3.5a1 1 0 011.42-1.42L8.5 12.08l6.79-6.79a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
                <span>{f}</span>
              </li>
            ))}
          </ul>
          <button
            onClick={signIn}
            className="w-full sm:w-auto bg-[var(--color-claude)] text-white px-6 py-3 rounded-lg font-medium hover:bg-[var(--color-claude-hover)] transition shadow-sm"
          >
            Start with Google
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[var(--color-line)]">
        <div className="max-w-6xl mx-auto px-6 py-10 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-[var(--color-ink-muted)] text-sm">
            <div className="w-5 h-5 rounded bg-[var(--color-claude)] flex items-center justify-center">
              <span className="text-[var(--color-canvas)] font-serif text-[10px]">A</span>
            </div>
            <span className="font-serif">Atlas</span>
            <span>·</span>
            <span>auxteam.in</span>
          </div>
          <p className="text-xs text-[var(--color-ink-muted)] italic">
            You're the CEO. Everything below you is AI.
          </p>
        </div>
      </footer>
    </div>
  )
}
