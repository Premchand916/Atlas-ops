import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useTypewriter } from '../hooks/useTypewriter'
import { AGENTS } from '../lib/agents'

export default function Dashboard() {
  const { user } = useAuth()
  const firstName = user?.displayName?.split(' ')[0] || 'Founder'
  const hour = new Date().getHours()
  const greeting =
    hour < 5 ? 'Burning the midnight oil' : hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'

  const heading = `${greeting}, ${firstName}.`
  const subline = 'Your team is ready. Pick a specialist below, or start with your morning brief.'

  const { displayed: typedHeading, done: headingDone } = useTypewriter(heading, {
    speed: 42,
    startDelay: 180,
  })
  const { displayed: typedSubline, done: sublineDone } = useTypewriter(subline, {
    speed: 18,
    startDelay: headingDone ? 120 : 999_999,
  })

  return (
    <div className="max-w-5xl mx-auto px-6 py-10 md:py-14">
      {/* Hero */}
      <div className="mb-12">
        <p className="text-[var(--color-claude)] text-xs uppercase tracking-[0.18em] font-medium mb-3 opacity-0 animate-[fadeUp_0.45s_ease-out_forwards]">
          Dashboard
        </p>
        <h1 className="font-serif text-4xl md:text-5xl tracking-tight mb-3 min-h-[1.2em]">
          {typedHeading}
          <span
            aria-hidden
            className={`inline-block w-[3px] h-[0.9em] ml-1 align-[-0.1em] bg-[var(--color-claude)] ${
              headingDone && sublineDone ? 'opacity-0' : 'animate-[caret_1s_steps(1)_infinite]'
            }`}
          />
        </h1>
        <p className="text-[var(--color-ink-soft)] text-lg max-w-2xl min-h-[3.5em]">
          {sublineDone ? (
            <>
              Your team is ready. Pick a specialist below, or start with your{' '}
              <Link
                to="/chat/morning-brief"
                className="text-[var(--color-claude)] hover:text-[var(--color-claude-hover)] underline underline-offset-2"
              >
                morning brief
              </Link>
              .
            </>
          ) : (
            typedSubline
          )}
        </p>
      </div>

      {/* Quick actions */}
      <section className="mb-14">
        <h2 className="text-sm font-medium text-[var(--color-ink-soft)] uppercase tracking-[0.14em] mb-4">
          Quick start
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Link
            to="/chat/cos"
            className="group bg-[var(--color-canvas-2)] hover:bg-[var(--color-claude-soft)] border border-[var(--color-line)] rounded-xl p-5 transition"
          >
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-[var(--color-claude)] flex items-center justify-center flex-shrink-0">
                <span className="text-white font-serif">A</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-serif text-lg tracking-tight mb-1 group-hover:text-[var(--color-claude-hover)] transition">
                  Onboard with Chief of Staff
                </p>
                <p className="text-sm text-[var(--color-ink-soft)]">
                  Tell us about your startup. CoS will route work to the right specialist.
                </p>
              </div>
            </div>
          </Link>
          <Link
            to="/chat/morning-brief"
            className="group bg-[var(--color-canvas-2)] hover:bg-[var(--color-claude-soft)] border border-[var(--color-line)] rounded-xl p-5 transition"
          >
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-[#c98442] flex items-center justify-center flex-shrink-0">
                <span className="text-white text-xs font-medium">AM</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-serif text-lg tracking-tight mb-1 group-hover:text-[var(--color-claude-hover)] transition">
                  Get today's brief
                </p>
                <p className="text-sm text-[var(--color-ink-soft)]">
                  Your tasks plus market signals, synthesized in one read.
                </p>
              </div>
            </div>
          </Link>
        </div>
      </section>

      {/* All agents */}
      <section>
        <h2 className="text-sm font-medium text-[var(--color-ink-soft)] uppercase tracking-[0.14em] mb-4">
          Your team
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-[var(--color-line)] rounded-2xl overflow-hidden border border-[var(--color-line)]">
          {AGENTS.filter(a => a.slug !== 'morning-brief').map(a => (
            <Link
              key={a.slug}
              to={`/chat/${a.slug}`}
              className="group bg-[var(--color-canvas)] p-6 hover:bg-[var(--color-canvas-2)] transition"
            >
              <div className="flex items-center gap-2.5 mb-3">
                <span
                  className="w-7 h-7 rounded-md flex items-center justify-center text-[11px] font-medium text-white"
                  style={{ backgroundColor: a.accent }}
                >
                  {a.short}
                </span>
                <h3 className="font-serif text-lg tracking-tight group-hover:text-[var(--color-claude-hover)] transition">
                  {a.role}
                </h3>
              </div>
              <p className="text-[var(--color-ink-soft)] text-sm leading-relaxed mb-4">
                {a.blurb}
              </p>
              <p className="text-[10px] text-[var(--color-ink-muted)] uppercase tracking-[0.14em]">
                {a.tools}
              </p>
            </Link>
          ))}
        </div>
      </section>

      {/* Footer hint */}
      <p className="mt-14 text-xs text-[var(--color-ink-muted)] text-center italic">
        You're the CEO. Everything below you is AI.
      </p>
    </div>
  )
}
