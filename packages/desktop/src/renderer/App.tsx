import { useEffect, useState } from 'react'

/**
 * Écran unique du chapitre 01 : un health check.
 *
 * Il interroge http://localhost:8000/health (l'orchestrateur FastAPI du
 * chapitre 04). Tant que l'API n'est pas écrite, l'écran affiche
 * "orchestrateur injoignable" — c'est normal et attendu.
 *
 * Objectif : valider que la chaîne Electron + Vite + React + fetch
 * fonctionne de bout en bout, et que la CSP laisse passer l'appel HTTP
 * vers localhost:8000.
 *
 * Les vraies pages (Sessions, Presets, Queue, Assets, QA, Exports)
 * arrivent au chapitre 07.
 */

type HealthState =
  | { kind: 'loading' }
  | { kind: 'ok'; payload: unknown }
  | { kind: 'error'; message: string }

const ORCHESTRATOR_URL = 'http://localhost:8000'

export function App(): JSX.Element {
  const [health, setHealth] = useState<HealthState>({ kind: 'loading' })

  useEffect(() => {
    const controller = new AbortController()

    fetch(`${ORCHESTRATOR_URL}/health`, { signal: controller.signal })
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data: unknown = await res.json()
        setHealth({ kind: 'ok', payload: data })
      })
      .catch((err: unknown) => {
        if (err instanceof Error && err.name === 'AbortError') return
        const message = err instanceof Error ? err.message : String(err)
        setHealth({ kind: 'error', message })
      })

    return () => controller.abort()
  }, [])

  return (
    <main className="app">
      <header>
        <h1>Scanner Macro</h1>
        <span className="tag">Chapitre 01 — coquille vide</span>
      </header>

      <section className="health">
        <h2>État de l'orchestrateur</h2>
        {health.kind === 'loading' && <p className="muted">Vérification en cours…</p>}
        {health.kind === 'ok' && (
          <>
            <p className="ok">✅ Orchestrateur joignable</p>
            <pre>{JSON.stringify(health.payload, null, 2)}</pre>
          </>
        )}
        {health.kind === 'error' && (
          <>
            <p className="error">❌ Orchestrateur injoignable</p>
            <p className="muted">{health.message}</p>
            <p className="muted">
              Normal tant que le chapitre 04 (FastAPI) n'est pas implémenté.
              Lancer l'API sur <code>{ORCHESTRATOR_URL}</code> pour voir cet
              écran passer au vert.
            </p>
          </>
        )}
      </section>
    </main>
  )
}
