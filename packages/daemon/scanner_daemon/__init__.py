"""Scanner Daemon — séquenceur d'acquisition embarqué.

Tourne sur la machine qui pilote physiquement le rig (Raspberry Pi ou
mini-PC, décision hardware en attente). Responsabilités :

- Recevoir une recette d'acquisition depuis l'orchestrateur (HTTP).
- Piloter les moteurs (platine rotative, rail Z) via GPIO.
- Déclencher la caméra et récupérer les images.
- Produire un manifeste JSON de la session acquise.
- Pousser le manifeste + les fichiers vers MinIO.

Le chapitre 05 de la documentation technique rédige ce package.
"""

__version__ = "0.1.0"
