import { ch, sec, it } from '../curriculum-builder-helpers.mjs';

export const info1AC = [
  ch("Unité 1 : Le système informatique (Notions de base)", [
    sec("Concepts fondamentaux et structure d'un ordinateur", [
      it("definition", "Définition de l'informatique : traitement automatique et rationnel de l'information", "Distinction essentielle entre Information, Donnée, et Traitement."),
      it("cours", "Structure matérielle d'un ordinateur : Unité Centrale et Périphériques", "Rôle du processeur (CPU), de la mémoire vive (RAM), de la mémoire morte (ROM) et de la carte mère."),
      it("cours", "Classification fonctionnelle des périphériques informatiques", "Périphériques d'entrée (clavier, souris, scanner), de sortie (écran, imprimante, haut-parleurs) et d'entrée-sortie/stockage (clé USB, disque dur SSD)."),
      it("application", "Mesure et unités de stockage de la mémoire numérique", "Du bit à l'octet (Byte), Kilooctet (Ko), Mégaoctet (Mo), Gigaoctet (Go) et Téraoctet (To).")
    ])
  ]),
  ch("Unité 2 : Le système d'exploitation et environnement de travail", [
    sec("Gestion des fichiers et organisation de l'espace disque", [
      it("cours", "Rôle et fonctions du système d'exploitation (Windows / GNU Linux)", "Interface homme-machine, gestion des ressources matérielles, lancement des logiciels et sécurité."),
      it("methode", "Organisation hiérarchique de l'information : arborescence, dossiers et fichiers", "Création, renommage, déplacement, copie et suppression de dossiers et fichiers."),
      it("cours", "Nomenclature et extensions usuelles des fichiers (.docx, .pdf, .jpg, .mp3, .mp4)", "Identification des types de fichiers et association avec les logiciels appropriés.")
    ])
  ]),
  ch("Unité 3 : Traitement de texte et mise en page", [
    sec("Production de documents écrits soignés", [
      it("cours", "Saisie de texte au kilomètre et correction orthographique automatique", "Règles typographiques françaises et arabes : ponctuation, majuscules, espaces insécables."),
      it("methode", "Mise en forme des caractères et des paragraphes", "Police, taille, gras, italique, souligné, couleur, alignement (gauche, centré, justifié), interligne et retraits."),
      it("application", "Insertion et mise en page d'objets : tableaux, images, formes géométriques", "Habillage du texte, fusion et fractionnement de cellules, bordures et trames de fond."),
      it("methode", "Mise en page finale et préparation de l'impression", "Marges du document, orientation (portrait / paysage), numérotation des pages et aperçu avant impression.")
    ])
  ]),
  ch("Unité 4 : Réseaux locaux et initiation à Internet", [
    sec("Communication et recherche documentaire", [
      it("cours", "Notion de réseau informatique et avantages du réseau local (LAN)", "Partage de fichiers, partage d'imprimante, communication instantanée entre postes."),
      it("cours", "Le réseau Internet mondial et le Web (World Wide Web)", "Différence entre Internet (réseau des réseaux) et Web (service de pages multimédias interconnectées par hyperliens)."),
      it("methode", "Utilisation d'un navigateur et techniques de recherche par mots-clés", "Moteurs de recherche, utilisation des guillemets et opérateurs booléens simples."),
      it("cours", "Netiquette, sécurité numérique et protection des données personnelles", "Choix de mots de passe robustes, sensibilisation aux dangers des virus et du hameçonnage (phishing).")
    ])
  ])
];

export const info2AC = [
  ch("Unité 1 : Le tableur et calculs automatisés", [
    sec("Structure d'un classeur et formules arithmétiques", [
      it("cours", "Concepts de base du tableur : classeur, feuilles de calcul, lignes, colonnes et cellules", "Adresse relative et absolue d'une cellule (A1, $A$1), types de données (texte, nombre, date)."),
      it("methode", "Écriture et évaluation des formules de calcul élémentaires (+, -, *, /, ^)", "Priorité des opérations mathématiques et syntaxe débutant par le signe égal '='."),
      it("cours", "Utilisation des fonctions statistiques prédéfinies : SOMME, MOYENNE, MIN, MAX, NB", "Syntaxe des plages de cellules (ex: A1:A20), calcul automatique des moyennes de classe."),
      it("application", "La fonction logique conditionnelle : SI simple et imbriqué", "Affichage automatique d'une mention ou d'un résultat selon une condition (ex: SI(Moyenne>=10; 'Admis'; 'Ajourné')).")
    ]),
    sec("Représentation graphique des données", [
      it("methode", "Création et personnalisation de diagrammes statistiques", "Choix du type de graphique adapté : histogramme (comparaison), secteur (répartition en pourcentages), courbe (évolution dans le temps)."),
      it("application", "Mise en forme conditionnelle et tri de listes de données", "Mise en surbrillance automatique des valeurs critiques et ordonnancement alphabétique ou numérique.")
    ])
  ]),
  ch("Unité 2 : Présentation assistée par ordinateur (PAO)", [
    sec("Conception de diaporamas interactifs", [
      it("cours", "Règles d'or d'une présentation visuelle efficace : concision, lisibilité et contraste", "Éviter la surcharge textuelle, choisir une palette de couleurs harmonieuse et des typographies lisibles."),
      it("methode", "Création de diapositives : masques, thèmes, zones de texte et éléments multimédias", "Intégration harmonieuse de graphiques, vidéos courtes et schémas conceptuels."),
      it("cours", "Transitions entre diapositives et animations personnalisées des objets", "Réglage du minutage, effets d'apparition progressive pour rythmer l'exposé oral."),
      it("application", "Liens hypertextes et boutons d'action interactifs", "Création d'un sommaire cliquable et navigation non linéaire dans le diaporama.")
    ])
  ]),
  ch("Unité 3 : Veille informationnelle et citoyenneté numérique", [
    sec("Éthique du numérique et esprit critique", [
      it("cours", "Évaluation de la fiabilité des sources d'information sur Internet", "Détection des fausses nouvelles (Fake News), vérification de l'auteur, de la date et croisement des sources."),
      it("cours", "Droit d'auteur, licences Creative Commons et respect de la propriété intellectuelle", "Règles de citation, utilisation d'images libres de droits et lutte contre le plagiat scolaire.")
    ])
  ])
];

export const info3AC = [
  ch("Unité 1 : Multimédia et traitement de l'image numérique", [
    sec("Formats et retouche graphique", [
      it("cours", "L'image numérique : différence entre image matricielle (pixels) et vectorielle (tracés)", "Résolution en PPP/DPI, définition (largeur x hauteur), profondeur de couleur (RVB / CMJN)."),
      it("cours", "Formats de compression d'images et leurs usages : JPEG, PNG, GIF, SVG", "Transparence, taux de compression avec et sans perte (lossless / lossy)."),
      it("application", "Pratique de la retouche photo : recadrage, ajustement des niveaux, filtres et détourage", "Utilisation d'un logiciel de graphisme libre (GIMP ou équivalent en ligne).")
    ])
  ]),
  ch("Unité 2 : Algorithmique et pensée informatique", [
    sec("Résolution logique de problèmes", [
      it("definition", "Définition rigoureuse d'un algorithme : suite finie et ordonnée d'instructions non ambiguës", "De la recette de cuisine à la programmation : démarche méthodique d'analyse et de décomposition d'un problème."),
      it("cours", "Les variables et constantes : nom, type (Entier, Réel, Caractère, Booléen) et valeur", "Notion d'affectation d'une valeur à une case mémoire (<- ou =)."),
      it("cours", "Les instructions élémentaires d'entrée / sortie : Lire et Écrire", "Interaction avec l'utilisateur : affichage de messages à l'écran et saisie de valeurs au clavier."),
      it("cours", "Représentation graphique d'un algorithme par organigramme (Fléché / Organigramme)", "Symboles normalisés : début/fin, traitement rectangulaire, losange de décision conditionnelle, flèches de liaison.")
    ])
  ]),
  ch("Unité 3 : Programmation visuelle par blocs (Scratch)", [
    sec("Développement de projets interactifs", [
      it("cours", "L'environnement Scratch : lutins (sprites), scènes, blocs d'instructions et coordonnées (X, Y)", "Initialisation de la position et de l'orientation d'un personnage au démarrage du drapeau vert."),
      it("cours", "Les structures alternatives dans Scratch : 'Si ... Alors' et 'Si ... Alors ... Sinon'", "Tests de collision (si touche le bord, si touche la couleur rouge) et gestion des scores."),
      it("cours", "Les structures répétitives : boucles 'Répéter ... fois' et 'Répéter indéfiniment'", "Création d'animations fluides par changement successif de costumes et mouvements cadencés."),
      it("application", "Conception et programmation d'un jeu vidéo interactif complet", "Projet guidé : jeu de labyrinthe, pong ou quizz éducatif avec chronomètre et système de points.")
    ])
  ])
];

export const infoTC = [
  ch("Module 1 : Architecture des ordinateurs et codage de l'information", [
    sec("Circuits, modèle de Von Neumann et logique binaire", [
      it("cours", "Le modèle architectural de John Von Neumann : CPU (UAL + UC), Mémoire Centrale, Bus et Entrées/Sorties", "Cycle d'exécution d'une instruction machine : Recherche (Fetch), Décodage (Decode), Exécution (Execute)."),
      it("cours", "Systèmes de numération : binaire (base 2), décimal (base 10) et hexadécimal (base 16)", "Conversions manuelles et algorithmiques entre bases (divisions successives, puissances de 2)."),
      it("cours", "Codage des caractères : codes ASCII, ISO-8859 et standard universel Unicode (UTF-8)", "Représentation binaire des caractères accentués et des alphabets non latins (arabe, tifinagh)."),
      it("cours", "Algèbre de Boole élémentaire : portes logiques ET, OU, NON, XOR et tables de vérité", "Équations logiques et simplification de circuits combinatoires simples.")
    ])
  ]),
  ch("Module 2 : Réseaux informatiques, adressage et protocoles", [
    sec("Infrastructures et communication réseau", [
      it("cours", "Topologies physiques et logiques de réseaux : en étoile, en bus, en anneau et maillée", "Rôle des équipements d'interconnexion : commutateurs (switches), routeurs et points d'accès Wi-Fi."),
      it("cours", "Les modèles en couches : modèle OSI (7 couches) et modèle Internet TCP/IP (4 couches)", "Encapsulation et décapsulation des paquets de données lors de la transmission."),
      it("cours", "Adressage IPv4 : adresse IP, masque de sous-réseau et adresse de broadcast", "Classes d'adresses (A, B, C), adresses privées et publiques, translation d'adresses NAT."),
      it("cours", "Les protocoles applicatifs majeurs d'Internet : DNS, HTTP/HTTPS, FTP, SMTP/IMAP", "Résolution de noms de domaine, sécurisation des échanges par chiffrement SSL/TLS.")
    ])
  ]),
  ch("Module 3 : Algorithmique avancée et structures de données", [
    sec("Conception algorithmique rigoureuse", [
      it("cours", "Structures de contrôle conditionnelles : alternatives simples, complètes et imbriquées", "Syntaxe pseudo-code normalisée, opérateurs logiques et conditions composées."),
      it("cours", "Structures de contrôle itératives : boucle déterministe 'Pour' et boucles conditionnelles 'Tant Que' / 'Répéter'", "Incrémentation, compteurs, accumulateurs et conditions d'arrêt fiables pour éviter les boucles infinies."),
      it("cours", "Structures de données séquentielles : Tableaux à une dimension (vecteurs)", "Déclaration, parcours séquentiel, recherche du maximum, calcul de moyenne et recherche dichotomique dans un tableau trié."),
      it("cours", "Modularité : procédures, fonctions, passage de paramètres et portée des variables (locales vs globales)", "Décomposition d'un algorithme complexe en sous-programmes indépendants et réutilisables.")
    ])
  ]),
  ch("Module 4 : Programmation structurée en langage Python", [
    sec("De l'algorithme au code exécutable", [
      it("cours", "Syntaxe fondamentale de Python : typage dynamique, indentation obligatoire et fonctions print() / input()", "Conversion explicite de types (int(), float(), str()) et bonnes pratiques PEP 8."),
      it("cours", "Structures de données natives en Python : listes, tuples et dictionnaires", "Méthodes usuelles sur les listes : append(), extend(), pop(), slicing ([start:end:step])."),
      it("cours", "Définition de fonctions en Python : mot-clé 'def', arguments par défaut et valeur de retour 'return'", "Documentation des fonctions avec des docstrings claires."),
      it("application", "Projet algorithmique en Python : traitement de données et simulation mathématique", "Exemple : algorithme d'Euclide pour le PGCD, crible d'Ératosthène ou traitement de données statistiques d'élèves.")
    ])
  ])
];
