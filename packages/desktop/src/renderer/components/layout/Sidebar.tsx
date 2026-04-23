import { NavLink } from 'react-router-dom'

// ─── Icônes ───────────────────────────────────────────────────────────────────

function IconSessions() {
  return (
    <svg width="17" height="17" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="1.5" y="1.5" width="13" height="13" rx="2" />
      <line x1="1.5" y1="7" x2="14.5" y2="7" />
      <line x1="7" y1="7" x2="7" y2="14.5" />
    </svg>
  )
}

function IconSpecimens() {
  return (
    <svg width="17" height="17" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="8" cy="8" r="5.5" />
      <circle cx="8" cy="8" r="2.5" />
    </svg>
  )
}

function IconPresets() {
  return (
    <svg width="17" height="17" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <line x1="3" y1="4" x2="13" y2="4" />
      <line x1="3" y1="8" x2="13" y2="8" />
      <line x1="3" y1="12" x2="8" y2="12" />
    </svg>
  )
}

function IconQueue() {
  return (
    <svg width="17" height="17" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="2" y="5" width="12" height="8" rx="1.5" />
      <path d="M5.5 5V4a2.5 2.5 0 015 0v1" />
    </svg>
  )
}

function IconExports() {
  return (
    <svg width="17" height="17" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M8 2v7M5.5 7L8 9.5 10.5 7" />
      <line x1="2.5" y1="13.5" x2="13.5" y2="13.5" />
    </svg>
  )
}

function IconProfile() {
  return (
    <svg width="17" height="17" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="8" cy="5.5" r="2.5" />
      <path d="M2.5 13.5a5.5 5.5 0 0111 0" />
    </svg>
  )
}

// ─── Items nav ────────────────────────────────────────────────────────────────

const NAV_ITEMS = [
  { to: '/sessions',  Icon: IconSessions,  label: 'Sessions'  },
  { to: '/specimens', Icon: IconSpecimens, label: 'Spécimens' },
  { to: '/presets',   Icon: IconPresets,   label: 'Presets'   },
  { to: '/queue',     Icon: IconQueue,     label: 'Queue'     },
  { to: '/exports',   Icon: IconExports,   label: 'Exports'   },
] as const

// ─── Composant ────────────────────────────────────────────────────────────────

export function Sidebar() {
  return (
    <aside style={{
      width: '52px',
      background: 'var(--bg-1)',
      borderRight: '1px solid var(--border)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '10px 0',
      gap: '2px',
      flexShrink: 0,
    }}>
      {NAV_ITEMS.map(({ to, Icon, label }) => (
        <NavLink
          key={to}
          to={to}
          title={label}
          style={({ isActive }) => ({
            width: '36px',
            height: '36px',
            borderRadius: 'var(--radius-lg)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: isActive ? 'var(--ac-bg)' : 'transparent',
            color: isActive ? 'var(--ac)' : 'var(--tx-2)',
            textDecoration: 'none',
            transition: 'background 0.1s, color 0.1s',
          })}
        >
          <Icon />
        </NavLink>
      ))}

      {/* Profil — en bas */}
      <div style={{ marginTop: 'auto' }}>
        <NavLink
          to="/profile"
          title="Profil"
          style={({ isActive }) => ({
            width: '36px',
            height: '36px',
            borderRadius: 'var(--radius-lg)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: isActive ? 'var(--ac-bg)' : 'transparent',
            color: isActive ? 'var(--ac)' : 'var(--tx-2)',
            textDecoration: 'none',
            transition: 'background 0.1s, color 0.1s',
          })}
        >
          <IconProfile />
        </NavLink>
      </div>
    </aside>
  )
}