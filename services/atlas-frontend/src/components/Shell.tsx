import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { AGENTS } from '../lib/agents'

export default function Shell() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const firstName = user?.displayName?.split(' ')[0] || 'Founder'
  const initials =
    (user?.displayName || user?.email || 'F')
      .split(' ')
      .map(p => p[0])
      .slice(0, 2)
      .join('')
      .toUpperCase()

  const handleSignOut = async () => {
    await signOut()
    navigate('/')
  }

  const linkBase =
    'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition'
  const linkInactive =
    'text-[var(--color-ink-soft)] hover:bg-[var(--color-canvas-2)] hover:text-[var(--color-ink)]'
  const linkActive =
    'bg-[var(--color-canvas-2)] text-[var(--color-ink)] font-medium'

  return (
    <div className="min-h-screen flex bg-[var(--color-canvas)] text-[var(--color-ink)]">
      {/* Sidebar */}
      <aside className="hidden md:flex w-64 flex-col border-r border-[var(--color-line)] bg-[var(--color-canvas)] sticky top-0 h-screen">
        <div className="px-5 py-5 flex items-center gap-2 border-b border-[var(--color-line)]">
          <div className="w-7 h-7 rounded-md bg-[var(--color-claude)] flex items-center justify-center">
            <span className="text-[var(--color-canvas)] font-serif text-sm">A</span>
          </div>
          <span className="font-serif text-lg tracking-tight">Atlas</span>
        </div>

        <nav className="flex-1 overflow-y-auto p-3 space-y-6">
          <div>
            <p className="px-3 text-[10px] uppercase tracking-[0.16em] text-[var(--color-ink-muted)] mb-2 font-medium">
              Overview
            </p>
            <NavLink
              to="/dashboard"
              className={({ isActive }) =>
                `${linkBase} ${isActive ? linkActive : linkInactive}`
              }
            >
              <IconHome />
              Dashboard
            </NavLink>
          </div>

          <div>
            <p className="px-3 text-[10px] uppercase tracking-[0.16em] text-[var(--color-ink-muted)] mb-2 font-medium">
              Your team
            </p>
            <div className="space-y-1">
              {AGENTS.map(a => (
                <NavLink
                  key={a.slug}
                  to={`/chat/${a.slug}`}
                  className={({ isActive }) =>
                    `${linkBase} ${isActive ? linkActive : linkInactive}`
                  }
                >
                  <span
                    className="w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-medium text-white flex-shrink-0"
                    style={{ backgroundColor: a.accent }}
                  >
                    {a.short}
                  </span>
                  <span className="truncate">{a.role}</span>
                </NavLink>
              ))}
            </div>
          </div>
        </nav>

        <div className="border-t border-[var(--color-line)] p-3">
          <div className="flex items-center gap-3 px-2 py-2">
            {user?.photoURL ? (
              <img
                src={user.photoURL}
                alt=""
                className="w-8 h-8 rounded-full"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-[var(--color-canvas-2)] border border-[var(--color-line)] flex items-center justify-center text-xs font-medium text-[var(--color-ink-soft)]">
                {initials}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{firstName}</p>
              <p className="text-xs text-[var(--color-ink-muted)] truncate">
                {user?.email}
              </p>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            className="w-full text-left px-3 py-2 rounded-lg text-sm text-[var(--color-ink-soft)] hover:bg-[var(--color-canvas-2)] hover:text-[var(--color-ink)] transition"
          >
            Sign out
          </button>
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-20 bg-[var(--color-canvas)]/95 backdrop-blur border-b border-[var(--color-line)]">
        <div className="px-4 py-3 flex items-center justify-between">
          <NavLink to="/dashboard" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-[var(--color-claude)] flex items-center justify-center">
              <span className="text-[var(--color-canvas)] font-serif text-sm">A</span>
            </div>
            <span className="font-serif text-lg tracking-tight">Atlas</span>
          </NavLink>
          <button
            onClick={handleSignOut}
            className="text-xs text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
          >
            Sign out
          </button>
        </div>
        <div className="overflow-x-auto border-t border-[var(--color-line)]">
          <div className="flex gap-1 px-2 py-2 min-w-max">
            <NavLink
              to="/dashboard"
              className={({ isActive }) =>
                `px-3 py-1.5 rounded-full text-xs whitespace-nowrap transition ${
                  isActive
                    ? 'bg-[var(--color-ink)] text-[var(--color-canvas)]'
                    : 'text-[var(--color-ink-soft)] hover:bg-[var(--color-canvas-2)]'
                }`
              }
            >
              Dashboard
            </NavLink>
            {AGENTS.map(a => (
              <NavLink
                key={a.slug}
                to={`/chat/${a.slug}`}
                className={({ isActive }) =>
                  `px-3 py-1.5 rounded-full text-xs whitespace-nowrap transition ${
                    isActive
                      ? 'bg-[var(--color-ink)] text-[var(--color-canvas)]'
                      : 'text-[var(--color-ink-soft)] hover:bg-[var(--color-canvas-2)]'
                  }`
                }
              >
                {a.role}
              </NavLink>
            ))}
          </div>
        </div>
      </div>

      {/* Main */}
      <main className="flex-1 min-w-0 pt-[104px] md:pt-0">
        <Outlet />
      </main>
    </div>
  )
}

function IconHome() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M3 9.5L10 4l7 5.5V16a1 1 0 01-1 1h-3v-5H7v5H4a1 1 0 01-1-1V9.5z" />
    </svg>
  )
}
