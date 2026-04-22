# Infrastructure locale

Stack Docker Compose pour lancer les services d'infrastructure en
développement : Redis (broker Celery + pub/sub WebSocket) et MinIO
(stockage objet compatible S3).

## Démarrage

```bash
docker compose -f infra/docker-compose.dev.yml up -d
docker compose -f infra/docker-compose.dev.yml ps
```

## Vérifications

| Service | URL                          | Credentials                |
| ------- | ---------------------------- | -------------------------- |
| Redis   | `redis://localhost:6379`     | (aucun)                    |
| MinIO API | `http://localhost:9000`    | `minioadmin` / `minioadmin` |
| MinIO Console | `http://localhost:9001` | `minioadmin` / `minioadmin` |

## Post-démarrage — obligatoire

Après le **premier** `up`, ouvrir la console MinIO et créer manuellement
le bucket `sessions`. Sans lui, l'orchestrateur lèvera des erreurs dès
qu'il tentera d'écrire un asset.

> Une automatisation via `mc mb` dans un conteneur `minio/mc` pourra être
> ajoutée plus tard. Au chapitre 01 on reste manuel pour coller à la doc.

## Arrêt et nettoyage

```bash
# Arrêt (garde les volumes)
docker compose -f infra/docker-compose.dev.yml down

# Arrêt + suppression des données (reset complet)
docker compose -f infra/docker-compose.dev.yml down -v
```
