# UX — Cahier de textes interactif

## Intention

L’interface doit aider un enseignant à décider et agir rapidement, sans le juger. Le contenu pédagogique reste central ; les indicateurs sont des repères, jamais des sanctions.

## Principes

1. Une information au bon endroit : une erreur de saisie reste dans le formulaire ou la modale concernée.
2. Une décision explicite pour une exception : « Modifier la date » ou « J’ai compris, enregistrer ».
3. Un écran, une intention principale ; une seule action primaire visible.
4. Les données respirent : peu de cartes, des surfaces claires et des groupes visuels courts.
5. Mobile d’abord : cibles tactiles de 44 px minimum, bottom sheets, contenu défilable et actions atteignables au pouce.

## Dates et messages

- Une date est contrôlée contre l’emploi du temps, les vacances, jours fériés, absences et années scolaires connues.
- Un écart est affiché comme un message de vérification, pas comme un toast ni une erreur rouge.
- Le message liste les raisons et laisse le professeur confirmer une séance exceptionnelle ou de rattrapage.
- Les actions « Dater aujourd’hui », édition directe, édition complète et affectation multiple utilisent le même circuit.
- Les alertes de progression emploient « à compléter » ; éviter « en retard » ou toute formulation culpabilisante.

## Tableau de bord

Le tableau de bord suit ce circuit :

```text
Emploi du temps → séances saisies → contenus à venir → progression → devoirs
```

- Présenter ce circuit dans une seule surface aérée.
- Montrer les prochains contenus datés, puis les actions les plus utiles.
- Limiter les listes de progression ; les autres classes restent accessibles depuis « Mes classes ».
- Les couleurs traduisent une intention : bleu/indigo pour l’action, ambre pour une vérification, rouge uniquement pour une action destructive.

## Sidebar

- Palette ardoise/indigo douce, jamais noir uniforme.
- État actif lumineux mais non agressif.
- Mode compact mémorisé : icônes seules, libellés accessibles au clavier et au survol.
- Sur mobile, la navigation s’ouvre en drawer et reste développée.

## Modales

- Titre court, une phrase de contexte, contenu défilable, fermeture `X` fixe et pied d’actions stable.
- Une modale ne doit pas ouvrir une seconde modale ; utiliser une étape interne ou un circuit centralisé.
- Bouton secondaire : annuler ou modifier. Bouton primaire : confirmer l’action précise.
- Les choix FR/AR utilisent la préférence partagée et appliquent `dir="rtl"` au contenu arabe.

## Accessibilité et mouvement

- Les messages informatifs utilisent `role="status"`; réserver `role="alert"` aux situations réellement urgentes.
- Focus visible, libellé accessible sur chaque bouton icône, raccourcis jamais obligatoires.
- Animations courtes, utiles et désactivables avec `prefers-reduced-motion`.

## Checklist de revue

- [ ] Le message est-il dans le contexte de l’action ?
- [ ] Une exception est-elle confirmée explicitement ?
- [ ] L’action principale est-elle unique et compréhensible ?
- [ ] Le parcours fonctionne-t-il à 360 px et au clavier ?
- [ ] La règle métier est-elle dans `utils/`, non dupliquée dans la vue ?
- [ ] Le composant ou le fichier est-il réellement importé avant toute suppression ?
