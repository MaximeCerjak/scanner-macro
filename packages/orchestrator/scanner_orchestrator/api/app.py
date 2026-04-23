"""Application FastAPI principale."""

from contextlib import asynccontextmanager

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from scanner_orchestrator.api.routes import (
    assets, calibrations, health, jobs, presets, sessions, specimens,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup : les vérifications de santé se font via /health
    yield
    # Shutdown : rien à fermer explicitement pour l'instant


app = FastAPI(
    title="Scanner Macro Orchestrator",
    description="API de pilotage du pipeline photogrammétrique",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "app://.", "file://"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(specimens.router)
app.include_router(calibrations.router)
app.include_router(presets.router)
app.include_router(sessions.router)
app.include_router(jobs.router)
app.include_router(assets.router)


# ── WebSocket /ws/events ──────────────────────────────────────────────────────

@app.websocket("/ws/events")
async def events_ws(websocket: WebSocket) -> None:
    """Diffuse les événements de changement d'état en temps réel.

    Au chapitre 04, implémentation minimale : accepte la connexion et
    envoie un ping toutes les 30 secondes pour garder la connexion vivante.
    La vraie implémentation (Redis pub/sub → push) arrive au chapitre 06.
    """
    import asyncio
    import json
    from datetime import datetime, timezone

    await websocket.accept()
    try:
        while True:
            await asyncio.sleep(30)
            await websocket.send_text(json.dumps({
                "event": "ping",
                "timestamp": datetime.now(timezone.utc).isoformat(),
            }))
    except WebSocketDisconnect:
        pass