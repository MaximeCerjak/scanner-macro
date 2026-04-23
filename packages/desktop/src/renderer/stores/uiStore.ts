import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// ─── Types ────────────────────────────────────────────────────────────────────

export type DaemonStatus =
  | { connected: false }
  | { connected: true; cameraModel: string; piTemperature?: number }

interface UiState {
  // Mode d'affichage — persisté dans localStorage
  darkMode: boolean
  toggleDarkMode: () => void

  // Statut connexion Pi5 — mis à jour par le WebSocket
  daemonStatus: DaemonStatus
  setDaemonStatus: (status: DaemonStatus) => void

  // Session active — pour navigation SessionDetail
  activeSessionId: string | null
  setActiveSessionId: (id: string | null) => void
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      // Dark mode — light par défaut (direction B design system)
      darkMode: false,
      toggleDarkMode: () =>
        set((state) => {
          const next = !state.darkMode
          // Appliquer immédiatement la classe sur <html>
          if (next) {
            document.documentElement.classList.add('dark')
          } else {
            document.documentElement.classList.remove('dark')
          }
          return { darkMode: next }
        }),

      // Daemon — déconnecté par défaut
      daemonStatus: { connected: false },
      setDaemonStatus: (status) => set({ daemonStatus: status }),

      // Session active
      activeSessionId: null,
      setActiveSessionId: (id) => set({ activeSessionId: id }),
    }),
    {
      name: 'scanner-ui-store',
      // Ne persister que le dark mode — le reste est éphémère
      partialize: (state) => ({ darkMode: state.darkMode }),
      // Réappliquer la classe dark au rechargement
      onRehydrateStorage: () => (state) => {
        if (state?.darkMode) {
          document.documentElement.classList.add('dark')
        }
      },
    }
  )
)