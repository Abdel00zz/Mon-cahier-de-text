# Guide de création d'un bulletin officiel JSON

Ce fichier alimente la page **Évaluations & échéances**. Il ne remplace pas le PDF officiel : il en extrait uniquement les informations utiles au parcours de l'élève.

## 1. Informations à extraire du PDF

Conserver :

- l'année scolaire, le numéro, la date et le titre de la décision ;
- les périodes des contrôles continus ;
- les examens locaux, régionaux et nationaux ;
- les sessions normales et de rattrapage ;
- les périodes de préparation, soutien et remédiation ;
- les dates de publication ou de remise des résultats ;
- les olympiades, concours, niveaux concernés et étapes ;
- le numéro de page PDF exact de chaque information.

Ne pas importer :

- les dates de prise de fonction ou de sortie du personnel ;
- les réunions administratives sans effet direct sur l'élève ;
- les procédures internes de gestion ;
- les coordonnées, signatures et cachets ;
- le texte juridique général sans date ou action pédagogique exploitable.

## 2. Séparer les niveaux

Balises acceptées :

| Balise | Portée |
|---|---|
| `all-secondary` | Tout le collège et le lycée |
| `college` | 1AC, 2AC et 3AC |
| `1ac`, `2ac`, `3ac` | Niveau collégial précis |
| `lycee` | Tronc commun, 1BAC et 2BAC |
| `tc` | Tous les troncs communs |
| `tc-scientific` | Tronc commun scientifique uniquement |
| `1bac`, `2bac` | Niveau Bac précis |

Une échéance de 3AC ne doit jamais utiliser `college` si elle ne concerne pas aussi 1AC et 2AC.

## 3. Catégories

- `school` : rentrée ou fin des cours ;
- `assessment` : contrôles continus ;
- `exam` : examen local, régional, national ou rattrapage ;
- `result` : résultats ou remise des bulletins ;
- `support` : préparation, soutien ou remédiation ;
- `competition` : olympiade, robotique, programmation ou lecture.

## 4. Nature de la date

- `fixed` : date exacte publiée ;
- `window` : intervalle officiel avec début et fin ;
- `indicative` : mois ou période dont la date précise sera communiquée ultérieurement.

Toutes les dates utilisent le format `YYYY-MM-DD`. Pour un mois indicatif, utiliser le premier et le dernier jour du mois avec `dateKind: "indicative"`.

Les fêtes religieuses dépendant de l'observation lunaire appartiennent au calendrier des vacances et doivent être marquées comme approximatives dans le fichier du calendrier, pas dans le bulletin des examens.

## 5. Structure minimale

```json
{
  "version": 1,
  "schoolYear": "2026-2027",
  "source": {
    "title": "Décision ministérielle n° 047.26",
    "date": "2026-07-03",
    "language": "ar",
    "note": "Transcription ciblée des informations concernant les élèves."
  },
  "events": [
    {
      "id": "college-regional-exam-3ac",
      "category": "exam",
      "title": "Examen régional unifié - 3AC",
      "start": "2027-06-23",
      "end": "2027-06-24",
      "levels": ["3ac"],
      "dateKind": "fixed",
      "studentAction": "Passage de l'examen régional du certificat du cycle collégial.",
      "sourcePage": 11
    }
  ]
}
```

## 6. Règles d'identifiant

Le champ `id` :

- est unique dans tout le fichier ;
- reste stable lors d'une correction de date ;
- contient uniquement minuscules, chiffres et tirets ;
- décrit l'événement, par exemple `second-bac-national-regular`.

## 7. Procédure de publication

1. Conserver le PDF source dans les archives de l'établissement.
2. Transcrire les tableaux dans un nouveau fichier JSON.
3. Ouvrir `admin.html` puis **Bulletin officiel JSON**.
4. Importer le fichier ou coller son contenu.
5. Utiliser **Vérifier** et corriger toutes les non-conformités.
6. Examiner le nombre d'événements, l'année et les catégories.
7. Publier seulement après une seconde vérification avec le PDF.
8. Exporter la version publiée afin de conserver une copie datée.

Après publication, l'application charge le bulletin de manière asynchrone. En cas de réseau indisponible ou de bulletin serveur invalide, elle conserve la dernière version saine embarquée.

