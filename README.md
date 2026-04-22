# Scanner Macro

Scanner photogrammétrique macro pour spécimens millimétriques (insectes,
bijoux, micro-pièces techniques).

Ce repo est un **monorepo** qui contient les trois composants logiciels du
produit plus les fichiers d'infrastructure locale.

## Arborescence

```
scanner-macro/
├── packages/
│   ├── shared/          scanner_shared        — enums, naming, contrats
│   ├── daemon/          scanner_daemon        — pilotage du rig (embarqué)
│   ├── orchestrator/    scanner_orchestrator  — API, workers, BDD
│   └── desktop/         scanner-desktop       — app Electron + React
├── infra/               docker-compose, MinIO, Redis
├── docs/                documentation technique + décisions d'architecture
├── .env.example
├── .gitignore
├── pnpm-workspace.yaml  workspace Node (desktop uniquement)
└── pyproject.toml       workspace uv (shared + daemon + orchestrator)
```

## Prérequis

| Outil       | Version min | Rôle                                      |
| ----------- | ----------- | ----------------------------------------- |
| uv          | 0.4+        | Gestionnaire packages Python + workspace  |
| Python      | 3.12+       | Runtime Python                            |
| Node.js     | 20 LTS+     | Runtime Electron + React                  |
| pnpm        | 9+          | Gestionnaire packages Node                |
| Docker      | latest      | Redis + MinIO locaux                      |
| Git         | 2.40+       | Versioning                                |

## Démarrage — 5 commandes

```bash
# 1. Copier le fichier d'environnement
cp .env.example .env

# 2. Installer les dépendances Python (shared + daemon + orchestrator)
uv sync --all-packages

# 3. Installer les dépendances Node (desktop)
pnpm install

# 4. Démarrer Redis + MinIO en local
docker compose -f infra/docker-compose.dev.yml up -d

# 5. Vérifier que tout est en place
uv run python -c "import scanner_shared; print('shared OK')"
uv run python -c "import scanner_orchestrator; print('orchestrator OK')"
```

Une fois MinIO démarré, ouvrir http://localhost:9001 (login
`minioadmin` / `minioadmin`) et **créer le bucket `sessions`**.
Ce bucket doit exister avant tout test de l'orchestrateur.

## Documentation

- `docs/Documentation_Technique_Scanner_Macro_v1_1.docx` — guide de
  développement chapitre par chapitre (le *comment*).
- `docs/Architecture_Logicielle_Scanner_Macro_v1.docx` — décisions
  d'architecture (le *pourquoi*). En cas de contradiction avec le guide,
  l'architecture fait foi.

## État du chapitrage

| Chapitre | Sujet                             | État     |
| -------- | --------------------------------- | -------- |
| 01       | Initialisation du projet          | ✅ ce repo |
| 02       | Schémas partagés `scanner_shared` | à faire  |
| 03       | Base de données                   | à faire  |
| 04       | API orchestrateur                 | à faire  |
| 05       | Daemon embarqué                   | en attente décisions HW |
| 06       | Workers pipeline                  | en attente décisions outils |
| 07       | Application desktop               | après ch. 04 |
| 08       | Packaging et distribution         | en dernier |
