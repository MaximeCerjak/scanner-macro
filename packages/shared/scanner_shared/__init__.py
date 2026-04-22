"""Scanner Shared — enums, naming conventions et contrats partagés.

Ce package ne contient que des types et des constantes. Il est importé
par `scanner_daemon` et `scanner_orchestrator`. Il ne doit JAMAIS importer
l'un de ces deux packages (éviter les cycles).

Le chapitre 02 de la documentation technique rédige le contenu réel de ce
package. À l'étape 01, on se contente de vérifier qu'il est importable.
"""

__version__ = "0.1.0"
