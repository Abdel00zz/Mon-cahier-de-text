"""Cahier de textes numérique — application locale PyQt6.

Architecture en trois couches, sans dépendance de l'interface vers le domaine :

    core/   domaine pur (modèles, numérotation, séances, couleurs, traductions)
    data/   persistance SQLite, sauvegardes et archives
    ui/     fenêtres, pages et composants Qt

Le domaine ne connaît ni Qt ni SQLite : il est testable en quelques
millisecondes, ce qui permet de vérifier les règles pédagogiques (numérotation
romaine, séance en cours, bornes de l'emploi du temps) sans ouvrir de fenêtre.
"""

__version__ = "1.0.0"
