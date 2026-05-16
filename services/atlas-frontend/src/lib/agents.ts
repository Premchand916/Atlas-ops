export interface AgentDef {
  slug: string
  role: string
  short: string
  blurb: string
  tools: string
  placeholder: string
  endpoint: string
  accent: string
}

export const AGENTS: AgentDef[] = [
  {
    slug: 'cos',
    role: 'Chief of Staff',
    short: 'CoS',
    blurb: 'Onboards you, remembers everything, routes work to the right specialist.',
    tools: 'Firestore profile',
    placeholder: 'Message your Chief of Staff…',
    endpoint: '/chat/cos',
    accent: '#c96442',
  },
  {
    slug: 'cto',
    role: 'CTO',
    short: 'CTO',
    blurb: 'Ships code, reviews PRs, manages your GitHub repo end-to-end.',
    tools: 'GitHub MCP · 26 tools',
    placeholder: 'Ask your CTO about code, PRs, or repo health…',
    endpoint: '/chat/cto',
    accent: '#6b7a8f',
  },
  {
    slug: 'cmo',
    role: 'CMO',
    short: 'CMO',
    blurb: 'Researches markets, writes copy, plans launches with live search.',
    tools: 'Google Search',
    placeholder: 'Brief your CMO on a launch or campaign…',
    endpoint: '/chat/cmo',
    accent: '#a86b8a',
  },
  {
    slug: 'cfo',
    role: 'CFO',
    short: 'CFO',
    blurb: 'Runway, MRR, unit economics, break-even — and live Stripe data.',
    tools: 'Stripe MCP · 5 calculators',
    placeholder: 'Ask your CFO about runway, MRR, or unit economics…',
    endpoint: '/chat/cfo',
    accent: '#5f8a6f',
  },
  {
    slug: 'coo',
    role: 'COO',
    short: 'COO',
    blurb: 'Tracks every task, status, and deadline across the company.',
    tools: 'Firestore task CRUD',
    placeholder: 'Tell your COO what to track or update…',
    endpoint: '/chat/coo',
    accent: '#b88547',
  },
  {
    slug: 'research',
    role: 'Research',
    short: 'RES',
    blurb: 'Deep dives on competitors, customers, and market signals on demand.',
    tools: 'Google Search',
    placeholder: 'Ask Research for a deep dive…',
    endpoint: '/chat/research',
    accent: '#7c6cb0',
  },
  {
    slug: 'morning-brief',
    role: 'Morning Brief',
    short: 'AM',
    blurb: 'Daily synthesis — your tasks + market signals in one read.',
    tools: 'Sequential agent',
    placeholder: 'Ask for today\'s brief…',
    endpoint: '/chat/morning-brief',
    accent: '#c98442',
  },
]

export const agentBySlug = (slug: string | undefined) =>
  AGENTS.find(a => a.slug === slug)
