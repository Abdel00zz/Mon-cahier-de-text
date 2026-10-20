import { ch, sec, it } from '../curriculum-builder-helpers.mjs';

export const eco1BAC = [
  ch("Partie 1 : Économie Générale et Statistique (EGS) - Fondements et Mécanismes", [
    sec("Les concepts fondamentaux de l'analyse économique", [
      it("definition", "La notion de besoin économique, de bien (libre et économique) et le problème de la rareté", "Hiérarchie des besoins (pyramide de Maslow), caractéristiques des biens et rareté relative."),
      it("cours", "Les agents économiques institutionnels et leurs fonctions principales", "Ménages (consommation), Sociétés non financières (production de biens et services marchands), Sociétés financières (intermédiation financière), Administrations publiques (redistribution et services non marchands), Reste du monde."),
      it("cours", "Les opérations économiques et le circuit économique global", "Opérations sur biens et services, opérations de répartition (salaires, impôts, cotisations) et opérations financières. Modélisation des flux réels et monétaires.")
    ]),
    sec("Le fonctionnement du marché et la fixation des prix", [
      it("cours", "La notion de marché et ses composantes : offre, demande et prix", "Marché des biens et services, marché du travail et marché des capitaux."),
      it("loi", "La loi de l'offre et de la demande et détermination du prix d'équilibre", "Mécanisme d'ajustement automatique sur un marché concurrentiel et calcul des élasticités-prix de la demande et de l'offre."),
      it("cours", "La monnaie et le système financier : formes, fonctions et création monétaire", "Monnaie fiduciaire, divisionnaire et scripturale ; agrégats monétaires (M1, M2, M3) et rôle régulateur de Bank Al-Maghrib.")
    ]),
    sec("Statistique descriptive appliquée à l'économie", [
      it("methode", "Collecte des données, séries statistiques simples et tableaux de fréquences", "Effectifs, fréquences relatives, pourcentages et effectifs cumulés croissants."),
      it("cours", "Les caractéristiques de tendance centrale : moyenne arithmétique simple et pondérée, médiane et mode", "Calculs pas à pas et interprétation économique concrète."),
      it("cours", "Les caractéristiques de dispersion : étendue, variance et écart-type", "Mesure de l'homogénéité d'une distribution de salaires ou de prix.")
    ])
  ]),
  ch("Partie 2 : Économie et Organisation des Entreprises (EOAE) - L'Entreprise et son Fonctionnement", [
    sec("L'entreprise dans son tissu économique et ses structures", [
      it("cours", "Définition juridique et économique de l'entreprise et critères de classification", "Classification par taille (TPE, PME, grande entreprise), par secteur d'activité (primaire, secondaire, tertiaire) et par forme juridique (SARL, SA, entreprise individuelle)."),
      it("cours", "L'environnement micro et macroéconomique de l'entreprise (modèle PESTEL)", "Facteurs Politiques, Économiques, Socioculturels, Technologiques, Écologiques et Légaux."),
      it("cours", "Les structures organisationnelles classiques et modernes", "Structure hiérarchique (Fayol), fonctionnelle (Taylor), hiérarchico-fonctionnelle (Staff and line), divisionnelle et matricielle. Représentation par organigramme.")
    ]),
    sec("Les grandes fonctions opérationnelles de l'entreprise", [
      it("cours", "La fonction commerciale et la démarche mercatique (Marketing Mix : les 4P)", "Politique de Produit (cycle de vie, gamme), de Prix (écrémage, pénétration, alignement), de Distribution (canaux courts, longs) et de Communication (publicité, promotion)."),
      it("cours", "La fonction approvisionnement et gestion des stocks", "Calcul du stock d'alerte, stock de sécurité, méthode de réapprovisionnement économique de Wilson et méthode ABC (20/80)."),
      it("cours", "La fonction financière : cycle d'exploitation et cycle d'investissement", "Besoins de financement du BFR et des immobilisations, et modes de financement (autofinancement, crédit bancaire, crédit-bail/leasing, émission d'actions).")
    ])
  ])
];

export const eco2BAC = [
  ch("Module 1 : Économie Générale et Statistique (EGS) - Régulation et Déséquilibres Macroéconomiques", [
    sec("Le marché, la concurrence et les agrégats de la comptabilité nationale", [
      it("cours", "Les structures de marché : concurrence pure et parfaite (CPP) versus concurrence imparfaite", "Conditions de la CPP (atomicité, homogénéité, transparence, libre entrée, mobilité) face aux monopoles, oligopoles et cartels réels."),
      it("cours", "Les agrégats de la comptabilité nationale marocaine", "Calcul et analyse du Produit Intérieur Brut (PIB marchand et non marchand), Revenu National Brut Disponible (RNBD), Épargne Nationale Brute (ENB) et Formation Brute de Capital Fixe (FBCF)."),
      it("cours", "Les limites du PIB comme indicateur de bien-être réel", "Non prise en compte de l'économie informelle, du travail domestique bénévole et des dégradations écologiques.")
    ]),
    sec("Les dysfonctionnements majeurs : Inflation et Chômage", [
      it("cours", "L'inflation : mesure par l'Indice des Prix à la Consommation (IPC), causes et conséquences", "Inflation par la demande, par les coûts des matières premières importées, ou par création monétaire excessive. Effets néfastes sur le pouvoir d'achat et la compétitivité."),
      it("cours", "Le chômage : définitions officielles du HCP et du BIT, typologie et mesures statistiques", "Chômage conjoncturel, structurel, frictionnel et technologique ; analyse des caractéristiques du chômage au Maroc (diplômés, jeunes, femmes, milieu urbain).")
    ]),
    sec("Les politiques économiques de régulation", [
      it("cours", "La politique monétaire de Bank Al-Maghrib : objectifs et instruments d'intervention", "Stabilité des prix, manipulation du taux directeur, réserves obligatoires et opérations d'injection de liquidités (Open Market)."),
      it("cours", "La politique budgétaire de l'État : Loi de Finances, déficit public et endettement", "Effet multiplicateur keynésien des dépenses publiques, balance entre relance économique et rigueur d'assainissement budgétaire.")
    ])
  ]),
  ch("Module 2 : Économie Générale - Ouverture Internationale et Développement Durable", [
    sec("Commerce international, balance des paiements et marché des changes", [
      it("cours", "Les théories du commerce international : libre-échange vs protectionnisme", "Théorie des avantages absolus d'Adam Smith, des avantages comparatifs de David Ricardo, modèle HOS, et protectionnisme éducateur de Friedrich List."),
      it("cours", "La balance des paiements marocaine et ses composantes", "Compte des transactions courantes (balance commerciale des biens, balance des services, revenus primaires et transferts des MRE), compte de capital et compte financier."),
      it("cours", "Le marché des changes et le régime de change du Dirham marocain", "Régime de change à flexibilité progressive encadrée par Bank Al-Maghrib basé sur le panier de devises (60% Euro, 40% Dollar américain).")
    ]),
    sec("Croissance économique, développement et mondialisation", [
      it("cours", "Croissance économique versus développement humain durable (Indice IDH)", "Mesure du développement par l'espérance de vie, le niveau d'instruction et le RNB par habitant."),
      it("cours", "La mondialisation économique et le rôle des institutions internationales (FMI, Banque Mondiale, OMC)", "Libéralisation des flux de capitaux, accords de libre-échange signés par le Maroc (avec l'UE, les USA, la Turquie).")
    ])
  ]),
  ch("Module 3 : Économie et Organisation des Entreprises (EOAE) - Management Stratégique", [
    sec("Diagnostic et options stratégiques de l'entreprise", [
      it("cours", "La démarche stratégique : finalités, objectifs et diagnostic stratégique global (SWOT)", "Diagnostic interne (forces et faiblesses, chaîne de valeur de Michael Porter) et externe (opportunités et menaces de l'environnement)."),
      it("cours", "Les stratégies concurrentielles génériques de Porter", "Domination globale par les coûts, différenciation des produits, et stratégie de focalisation (niche de marché)."),
      it("cours", "Les stratégies de développement : spécialisation, diversification, intégration et externalisation", "Avantages comparés de la concentration sur le cœur de métier face à la répartition des risques par diversification.")
    ]),
    sec("Croissance, Gestion des Ressources Humaines (GRH) et Responsabilité Sociétale", [
      it("cours", "Les voies de croissance de l'entreprise : croissance interne, externe et conjointe", "Avantages de la croissance interne face à la rapidité des fusions-acquisitions et à la souplesse des partenariats (joint-ventures, franchises)."),
      it("cours", "La Gestion des Ressources Humaines (GRH) : recrutement, rémunération, formation et motivation", "Politique salariale équitable, gestion prévisionnelle des emplois et des compétences (GPEC), dialogue social et climat d'entreprise."),
      it("cours", "La démarche qualité totale et la Responsabilité Sociale et Environnementale (RSE)", "Certifications ISO (9001 qualité, 14001 environnement, 45001 santé-sécurité), éthique d'entreprise et impact sur la marque employeur.")
    ])
  ])
];
