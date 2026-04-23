import { useEffect, useRef, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useUiStore } from '../stores/uiStore'

// ─── Types événements WebSocket ───────────────────────────────────────────────

interface WsEventBase {
  event: string
  timestamp: string
}

interface WsJobStatusChanged extends WsEventBase {
  event: 'job.status_changed'
  job_id: string
  session_id: string
  old_status: string
  new_status: string
}

interface WsSessionStatusChanged extends WsEventBase {
  event: 'session.status_changed'
  session_id: string
  old_status: string
  new_status: string
}

interface WsQaCheckCreated extends WsEventBase {
  event: 'qa.check_created'
  session_id: string
  check_type: string
  passed: boolean
  score: number
}

interface WsDaemonStatus extends WsEventBase {
  event: 'daemon.status'
  connected: boolean
  camera_model?: string
  pi_temperature?: number
}

interface WsPing extends WsEventBase {
  event: 'ping'
}

type WsEvent =
  | WsJobStatusChanged
  | WsSessionStatusChanged
  | WsQaCheckCreated
  | WsDaemonStatus
  | WsPing

// ─── Constantes ───────────────────────────────────────────────────────────────

const WS_URL = 'ws://localhost:8001/ws/events'
const BACKOFF_DELAYS = [1000, 2000, 4000, 8000, 16000, 30000] // ms
const SILENT_RECONNECT_THRESHOLD = 5000 // < 5s : silencieux

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useWebSocket(): void {
  const queryClient = useQueryClient()
  const setDaemonStatus = useUiStore((s) => s.setDaemonStatus)

  const wsRef = useRef<WebSocket | null>(null)
  const attemptRef = useRef(0)
  const disconnectedAtRef = useRef<number | null>(null)
  const unmountedRef = useRef(false)

  const handleMessage = useCallback(
    (raw: string) => {
      let event: WsEvent
      try {
        event = JSON.parse(raw) as WsEvent
      } catch {
        return
      }

      switch (event.event) {
        case 'ping':
          // Keepalive — ignorer silencieusement
          break

        case 'job.status_changed':
          // Invalider le job concerné et la liste des jobs de sa session
          void queryClient.invalidateQueries({ queryKey: ['jobs', event.job_id] })
          void queryClient.invalidateQueries({ queryKey: ['jobs', { session_id: event.session_id }] })
          // Invalider aussi le détail de la session (statut peut changer)
          void queryClient.invalidateQueries({ queryKey: ['sessions', event.session_id] })
          break

        case 'session.status_changed':
          // Invalider la session dans la liste et le détail
          void queryClient.invalidateQueries({ queryKey: ['sessions'] })
          void queryClient.invalidateQueries({ queryKey: ['sessions', event.session_id] })
          break

        case 'qa.check_created':
          void queryClient.invalidateQueries({ queryKey: ['qa', event.session_id] })
          break

        case 'daemon.status':
          if (event.connected) {
            setDaemonStatus({
              connected: true,
              cameraModel: event.camera_model ?? 'Pi Camera HQ',
              piTemperature: event.pi_temperature,
            })
          } else {
            setDaemonStatus({ connected: false })
          }
          break
      }
    },
    [queryClient, setDaemonStatus]
  )

  const connect = useCallback(() => {
    if (unmountedRef.current) return

    try {
      const ws = new WebSocket(WS_URL)
      wsRef.current = ws

      ws.onopen = () => {
        // Réinitialiser le compteur de tentatives sur connexion réussie
        attemptRef.current = 0

        // Calculer si la déconnexion était courte (silencieuse) ou longue
        const wasDisconnected = disconnectedAtRef.current !== null
        const disconnectDuration = wasDisconnected
          ? Date.now() - (disconnectedAtRef.current ?? 0)
          : 0
        disconnectedAtRef.current = null

        // Forcer un refresh si la déconnexion a duré (on a peut-être raté des events)
        if (wasDisconnected && disconnectDuration > SILENT_RECONNECT_THRESHOLD) {
          void queryClient.invalidateQueries()
        }
      }

      ws.onmessage = (e: MessageEvent<string>) => {
        handleMessage(e.data)
      }

      ws.onclose = () => {
        wsRef.current = null
        if (unmountedRef.current) return

        // Marquer l'heure de déconnexion
        if (disconnectedAtRef.current === null) {
          disconnectedAtRef.current = Date.now()
        }

        // Mettre le daemon en état déconnecté
        setDaemonStatus({ connected: false })

        // Reconnexion avec backoff exponentiel
        const delay =
          BACKOFF_DELAYS[Math.min(attemptRef.current, BACKOFF_DELAYS.length - 1)]
        attemptRef.current += 1
        setTimeout(connect, delay)
      }

      ws.onerror = () => {
        // L'erreur sera suivie d'un onclose — on laisse le mécanisme de
        // reconnexion gérer. Ne pas logger pour éviter le spam console.
        ws.close()
      }
    } catch {
      // WebSocket non disponible (ex: API pas encore lancée)
      const delay =
        BACKOFF_DELAYS[Math.min(attemptRef.current, BACKOFF_DELAYS.length - 1)]
      attemptRef.current += 1
      setTimeout(connect, delay)
    }
  }, [handleMessage, queryClient, setDaemonStatus])

  useEffect(() => {
    unmountedRef.current = false
    connect()

    return () => {
      unmountedRef.current = true
      wsRef.current?.close()
      wsRef.current = null
    }
  }, [connect])
}