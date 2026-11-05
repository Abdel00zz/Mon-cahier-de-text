# Cahier de textes — application de bureau (PyQt6)

Version locale et mono-utilisateur du cahier de textes, écrite en Python avec
PyQt6. Aucun compte, aucun serveur, aucune synchronisation : la base SQLite vit
sur l'ordinateur de l'enseignant. La composante d'administration de la version
web n'existe pas ici.

```
python/
├── run.py                  # lanceur direct (python run.py)
├── pyproject.toml          # métadonnées, dépendances, ruff, pytest
├── app/
│   ├── paths.py            # emplacements de stockage (mode portable possible)
│   ├── state.py            # état partagé + signaux Qt
│   ├── main.py             # point d'entrée
│   ├── core/               # domaine pur, testable sans Qt
│   │   ├── models.py       # pydantic v2 : classe, séance, plan, configuration
│   │   ├── numbering.py    # numérotation I / A / 1° / a)
│   │   ├── timetable.py    # créneaux, séance en cours, séance suivante
│   │   ├── palette.py      # teintes de classes (clair / sombre)
│   │   ├── i18n.py         # fr / ar / en
│   │   ├── subjects.py     # catalogue des matières
│   │   └── report.py       # aplatissement + document HTML (aperçu, PDF)
│   ├── data/               # SQLite, jamais exposé à l'interface
│   │   ├── database.py     # connexion, schéma versionné, transactions
│   │   ├── repository.py   # toutes les requêtes
│   │   └── backup.py       # export / import / archivage JSON
│   └── ui/
│       ├── theme.py        # jetons de couleur, polices, feuille de style
│       ├── icons.py        # icônes SVG dessinées au trait
│       ├── main_window.py  # rail de navigation + pages + dialogues
│       ├── pages/          # tableau de bord, cahier, emploi du temps, réglages, aide
│       └── widgets/        # cartes, états vides, dispositions fluides, dialogues
└── tests/                  # pytest + pytest-qt (sans écran)
```

Trois couches, une seule direction de dépendance : `ui → data → core`. Le
domaine ne connaît ni Qt ni SQL ; c'est ce qui permet de le tester directement et
de changer l'interface sans le toucher.

## Installation

```powershell
cd python
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
```

## Lancement

```powershell
.\.venv\Scripts\python.exe run.py
```

Ou, après `pip install -e .`, la commande `cahier` fait la même chose.

## Données

| Élément | Emplacement |
| --- | --- |
| Base | `%LOCALAPPDATA%\CahierDeTextes\cahier.sqlite3` |
| Sauvegardes | `%LOCALAPPDATA%\CahierDeTextes\sauvegardes\` |
| Archives | `%LOCALAPPDATA%\CahierDeTextes\archives\` |

Le dossier exact est affiché dans **Réglages → Données**. Pour un usage sur clé
USB, définir `CAHIER_HOME` avant le lancement : la base et les sauvegardes sont
alors écrites dans ce dossier.

La base est en mode WAL : une coupure de courant n'abîme pas le fichier, et une
écriture en cours ne bloque pas la lecture.

## Sauvegarde et archivage

- **Exporter la sauvegarde** — fichier JSON lisible (une sauvegarde par
  période, à conserver hors de l'ordinateur).
- **Restaurer une sauvegarde** — remplace intégralement les données, en une
  seule transaction : en cas d'erreur, rien n'est modifié.
- **Archiver l'année** — fige une copie complète (classes, séances, plan) et
  produit un fichier daté, avant de repartir pour l'année suivante.

## Interface

- Rail de navigation à gauche (icônes seules en fenêtre étroite), `Ctrl+1` … `Ctrl+5`
  pour changer de page, `Ctrl+N` pour créer une classe.
- Thème clair / sombre / système, taille de texte réglable, sens de lecture
  automatique en arabe.
- Polices Computer Modern (dossier `public/fonts` du dépôt) avec repli système si
  les fichiers sont absents.
- Export PDF par le moteur d'impression de Qt, sans outil externe.

## Tests et qualité

```powershell
$env:QT_QPA_PLATFORM = "offscreen"
.\.venv\Scripts\python.exe -m pytest tests -q
.\.venv\Scripts\python.exe -m ruff check app tests run.py
```

Les tests couvrent la numérotation, l'emploi du temps, le dépôt (cascade,
round-trip du plan imbriqué, restauration atomique, archives), les traductions
et un parcours d'interface complet sans écran.
