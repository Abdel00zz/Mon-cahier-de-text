# Audit du traitement JSON — 24 septembre 2026

## Circuit observé

Les imports de cours passent par `prepareImportedLessons` (éditeur, contenu prédéfini et API d’administration). Ce moteur résout les anciens formats, normalise les types, textes et dates, puis détecte le sens d’écriture. La restauration de sauvegarde complète passe par `restoreBackup`. Les lectures répétées des cahiers utilisent déjà un cache par texte sérialisé (`notebookStorage`), et la recherche utilise `useMemo` et `useDeferredValue`.

`analyzeContentJson` est un utilitaire de diagnostic distinct : il n’est actuellement pas appelé par les écrans de production. Ses corrections sont couvertes par les tests, mais ne constituent pas une nouvelle prévisualisation visible dans les modales.

## Corrections réalisées

- Résolution des enveloppes partagée : tableau direct, `lessonsData`, `data`, `lessons`, `items` et sauvegarde mono-classe. Un objet arbitraire est refusé au lieu de devenir un cahier vide.
- Budgets structurels communs : profondeur maximale 12, 12 000 éléments, libellés de 500 caractères, descriptions de 20 000 caractères. Les entrées primitives comptent aussi dans le budget pour éviter les grands tableaux ignorés mais coûteux.
- Diagnostic : exploration du contenu réellement importé, comptage UTF-8 exact, doublons limités au même parent, mêmes limites de profondeur et de texte que le moteur. Les tableaux imbriqués hors schéma ne provoquent plus de récursion non bornée.
- Lecture des fichiers : un nouveau choix invalide aussi les anciennes lectures lorsqu’il est refusé pour sa taille. La restauration annule la lecture précédente et remet à zéro la confirmation. Une erreur conserve la modale ouverte.
- Parsing partagé pour fichiers et texte collé, avec limite de 10 Mio par défaut et prise en charge du BOM UTF-8. L’administration conserve sa limite propre de 850 000 octets ; le diagnostic conserve 700 000 octets. Ces limites ne sont donc pas présentées comme une limite universelle de synchronisation.
- Restauration : validation préalable des classes, identifiants uniques, version, structure des cours et forme des métadonnées. Toutes les chaînes à écrire sont préparées avant les écritures. Sur échec synchrone, les clés déjà modifiées sont rétablies avant toute notification de synchronisation. L’ancienne mémoire d’impression et l’ancien journal d’une classe sont retirés lorsqu’ils sont absents du fichier restauré.

## Mesures reproductibles

Commande PowerShell : `$env:NODE_ENV='production'; npx tsx scripts/benchmark-json.ts`.
Corpus synthétique, Node sur ce PC, 20 itérations après échauffement. Ce ne sont pas des mesures sur téléphone.

| Éléments | JSON UTF-8 | Parsing + normalisation médiane / p95 | Diagnostic médiane / p95 |
| --- | ---: | ---: | ---: |
| 100 | 10 586 octets | 0,18 / 0,35 ms | 0,37 / 0,94 ms |
| 1 000 | 105 986 octets | 0,68 / 1,79 ms | 4,48 / 5,45 ms |
| 5 000 | 533 986 octets | 3,33 / 4,16 ms | 17,84 / 25,47 ms |

## Technologies : décision et limites

Le parsing natif et le moteur borné sont conservés pour ce correctif. Aucun gain d’un remplacement par WebAssembly n’a été démontré.

Un **Web Worker** est une piste pour une future analyse interactive de gros cahiers : il exécute les calculs hors du fil d’interface, avec un coût d’échange des données. Son intégration devra utiliser un identifiant de requête, annuler les analyses périmées et être mesurée sur téléphone. [Documentation MDN](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Using_web_workers).

**IndexedDB** est la piste pour rendre les écritures de plusieurs documents transactionnelles et asynchrones. Le rétablissement ajouté ici à `localStorage` n’est pas une transaction résistante à un crash ni une protection contre deux onglets écrivant simultanément. Une migration doit coordonner éditeur, comptes, sauvegardes et file de synchronisation. [Documentation MDN](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API).

La validation de sauvegarde contrôle les structures nécessaires au cahier ; elle ne constitue pas encore un schéma exhaustif de chaque champ d’`AppConfig` ou des métadonnées historiques. Aucun test cloud réel ni test de quota sur appareil physique n’a été effectué ; les échecs d’écriture sont simulés dans les tests.

## Vérification

`scripts/test-json-pipeline.ts` couvre les enveloppes, faux doublons, budgets, encodage, corruption, refus des versions inconnues, restauration interrompue et émission de synchronisation après réussite. Les tests existants de l’éditeur et de l’import administrateur vérifient aussi la conservation des lignes libres, dates et sens RTL.
