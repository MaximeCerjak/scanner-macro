import { NavLink } from 'react-router-dom'
import { useUiStore } from '../../stores/uiStore'

// ─── Icônes SVG inline ────────────────────────────────────────────────────────

function IconSessions() {
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="1" y="1" width="11" height="11" rx="1.5" />
      <line x1="1" y1="5.5" x2="12" y2="5.5" />
      <line x1="5.5" y1="5.5" x2="5.5" y2="12" />
    </svg>
  )
}

function IconSpecimens() {
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="6.5" cy="6.5" r="5" />
      <circle cx="6.5" cy="6.5" r="2" />
    </svg>
  )
}

function IconPresets() {
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.5">
      <line x1="2" y1="3.5" x2="11" y2="3.5" />
      <line x1="2" y1="6.5" x2="11" y2="6.5" />
      <line x1="2" y1="9.5" x2="7" y2="9.5" />
    </svg>
  )
}

function IconQueue() {
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="2" y="4" width="9" height="6.5" rx="1" />
      <path d="M4.5 4V3a2 2 0 014 0v1" />
    </svg>
  )
}

function IconExports() {
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M6.5 1.5v7M4 7l2.5 2.5L9 7" />
      <line x1="1.5" y1="11.5" x2="11.5" y2="11.5" />
    </svg>
  )
}

function IconCrosshair() {
  return (
    <svg width="20" height="20" viewBox="0 0 48 48" fill="none" stroke="var(--ac)" strokeWidth="2">
      <circle cx="24" cy="24" r="18" />
      <circle cx="24" cy="24" r="7" />
      <circle cx="24" cy="24" r="1.8" fill="var(--ac)" stroke="none" />
      <line x1="24" y1="4" x2="24" y2="15" />
      <line x1="24" y1="33" x2="24" y2="44" />
      <line x1="4" y1="24" x2="15" y2="24" />
      <line x1="33" y1="24" x2="44" y2="24" />
    </svg>
  )
}

function IconSun() {
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="6.5" cy="6.5" r="2.5" />
      <line x1="6.5" y1="1" x2="6.5" y2="2.5" />
      <line x1="6.5" y1="10.5" x2="6.5" y2="12" />
      <line x1="1" y1="6.5" x2="2.5" y2="6.5" />
      <line x1="10.5" y1="6.5" x2="12" y2="6.5" />
    </svg>
  )
}

// ─── Nav items ────────────────────────────────────────────────────────────────

const NAV_ITEMS = [
  { to: '/sessions',  label: 'Sessions',  Icon: IconSessions  },
  { to: '/specimens', label: 'Spécimens', Icon: IconSpecimens },
  { to: '/presets',   label: 'Presets',   Icon: IconPresets   },
  { to: '/queue',     label: 'Queue',     Icon: IconQueue     },
  { to: '/exports',   label: 'Exports',   Icon: IconExports   },
] as const

// ─── Composant ────────────────────────────────────────────────────────────────

export function TopBar() {
  const { darkMode, toggleDarkMode, daemonStatus } = useUiStore()

  return (
    <header style={{
      background: 'var(--bg-1)',
      borderBottom: '1px solid var(--border)',
      display: 'flex',
      alignItems: 'center',
      height: '42px',
      flexShrink: 0,
    }}>
      {/* Logo */}
      <div style={{
        padding: '0 16px',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        gap: '9px',
        borderRight: '1px solid var(--border)',
        flexShrink: 0,
      }}>
        <IconCrosshair />
        <span style={{
          fontSize: '13px',
          fontWeight: 500,
          color: 'var(--tx-0)',
          letterSpacing: '-0.01em',
        }}>
          Scanner macro
        </span>
      </div>

      {/* Navigation */}
      <nav style={{ display: 'flex', height: '100%' }}>
        {NAV_ITEMS.map(({ to, label, Icon }) => (
          <NavLink
            key={to}
            to={to}
            style={({ isActive }) => ({
              padding: '0 13px',
              fontSize: '12px',
              color: isActive ? 'var(--ac)' : 'var(--tx-2)',
              background: isActive ? 'var(--ac-bg)' : 'transparent',
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              borderRight: '1px solid var(--border)',
              textDecoration: 'none',
              borderBottom: isActive ? '2px solid var(--ac)' : '2px solid transparent',
              transition: 'color 0.1s, background 0.1s',
            })}
          >
            <Icon />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Droite — statut + mode */}
      <div style={{
        marginLeft: 'auto',
        padding: '0 12px',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
      }}>
        {/* Indicateur Pi5 */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '5px',
          background: daemonStatus.connected ? 'var(--ok-bg)' : 'var(--bg-2)',
          border: `1px solid ${daemonStatus.connected ? 'var(--ok-bd)' : 'var(--border)'}`,
          borderRadius: 'var(--radius-md)',
          padding: '3px 8px',
          transition: 'all 0.2s',
        }}>
          <div style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            background: daemonStatus.connected ? 'var(--ok)' : 'var(--tx-2)',
            flexShrink: 0,
          }} />
          <span style={{
            fontSize: '11px',
            color: daemonStatus.connected ? 'var(--ok)' : 'var(--tx-2)',
          }}>
            {daemonStatus.connected
              ? `Pi5 · ${daemonStatus.cameraModel}`
              : 'Pi5 déconnecté'}
          </span>
        </div>

        {/* Toggle dark mode */}
        <button
          onClick={toggleDarkMode}
          title={darkMode ? 'Passer en mode clair' : 'Passer en mode sombre'}
          style={{
            background: 'var(--bg-2)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--tx-1)',
            padding: '4px 9px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            fontSize: '11px',
          }}
        >
          <IconSun />
          {darkMode ? 'Light' : 'Dark'}
        </button>
      </div>
    </header>
  )
}