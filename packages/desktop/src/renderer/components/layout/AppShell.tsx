import { Outlet } from 'react-router-dom'
import { TopBar } from './TopBar'
import { Sidebar } from './Sidebar'
import { useWebSocket } from '../../hooks/useWebSocket'

/**
 * Shell de l'application.
 *
 * Responsabilités :
 * - Initialiser la connexion WebSocket (une seule fois, au niveau racine)
 * - Composer le layout global : TopBar + Sidebar + zone principale
 * - Laisser React Router afficher la page active via <Outlet />
 *
 * Structure :
 *   ┌─────────────────────────── TopBar (42px) ───────────────────────────┐
 *   │ Logo │ Sessions │ Spécimens │ Presets │ Queue │ Exports │ Pi5 │ Mode │
 *   ├──────┬──────────────────────────────────────────────────────────────┤
 *   │      │                                                              │
 *   │ Side │                    <Outlet />                                │
 *   │ bar  │                 (page active)                                │
 *   │ 52px │                                                              │
 *   └──────┴──────────────────────────────────────────────────────────────┘
 */

export function AppShell() {
  // Initialise le WebSocket au niveau du shell — une seule connexion pour toute l'app
  useWebSocket()

  return (
    <div style={{
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      background: 'var(--bg-0)',
    }}>
      <TopBar />

      <div style={{
        display: 'flex',
        flex: 1,
        overflow: 'hidden',
      }}>
        <Sidebar />

        <main style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          minWidth: 0,
        }}>
          <Outlet />
        </main>
      </div>
    </div>
  )
}