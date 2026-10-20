import { ch, sec, it } from '../curriculum-builder-helpers.mjs';

export const svtTCS = [
  ch("Chapitre 1 : Les facteurs édaphiques et leur influence sur les êtres vivants", [
    sec("Le sol : composantes et propriétés", [
      it("observation", "Observation et mise en évidence des constituants du sol (minéraux, matière organique, eau, air)"),
      it("cours", "Propriétés physiques du sol : texture, structure et perméabilité"),
      it("cours", "Le complexe argilo-humique et capacité de rétention d'eau"),
      it("application", "Rôle des êtres vivants dans la formation et l'évolution du sol")
    ])
  ]),
  ch("Chapitre 2 : Les facteurs climatiques et répartition des végétaux et animaux", [
    sec("Mesures et diagrammes climatiques", [
      it("cours", "Mesure des composantes du climat : température, pluviométrie, humidité, ensoleillement"),
      it("methode", "Tracé et exploitation du diagramme ombrothermique de Gaussen et du climagramme d'Emberger"),
      it("conclusion", "Relation entre les étages bioclimatiques et la répartition de la végétation au Maroc")
    ])
  ]),
  ch("Chapitre 3 : Flux de matière et d'énergie dans l'écosystème", [
    sec("Réseaux trophiques et pyramides écologiques", [
      it("definition", "Notion d'écosystème : biocénose et biotope"),
      it("cours", "Les niveaux trophiques : producteurs primaires, consommateurs et décomposeurs"),
      it("methode", "Construction des pyramides de nombres, de biomasse et d'énergie"),
      it("cours", "Rendement écologique et flux unidirectionnel de l'énergie solaire")
    ])
  ]),
  ch("Chapitre 4 : Les équilibres naturels et l'impact de l'Homme", [
    sec("Gestion durable des ressources", [
      it("cours", "Dynamique et résilience des écosystèmes naturels"),
      it("cours", "Impacts négatifs des activités humaines : déforestation, surpâturage, pollution et désertification"),
      it("conclusion", "Stratégies nationales de protection de l'environnement et développement durable")
    ])
  ]),
  ch("Chapitre 5 : La reproduction sexuée chez les plantes à fleurs (Angiospermes)", [
    sec("Organisation florale et pollinisation", [
      it("observation", "Dissection florale et identification des pièces stériles et fertiles (étamines, pistil)"),
      it("cours", "Formation des grains de pollen et du sac embryonnaire"),
      it("cours", "Pollinisation, germination du grain de pollen et double fécondation caractéristique des angiospermes"),
      it("cours", "Transformation de la fleur en fruit et de l'ovule en graine")
    ])
  ]),
  ch("Chapitre 6 : La reproduction sexuée chez les Gymnospermes", [
    sec("Reproduction chez le pin", [
      it("observation", "Organisation des cônes mâles et des cônes femelles"),
      it("cours", "Formation des gamètes et fécondation simple"),
      it("cours", "Cycle de développement comparé des gymnospermes et angiospermes")
    ])
  ]),
  ch("Chapitre 7 : La reproduction asexuée (multiplication végétative)", [
    sec("Modes de multiplication végétative", [
      it("cours", "Multiplication par organes spécialisés : tubercules, bulbes, rhizomes et stolons"),
      it("methode", "Techniques agronomiques : bouturage, marcottage, greffage et micropropagation in vitro")
    ])
  ])
];

export const svt1BAC_SE = [
  ch("Chapitre 1 : Les phénomènes géologiques externes et paléogéographie", [
    sec("Reconstitution des paysages anciens", [
      it("observation", "Étude des figures sédimentaires : rides de courant, fentes de dessiccation, stratification"),
      it("cours", "Granulométrie et morphoscopie des grains de quartz (émoussés luisants, ronds mats)"),
      it("cours", "Conditions et milieux de sédimentation continentaux, intermédiaires et marins"),
      it("application", "Reconstitution paléogéographique d'un bassin sédimentaire phosphaté marocain")
    ])
  ]),
  ch("Chapitre 2 : Principes stratigraphiques et échelle des temps géologiques", [
    sec("Chronologie relative et absolue", [
      it("loi", "Principes stratigraphiques : superposition, continuité, recoupement, inclusion et identité paléontologique"),
      it("cours", "Notion de fossile stratigraphique et fossile de faciès"),
      it("cours", "Établissement de la carte géologique et réalisation de coupes géologiques")
    ])
  ]),
  ch("Chapitre 3 : Production de matière organique par les végétaux chlorophylliens", [
    sec("Absorption et photosynthèse", [
      it("cours", "Mécanismes d'absorption de l'eau et des sels minéraux : osmose, pression osmotique, poils absorbants"),
      it("cours", "Échanges gazeux chlorophylliens et stomates"),
      it("cours", "Pigments chlorophylliens : spectre d'absorption et spectre d'action photosynthétique"),
      it("loi", "Phase photochimique (dépendante de la lumière) et phase thermochimique (cycle de Calvin)")
    ])
  ]),
  ch("Chapitre 4 : La communication nerveuse", [
    sec("Le message nerveux", [
      it("cours", "Structure du système nerveux : neurone, axone, gaine de myéline et nerf"),
      it("loi", "Potentiel de repos membranaire (environ $-70\\text{ mV}$) et répartition ionique ($Na^+/K^+$)"),
      it("loi", "Potentiel d'action : dépolarisation, repolarisation, hyperpolarisation et loi du tout ou rien"),
      it("cours", "Transmission synaptique : synapse chimique, neurotransmetteurs (acétylcholine), PPSE et PPSI")
    ])
  ]),
  ch("Chapitre 5 : La communication hormonale : régulation de la glycémie", [
    sec("Homéostasie glycémique", [
      it("definition", "Définition de la glycémie et valeur de consigne ($1\\text{ g/L}$)"),
      it("cours", "Rôle du pancréas endocrine : îlots de Langerhans, cellules $\\alpha$ (glucagon) et cellules $\\beta$ (insuline)"),
      it("cours", "Action de l'insuline (hormone hypoglycémiante) et du glucagon (hormone hyperglycémiante) sur les organes cibles")
    ])
  ])
];

export const svt2BAC_PC = [
  ch("Chapitre 1 : Consommation de la matière organique et libération d'énergie", [
    sec("Respiration cellulaire et fermentation", [
      it("cours", "Voies métaboliques : glycolyse dans le cytoplasme (hyaloplasme) avec production de pyruvate et d'$ATP$"),
      it("cours", "Cycle de Krebs dans la matrice mitochondriale et production de coenzymes réduits ($NADH, H^+$, $FADH_2$)"),
      it("loi", "Chaîne respiratoire et phosphorylation oxydative sur la membrane interne mitochondriale"),
      it("cours", "Les fermentations : lactique et alcoolique, et bilan énergétique comparé (rendement)")
    ])
  ]),
  ch("Chapitre 2 : Rôle du muscle squelettique dans la conversion d'énergie", [
    sec("Contraction musculaire et ATP", [
      it("observation", "Enregistrement du myogramme : secousse isolée, tétanos imparfait et parfait"),
      it("cours", "Structure moléculaire du sarcomère : filaments fins d'actine et filaments épais de myosine"),
      it("cours", "Mécanisme moléculaire du glissement des myofilaments en présence d'$ATP$ et d'ions $Ca^{2+}$"),
      it("cours", "Voies de régénération de l'$ATP$ musculaire (anaérobie alactique, anaérobie lactique, aérobie)")
    ])
  ]),
  ch("Chapitre 3 : Nature et mécanisme de l'expression du matériel génétique", [
    sec("L'information génétique (ADN)", [
      it("experience", "Expériences historiques : Griffith, Avery, Hershey et Chase"),
      it("cours", "Structure de la molécule d'ADN en double hélice (Watson et Crick) et complémentarité des bases"),
      it("loi", "Réplication semi-conservative de l'ADN pendant la phase S de l'interphase"),
      it("cours", "Expression génétique : transcription de l'ADN en ARNm et traduction avec le code génétique")
    ])
  ]),
  ch("Chapitre 4 : Transmission de l'information génétique par la reproduction sexuée", [
    sec("Méiose et fécondation", [
      it("cours", "Les étapes de la méiose : division réductionnelle et division équationnelle"),
      it("cours", "Brassage interchromosomique (anaphase I) et brassage intrachromosomique (crossing-over en prophase I)"),
      it("conclusion", "Rôle amplificateur de la fécondation dans la diversité génétique des individus")
    ])
  ]),
  ch("Chapitre 5 : Les lois statistiques de la transmission des caractères héréditaires", [
    sec("Génétique mendélienne chez les diploïdes", [
      it("loi", "Monohybridisme : dominance complète, codominance, gènes létaux et gènes liés au sexe ($X$)"),
      it("loi", "Dihybridisme : gènes indépendants (proportions $9:3:3:1$) et gènes liés (linkage et calcul de la distance en cM)")
    ])
  ]),
  ch("Chapitre 6 : Les phénomènes géologiques accompagnant la formation des chaînes de montagnes", [
    sec("Tectonique des plaques et orogenèse", [
      it("cours", "Chaînes de subduction (Andes) : caractéristiques structurales, volcanisme andésitique et plutonisme"),
      it("cours", "Chaînes d'obduction (Oman) : charriage de croûte océanique (ophiolites) sur la marge continentale"),
      it("cours", "Chaînes de collision (Himalaya) : suture ophiolitique, plis, failles inverses et épaississement crustal"),
      it("cours", "Le métamorphisme thermo-dynamique et faciès de haute pression, et anatexie (granitisation)")
    ])
  ])
];

export const svt2BAC_SMA = [
  ...svt2BAC_PC,
  ch("Chapitre 7 : Immunologie : Le système immunitaire (Spécifique SMA)", [
    sec("Défenses de l'organisme", [
      it("cours", "Soi et non-soi : complexes majeurs d'histocompatibilité (CMH I et II) et antigènes"),
      it("cours", "Immunité innée : réaction inflammatoire aiguë, phagocytose par les macrophages et polynucléaires"),
      it("cours", "Immunité adaptative humorale (lymphocytes B, plasmocytes, anticorps) et cellulaire (lymphocytes T cytotoxiques)"),
      it("cours", "Dysfonctionnements immunitaires : allergies, maladies auto-immunes et déficit du SIDA")
    ])
  ])
];
