import { ch, sec, it } from '../curriculum-builder-helpers.mjs';

export const compta1BAC = [
  ch("Module 1 : Les principes comptables et les états de synthèse selon le PCGM", [
    sec("Les fondements et postulats comptables", [
      it("cours", "Le rôle légal, fiscal et managérial de la comptabilité selon le Plan Comptable Général Marocain (PCGM)", "Normalisation comptable nationale, transparence financière et obligations du Code de Commerce."),
      it("loi", "Les sept principes comptables fondamentaux du PCGM", "Continuité d'exploitation, permanence des méthodes, coût historique, spécialisation des exercices, prudence, clarté, importance significative."),
      it("definition", "Le Bilan comptable : Actif (emplois) et Passif (ressources) - L'équilibre financier fondamental", "Actif immobilisé, actif circulant, trésorerie-actif face au financement permanent, passif circulant et trésorerie-passif."),
      it("cours", "Le Compte de Produits et Charges (CPC) et formation du résultat net", "Produits d'exploitation, charges d'exploitation, résultat financier, résultat non courant et impôt sur les sociétés (IS).")
    ])
  ]),
  ch("Module 2 : L'organisation comptable normalisée et la partie double", [
    sec("De la pièce justificative aux livres légaux", [
      it("cours", "La notion de compte et le principe universel de la partie double (Débit = Crédit)", "Fonctionnement des comptes d'actif, de passif, de charges et de produits."),
      it("cours", "La nomenclature comptable marocaine : plan de comptes à 5 classes de bilan et 3 classes de gestion", "Structure décimale des numéros de comptes normalisés."),
      it("methode", "Le processus d'enregistrement : Pièce justificative, Livre-Journal, Grand-Livre et Balance générale", "Contrôle d'exactitude par la balance avant inventaire (égalité des sommes et des soldes).")
    ])
  ]),
  ch("Module 3 : Les opérations courantes de facturation et de règlement", [
    sec("Factures d'achats et de ventes avec réductions et TVA", [
      it("methode", "Enregistrement des factures de 'Doit' et d'Avoir' comportant des réductions commerciales et financières", "Rabais, remises, ristournes (calcul en cascade du Net Commercial) et escompte de règlement (Net Financier)."),
      it("cours", "La Taxe sur la Valeur Ajoutée (TVA) : TVA facturée, TVA récupérable sur charges et immobilisations, TVA due", "Mécanisme de déduction, prorata de déduction et déclaration fiscale périodique."),
      it("methode", "Comptabilisation des moyens de règlement : espèces, chèques bancaires et effets de commerce", "Lettre de change (traite) et billet à ordre : création, acceptation, endossement, remise à l'encaissement et à l'escompte.")
    ])
  ]),
  ch("Module 4 : Initiation aux mathématiques financières", [
    sec("L'intérêt simple et le calcul d'escompte", [
      it("cours", "Calcul de l'intérêt simple : formule générale I = (C * t * n) / 36000 et valeur acquise", "Prêts et emprunts à court terme, placement bancaire."),
      it("methode", "L'escompte commercial d'un effet de commerce et calcul des agios bancaires", "Escompte, commissions bancaires, TVA sur agios et valeur nette encaissée par l'entreprise.")
    ])
  ])
];

export const compta2BAC = [
  ch("Module 1 : Les travaux de fin d'exercice (Travaux d'inventaire)", [
    sec("Les amortissements des immobilisations", [
      it("definition", "L'amortissement pour dépréciation : constatation de la perte irréversible de valeur d'une immobilisation", "Rôle économique, financier et fiscal de l'amortissement."),
      it("cours", "Le système d'amortissement linéaire (constant) : base amortissable, taux, annuité et tableau d'amortissement", "Application du prorata temporis pour les acquisitions en cours d'exercice."),
      it("cours", "Le système d'amortissement dégressif selon la réglementation fiscale marocaine", "Calcul avec les coefficients fiscaux légaux (1,5 pour 3-4 ans ; 2 pour 5-6 ans ; 3 pour plus de 6 ans) et bascule vers le linéaire."),
      it("methode", "Comptabilisation des dotations d'exploitation aux amortissements (DEA) et cessions d'immobilisations", "Écritures de régularisation : sortie du bien, annulation des amortissements cumulés et calcul de la VNA.")
    ]),
    sec("Les provisions pour dépréciation et provisions pour risques et charges", [
      it("cours", "Provisions pour dépréciation des éléments d'actif : immobilisations non amortissables, stocks et titres", "Terrains, fonds commercial, stocks de marchandises et Titres de Participation (TP) / TVP."),
      it("cours", "Dépréciation des créances clients : clients douteux ou litigieux, créances irrécouvrables", "Calcul de la provision sur le montant hors taxe (HT) et régularisation de la TVA sur perte."),
      it("cours", "Les provisions durables et momentanées pour risques et charges", "Provisions pour litiges avec les salariés ou clients, garanties données, et amendes fiscales probables.")
    ]),
    sec("Les autres régularisations d'inventaire", [
      it("methode", "Régularisation des comptes de charges et de produits pour respecter l'indépendance des exercices", "Charges à payer (factures non parvenues), charges constatées d'avance (CCA), produits à recevoir et produits constatés d'avance (PCA)."),
      it("cours", "Écarts de conversion actif et passif sur créances et dettes libellées en monnaies étrangères", "Application du principe de prudence et constitution de provision pour perte de change.")
    ])
  ]),
  ch("Module 2 : Analyse financière et diagnostic de santé de l'entreprise", [
    sec("L'État des Soldes de Gestion (ESG) et la Capacité d'Autofinancement", [
      it("cours", "Le Tableau de Formation du Résultat (TFR) : soldes intermédiaires de gestion", "Marge commerciale, Production de l'exercice, Valeur Ajoutée (VA), Excédent Brut d'Exploitation (EBE), Résultat d'exploitation, Résultat courant, Résultat net."),
      it("cours", "La Capacité d'Autofinancement (CAF) : méthode additive (à partir du résultat net) et soustractive (à partir de l'EBE)", "Mesure du potentiel de financement interne des investissements de l'entreprise et versement des dividendes.")
    ]),
    sec("Le bilan fonctionnel et l'analyse de l'équilibre financier", [
      it("cours", "Construction du Bilan Fonctionnel condensé à partir du bilan comptable", "Emplois stables, actif circulant d'exploitation et hors exploitation, trésorerie-actif face aux ressources stables, passif circulant et trésorerie-passif."),
      it("loi", "Les indicateurs de l'équilibre financier fondamental : FRF, BFR et Trésorerie Nette", "Fonds de Roulement Fonctionnel (Ressources stables - Emplois stables), Besoin en Fonds de Roulement (Actif circulant HT - Passif circulant HT) et relation fondamentale : TN = FRF - BFR."),
      it("cours", "L'analyse par la méthode des ratios financiers", "Ratios de structure financière (autonomie financière, solvabilité générale), de liquidité (générale, réduite, immédiate) et de rentabilité (commerciale, financière ROE).")
    ])
  ]),
  ch("Module 3 : Mathématiques financières approfondies", [
    sec("Les opérations financières à long terme", [
      it("cours", "Les intérêts composés : formule de la valeur acquise Cn = C0 * (1 + i)^n et de la valeur actuelle C0", "Placement à moyen et long terme, taux proportionnels et taux équivalents."),
      it("cours", "Les annuités constantes de fin de période : constitution de capital et amortissement d'un emprunt indivis", "Formules de calcul du capital emprunté, de l'annuité constante et élaboration du tableau d'amortissement de l'emprunt.")
    ])
  ])
];

export const droit1BAC = [
  ch("Module 1 : Introduction générale à l'étude du droit objectif", [
    sec("La règle de droit et ses caractères distinctifs", [
      it("definition", "Définition du droit objectif et distinction fondamentale entre Droit, Morale et Religion", "Le droit comme ensemble des règles de conduite régissant les hommes vivant en société."),
      it("cours", "Les caractères essentiels de la règle de droit : générale, impersonnelle, abstraite, permanente et coercitive", "L'intervention de la contrainte étatique (sanctions civiles, pénales, administratives) pour faire respecter la règle."),
      it("cours", "Les grandes divisions du droit : Droit Public (constitutionnel, administratif, finances publiques) et Droit Privé (civil, commercial, travail)", "Critère de la présence de la puissance publique et des prérogatives de puissance publique."),
      it("cours", "Les sources du droit marocain : sources formelles directes et sources d'interprétation", "La Constitution marocaine de 2011, la Loi votée par le Parlement, les Règlements (décrets), la Coutume ('Orf), la Jurisprudence et la Doctrine.")
    ])
  ]),
  ch("Module 2 : L'organisation judiciaire du Royaume du Maroc", [
    sec("Les juridictions et les principes directeurs de la justice marocaine", [
      it("cours", "La carte judiciaire marocaine : Juridictions de premier degré (TPI), de second degré (Cours d'Appel) et Cour de Cassation", "Compétence d'attribution (ratione materiae) et compétence territoriale (ratione loci)."),
      it("cours", "Les juridictions spécialisées : Tribunaux et Cours d'Appel de Commerce, Tribunaux et Cours d'Appel Administratifs", "Règlement des litiges commerciaux entre commerçants et contrôle de la légalité des actes de l'Administration."),
      it("cours", "Les principes fondamentaux de la justice : gratuité, égalité devant la justice, double degré de juridiction, collégialité et publicité des audiences", "Garanties d'un procès équitable et indépendance constitutionnelle du pouvoir judiciaire.")
    ])
  ]),
  ch("Module 3 : Les droits subjectifs et la personnalité juridique", [
    sec("Les personnes physiques et morales", [
      it("cours", "La personnalité juridique des personnes physiques : acquisition à la naissance et perte au décès", "Éléments d'individualisation : nom patronymique, prénom, domicile, état civil et nationalité marocaine."),
      it("cours", "La capacité juridique selon le Code de la Famille marocain (Moudawana) : capacité de jouissance et capacité d'exercice", "Minorité, régimes de tutelle légale, testamentaire, datée, et cas d'incapacité (démence, prodigalité, faiblesse d'esprit)."),
      it("cours", "La personnalité juridique des personnes morales : personnes morales de droit public et de droit privé (sociétés, associations)", "Patrimoine propre, autonomie financière, représentation légale et responsabilité juridique.")
    ]),
    sec("Les actes et les faits juridiques", [
      it("cours", "Classification des sources des droits subjectifs : actes juridiques conventionnels vs faits juridiques involontaires", "Responsabilité contractuelle vs responsabilité délictuelle et quasi-délictuelle (faute, dommage, lien de causalité)."),
      it("cours", "La théorie générale des contrats selon le Dahir des Obligations et Contrats (DOC marocain)", "Conditions de validité d'un contrat : consentement mutuel exempt de vices (erreur, dol, violence), capacité de contracter, objet licite et déterminé, cause conforme à l'ordre public et aux bonnes mœurs.")
    ])
  ])
];

export const droit2BAC = [
  ch("Module 1 : Le droit commercial et le statut légal du commerçant", [
    sec("Les actes de commerce et les obligations du commerçant", [
      it("cours", "La qualification des actes de commerce : par nature, par la forme (lettre de change) et par accessoire", "Différence fondamentale de régime juridique entre acte civil et acte commercial (solidarité des débiteurs, preuve libre)."),
      it("cours", "L'acquisition de la qualité de commerçant et les incompatibilités légales", "Exercice d'actes de commerce à titre de profession habituelle en son nom et pour son propre compte."),
      it("cours", "Les obligations professionnelles du commerçant : immatriculation au Registre du Commerce (RC) et tenue des livres comptables", "Rôle d'opposabilité du RC, conservation décennale des livres légaux (journal et grand-livre) et valeur probante."),
      it("cours", "Le fonds de commerce : éléments constitutifs corporels (matériel, marchandises) et incorporels (clientèle, achalandage, nom commercial, droit au bail)", "Nature juridique du fonds comme bien meuble incorporel et opérations juridiques : vente, apport en société, nantissement et location-gérance.")
    ]),
    sec("Le droit des sociétés commerciales au Maroc", [
      it("cours", "Typologie des sociétés commerciales : sociétés de capitaux (Société Anonyme SA) vs sociétés de personnes / hybrides (SARL, SNC)", "Caractéristiques de la SARL (responsabilité limitée aux apports, capital minimum librement fixé) et de la SA (conseil d'administration, directoire, appel public à l'épargne)."),
      it("cours", "Constitution, fonctionnement, assemblées générales ordinaires/extraordinaires et dissolution des sociétés", "Droits financiers des associés (dividendes, boni de liquidation) et droits politiques (droit de vote, droit d'information).")
    ])
  ]),
  ch("Module 2 : Le droit du travail et de la sécurité sociale (Code du Travail)", [
    sec("La relation individuelle de travail", [
      it("cours", "Le contrat de travail : définition, critères constitutifs (prestation de travail, rémunération, lien de subordination juridique)", "Formes de contrats : Contrat à Durée Indéterminée (CDI), Contrat à Durée Déterminée (CDD - cas limitatifs), contrat intérimaire et période d'essai."),
      it("cours", "Les obligations légales de l'employeur et du salarié : durée légale du travail, repos hebdomadaire, congés payés et SMIG", "Réglementation marocaine : 44 heures par semaine (2288 heures/an), sécurité et hygiène au travail."),
      it("cours", "La cessation du contrat de travail : démission, départ à la retraite et licenciement", "Distinction capitale entre licenciement pour faute grave (sans préavis ni indemnités) et licenciement abusif (indemnité de préavis, de licenciement, et dommages-intérêts).")
    ]),
    sec("Les relations collectives et la protection sociale", [
      it("cours", "La représentation collective du personnel et le dialogue social", "Délégués des salariés, comité d'entreprise, liberté syndicale, négociation des conventions collectives de travail et exercice encadré du droit de grève."),
      it("cours", "Le rôle de l'Inspection du Travail dans le contrôle et la conciliation des conflits", "Visites de contrôle dans les entreprises et procès-verbaux d'infraction."),
      it("cours", "Le régime marocain de Sécurité Sociale (CNSS) et l'Assurance Maladie Obligatoire (AMO)", "Affiliation de l'entreprise, immatriculation des salariés, prestations familiales, indemnités journalières de maladie, pension de retraite et couverture médicale universelle.")
    ])
  ])
];
