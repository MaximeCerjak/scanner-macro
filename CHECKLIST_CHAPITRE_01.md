# Checklist de validation — Chapitre 01

Cette checklist reprend les items implicites de la documentation
technique v1.1 pour le chapitre 01. Tout doit être coché avant de passer
au chapitre 02.

## Environnement local

- [X] `uv --version` retourne 0.4 ou plus
- [X] `python --version` retourne 3.12 ou plus
- [X] `node --version` retourne 20.x ou plus (LTS)
- [X] `pnpm --version` retourne 9 ou plus
- [X] `docker --version` répond
- [X] `git --version` retourne 2.40 ou plus

## Workspace Python (uv)

- [X] `cp .env.example .env` effectué
- [X] `uv sync --all-packages` s'exécute sans erreur
- [X] `uv run python -c "import scanner_shared; print('shared OK')"` affiche `shared OK`
- [X] `uv run python -c "import scanner_orchestrator; print('orchestrator OK')"` affiche `orchestrator OK`
- [X] `uv run python -c "import scanner_daemon; print('daemon OK')"` affiche `daemon OK`
- [X] `uv run pytest` : les 3 tests smoke passent

## Workspace Node (pnpm)

- [X] `pnpm install` s'exécute sans erreur
- [X] `pnpm --filter scanner-desktop typecheck` passe sans erreur
- [X] `pnpm --filter scanner-desktop dev` lance Electron et ouvre une fenêtre

## Infrastructure locale

- [X] `docker compose -f infra/docker-compose.dev.yml up -d` démarre Redis + MinIO
- [X] `docker compose -f infra/docker-compose.dev.yml ps` montre 2 services `running (healthy)`
- [X] Console MinIO accessible sur `http://localhost:9001`
- [X] Bucket `sessions` créé manuellement dans la console MinIO
- [ ] `redis-cli -h localhost ping` retourne `PONG`

## Cohérence du repo

- [X] Le fichier `.env` n'est PAS suivi par Git (`git status` ne le voit pas)
- [X] `packages/desktop/node_modules` ignoré par Git
- [X] Aucun fichier `.db` présent dans le commit initial
- [X] L'arborescence correspond à la section 1.2 de la doc technique

## Une fois tout coché

Le repo est prêt pour le chapitre 02 (schémas partagés `scanner_shared`).
