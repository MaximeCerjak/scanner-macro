"""CLI de gestion de la base de données.

Usage :
    uv run python -m scanner_orchestrator.db init   # crée les tables (dev)
    uv run python -m scanner_orchestrator.db seed   # peuple les données système
"""

import logging
import sys

logging.basicConfig(level=logging.INFO, format="%(message)s")


def main() -> None:
    if len(sys.argv) < 2:
        print("Usage: python -m scanner_orchestrator.db [init|seed]")
        sys.exit(1)

    cmd = sys.argv[1]

    if cmd == "init":
        from scanner_orchestrator.db.database import init_db
        init_db()
        print("Tables créées.")

    elif cmd == "seed":
        from scanner_orchestrator.db.database import SessionLocal
        from scanner_orchestrator.db.seed import seed
        with SessionLocal() as db:
            seed(db)

    else:
        print(f"Commande inconnue : {cmd!r}. Commandes disponibles : init, seed")
        sys.exit(1)


if __name__ == "__main__":
    main()