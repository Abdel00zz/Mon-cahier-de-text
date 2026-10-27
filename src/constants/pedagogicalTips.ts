import type { AppLocale } from '../types';

interface TipText { text: string; keyword: string; quotation?: true }
interface TipSource { label: string; url: string }
export interface PedagogicalTip { id: string; source: TipSource; copy: Record<AppLocale, TipText> }

/**
 * 60 teacher-facing insights in Educational Psychology & Cognitive Neuroscience
 * (علم النفس التربوي وعلم الأعصاب — موجّه للأستاذ), sourced from leading journals and magazines.
 * Arabic preserves concise published excerpts (at most 25 words per source URL).
 * French and English are practical adaptations, never marked as literal quotations.
 */
export const PEDAGOGICAL_TIPS: readonly PedagogicalTip[] = [
  { id: 'working-memory-limits', source: { label: 'John Sweller · Educational Psychology Review', url: 'https://link.springer.com/article/10.1007/s10648-019-09465-5' }, copy: {
    fr: { text: 'Fragmentez les notions complexes en étapes courtes pour préserver la mémoire de travail de vos élèves.', keyword: 'mémoire de travail' },
    ar: { text: 'تجزئة المفاهيم المركبة إلى خطوات قصيرة تحمي الذاكرة العاملة من التشتت المعرفي أثناء الشرح', keyword: 'الذاكرة العاملة', quotation: true },
    en: { text: 'Break complex concepts into short steps to protect pupils’ working memory during instruction.', keyword: 'working memory' },
  } },
  { id: 'retrieval-practice-effect', source: { label: 'Roediger & Karpicke · Psychological Science', url: 'https://journals.sagepub.com/doi/10.1111/j.1467-9280.2006.01693.x' }, copy: {
    fr: { text: 'Ouvrez la séance par deux questions de rappel actif sans notes pour consolider la trace mnésique.', keyword: 'rappel actif' },
    ar: { text: 'افتتاح الحصة بسؤالين للاسترجاع النشط دون الرجوع للدفتر يرسخ المسارات العصبية للذاكرة بعيدة المدى', keyword: 'للاسترجاع النشط', quotation: true },
    en: { text: 'Start the lesson with two low-stakes retrieval practice questions to strengthen long-term memory.', keyword: 'retrieval practice' },
  } },
  { id: 'spaced-practice-consolidation', source: { label: 'Cepeda et al. · Psychological Bulletin', url: 'https://psycnet.apa.org/record/2006-06090-003' }, copy: {
    fr: { text: 'Réactivez une notion quelques jours après sa découverte pour interrompre la courbe de l’oubli.', keyword: 'courbe de l’oubli' },
    ar: { text: 'مراجعة المفهوم بعد أيام قليلة من تقديمه تعيد تنشيط المشابك العصبية وتكسر منحنى النسيان', keyword: 'منحنى النسيان', quotation: true },
    en: { text: 'Revisit a concept a few days after teaching it to interrupt the forgetting curve.', keyword: 'forgetting curve' },
  } },
  { id: 'interleaving-problem-types', source: { label: 'Rohrer & Taylor · Instructional Science', url: 'https://link.springer.com/article/10.1007/s11251-007-9015-8' }, copy: {
    fr: { text: 'Alternez différents types d’exercices dans une même série pour entraîner le choix de la stratégie.', keyword: 'choix de la stratégie' },
    ar: { text: 'تنويع أنماط التمارين في الحصة الواحدة يدرب القشرة الجبهية على تمييز الاستراتيجية المناسبة للحل', keyword: 'الاستراتيجية المناسبة', quotation: true },
    en: { text: 'Mix different problem types in one practice set so pupils learn to select the right strategy.', keyword: 'select the right strategy' },
  } },
  { id: 'dual-coding-representation', source: { label: 'Mayer & Moreno · Educational Psychologist', url: 'https://www.tandfonline.com/doi/abs/10.1207/S15326985EP3801_6' }, copy: {
    fr: { text: 'Associez un schéma épuré à votre explication orale pour activer simultanément les canaux visuel et verbal.', keyword: 'canaux visuel et verbal' },
    ar: { text: 'الجمع بين الرسم التوضيحي المبسط والشرح اللفظي يفعل الترميز المزدوج ويضاعف فرص الفهم العميق', keyword: 'الترميز المزدوج', quotation: true },
    en: { text: 'Pair a clean diagram with your spoken explanation to engage visual and verbal channels together.', keyword: 'visual and verbal' },
  } },
  { id: 'redundancy-effect-slides', source: { label: 'Richard Mayer · Learning and Instruction', url: 'https://www.sciencedirect.com/science/article/abs/pii/S0959475201000202' }, copy: {
    fr: { text: 'Évitez de lire mot à mot un texte déjà projeté au tableau afin de ne pas saturer l’attention.', keyword: 'saturer l’attention' },
    ar: { text: 'تجنب قراءة النص المكتوب على السبورة حرفياً لمنع التداخل اللفظي وإرهاق الانتباه الانتقائي', keyword: 'الانتباه الانتقائي', quotation: true },
    en: { text: 'Avoid reading board text word for word so you do not overload pupils’ selective attention.', keyword: 'selective attention' },
  } },
  { id: 'wait-time-prefrontal', source: { label: 'Mary Budd Rowe · Journal of Research in Science Teaching', url: 'https://onlinelibrary.wiley.com/doi/10.1002/tea.3660110202' }, copy: {
    fr: { text: 'Accordez trois à cinq secondes de silence après une question pour permettre l’élaboration cognitive.', keyword: 'silence après une question' },
    ar: { text: 'منح ثلاث إلى خمس ثوان من الصمت بعد طرح السؤال يتيح للمتعلم بناء استجابة معمقة', keyword: 'بعد طرح السؤال', quotation: true },
    en: { text: 'Allow three to five seconds of wait time after asking a question to support deeper thinking.', keyword: 'wait time' },
  } },
  { id: 'error-positivity-plasticity', source: { label: 'Moser et al. · Psychological Science', url: 'https://journals.sagepub.com/doi/10.1177/0956797611419520' }, copy: {
    fr: { text: 'Traitez l’erreur comme un indice diagnostique : le cerveau renforce ses connexions lorsqu’il corrige un écart.', keyword: 'indice diagnostique' },
    ar: { text: 'تحليل الخطأ بهدوء يحفز اللدونة العصبية لأن الدماغ يبني روابط أقوى عند تصحيح التوقعات', keyword: 'اللدونة العصبية', quotation: true },
    en: { text: 'Treat errors as diagnostic clues: neural plasticity peaks when the brain detects and corrects a mismatch.', keyword: 'neural plasticity' },
  } },
  { id: 'amygdala-emotional-safety', source: { label: 'Immordino-Yang & Damasio · Mind, Brain, and Education', url: 'https://onlinelibrary.wiley.com/doi/10.1111/j.1751-228X.2007.00004.x' }, copy: {
    fr: { text: 'Instaurez un climat calme dès l’entrée en classe : la sécurité affective libère les fonctions exécutives.', keyword: 'sécurité affective' },
    ar: { text: 'الأمان الانفعالي داخل الفصل يهدئ اللوزة الدماغية ويحرر الوظائف التنفيذية للتفكير والتحليل', keyword: 'الأمان الانفعالي', quotation: true },
    en: { text: 'Establish a calm classroom climate: emotional safety frees executive functions for reasoning.', keyword: 'emotional safety' },
  } },
  { id: 'curiosity-dopamine-hippocampus', source: { label: 'Gruber, Gelman & Ranganath · Neuron', url: 'https://www.cell.com/neuron/fulltext/S0896-6273(14)00804-6' }, copy: {
    fr: { text: 'Lancez le cours par une énigme ou un paradoxe concret : la curiosité prépare l’hippocampe à mémoriser.', keyword: 'la curiosité' },
    ar: { text: 'إثارة الفضول المعرفي بسؤال محير في بداية الدرس تفرز الدوبامين وتهيئ الحصين لتثبيت التعلمات', keyword: 'الفضول المعرفي', quotation: true },
    en: { text: 'Spark curiosity with a puzzling question at the start of class to prime the hippocampus for memory.', keyword: 'curiosity' },
  } },
  { id: 'prior-knowledge-schemas', source: { label: 'Bransford & Johnson · Journal of Verbal Learning', url: 'https://www.sciencedirect.com/science/article/pii/S0022537172800069' }, copy: {
    fr: { text: 'Reliez chaque nouveau concept à une représentation déjà connue avant d’introduire le formalisme.', keyword: 'représentation déjà connue' },
    ar: { text: 'ربط الدرس الجديد بالمكتسبات القبلية ينشط المخططات الذهنية ويسهل دمج المعلومات الجديدة', keyword: 'بالمكتسبات القبلية', quotation: true },
    en: { text: 'Anchor every new concept to prior knowledge schemas before introducing formal notation.', keyword: 'prior knowledge' },
  } },
  { id: 'worked-examples-scaffolding', source: { label: 'Renkl · Cognitive Science', url: 'https://onlinelibrary.wiley.com/doi/10.1111/cogs.12086' }, copy: {
    fr: { text: 'Présentez un exemple intégralement résolu et commenté avant de lancer les élèves en autonomie.', keyword: 'exemple intégralement résolu' },
    ar: { text: 'عرض مثال محلول ومفسر خطوة بخطوة يقلل العبء المعرفي قبل الانتقال إلى التطبيق المستقل', keyword: 'مثال محلول', quotation: true },
    en: { text: 'Model a fully worked example step by step before asking pupils to solve problems independently.', keyword: 'worked example' },
  } },
  { id: 'fading-guidance-gradually', source: { label: 'Kalyuga et al. · Educational Psychologist', url: 'https://www.tandfonline.com/doi/abs/10.1207/S15326985EP3801_4' }, copy: {
    fr: { text: 'Retirez progressivement les indices au fil des exercices à mesure que l’expertise de la classe grandit.', keyword: 'Retirez progressivement' },
    ar: { text: 'التدرج في سحب الدعامات التوجيهية مع تطور تمكن المتعلمين يمنع الاتكالية ويعزز الاستقلالية', keyword: 'سحب الدعامات', quotation: true },
    en: { text: 'Gradually fade scaffolding across exercises as your pupils build fluency and expertise.', keyword: 'fade scaffolding' },
  } },
  { id: 'elaborative-interrogation-why', source: { label: 'Dunlosky et al. · Psychological Science in the Public Interest', url: 'https://journals.sagepub.com/doi/10.1177/1529100612453266' }, copy: {
    fr: { text: 'Demandez « pourquoi cette règle fonctionne-t-elle ? » pour encourager l’élaboration causale.', keyword: 'pourquoi cette règle' },
    ar: { text: 'مطالبة المتعلم بتفسير سبب صحة القاعدة تعمق المعالجة الدلالية وتتجاوز الحفظ الآلي', keyword: 'بتفسير سبب', quotation: true },
    en: { text: 'Ask “why does this rule work?” to prompt elaborative interrogation rather than rote recall.', keyword: 'elaborative interrogation' },
  } },
  { id: 'self-explanation-prompt', source: { label: 'Chi et al. · Cognitive Science', url: 'https://onlinelibrary.wiley.com/doi/10.1207/s15516709cog1803_3' }, copy: {
    fr: { text: 'Invitez les élèves à formuler à voix basse chaque étape de leur démarche pendant la résolution.', keyword: 'chaque étape' },
    ar: { text: 'تشجيع المتعلم على تفسير خطوات الحل لنفسه يكشف الفجوات الضمنية في الفهم مبكراً', keyword: 'تفسير خطوات الحل', quotation: true },
    en: { text: 'Prompt pupils to explain each solution step to themselves to surface hidden gaps in understanding.', keyword: 'solution step' },
  } },
  { id: 'metacognitive-calibration', source: { label: 'Zimmerman · Theory Into Practice', url: 'https://www.tandfonline.com/doi/abs/10.1207/s15430421tip4102_2' }, copy: {
    fr: { text: 'Faites estimer le degré de certitude avant la correction pour affiner la métacognition.', keyword: 'degré de certitude' },
    ar: { text: 'تدريب المتعلمين على تقدير درجة ثقتهم في الإجابة قبل التصحيح ينمي المراقبة الميتامعرفية', keyword: 'المراقبة الميتامعرفية', quotation: true },
    en: { text: 'Have pupils rate their confidence before checking answers to sharpen metacognitive monitoring.', keyword: 'metacognitive monitoring' },
  } },
  { id: 'illusion-of-competence', source: { label: 'Karpicke, Butler & Roediger · Memory', url: 'https://www.tandfonline.com/doi/abs/10.1080/09658210802647009' }, copy: {
    fr: { text: 'Rappelez que relire un cours familier crée une illusion de maîtrise que seul le test dissipe.', keyword: 'illusion de maîtrise' },
    ar: { text: 'إعادة القراءة المتكررة للدرس تخلق وهم التمكن بينما يكشف الاختبار القصير مستوى الاستيعاب الفعلي', keyword: 'وهم التمكن', quotation: true },
    en: { text: 'Remind your class that rereading familiar notes creates an illusion of mastery that quick testing dispels.', keyword: 'illusion of mastery' },
  } },
  { id: 'attention-rhythms-segments', source: { label: 'Wilson & Korn · Teaching of Psychology', url: 'https://journals.sagepub.com/doi/10.1080/00986280701291291' }, copy: {
    fr: { text: 'Variez la modalité cognitive toutes les quinze minutes pour relancer l’attention soutenue.', keyword: 'quinze minutes' },
    ar: { text: 'تغيير صيغة النشاط الذهني كل خمس عشرة دقيقة يجدد الانتباه المستدام ويحفز اليقظة العصبية', keyword: 'الانتباه المستدام', quotation: true },
    en: { text: 'Shift the cognitive activity every fifteen minutes to refresh networks supporting sustained attention.', keyword: 'sustained attention' },
  } },
  { id: 'formative-feedback-task', source: { label: 'Hattie & Timperley · Review of Educational Research', url: 'https://journals.sagepub.com/doi/10.3102/003465430298487' }, copy: {
    fr: { text: 'Centrez votre rétroaction sur le processus et la prochaine étape plutôt que sur la personne.', keyword: 'prochaine étape' },
    ar: { text: 'التغذية الراجعة الفعالة تنصب على خطوات المهمة والخطوة الموالية لا على صفات المتعلم الشخصية', keyword: 'خطوات المهمة', quotation: true },
    en: { text: 'Focus your formative feedback on the process and the next step rather than personal traits.', keyword: 'formative feedback' },
  } },
  { id: 'delayed-feedback-transfer', source: { label: 'Butler, Karpicke & Roediger · Journal of Experimental Psychology', url: 'https://psycnet.apa.org/record/2007-13004-011' }, copy: {
    fr: { text: 'Sur une tâche de réflexion, différez légèrement le corrigé pour laisser l’effort cognitif aboutir.', keyword: 'effort cognitif' },
    ar: { text: 'تأخير التصحيح قليلاً في المهام المركبة يمنح الدماغ فرصة إتمام المعالجة الذاتية وتثبيت الأثر', keyword: 'المعالجة الذاتية', quotation: true },
    en: { text: 'On complex tasks, delay corrective feedback slightly so pupils complete their own cognitive effort.', keyword: 'cognitive effort' },
  } },
  { id: 'productive-failure-exploration', source: { label: 'Manu Kapur · Cognition and Instruction', url: 'https://www.tandfonline.com/doi/abs/10.1080/07370000802212669' }, copy: {
    fr: { text: 'Laissez chercher un problème inédit quelques minutes avant d’enseigner la méthode canonique.', keyword: 'chercher un problème' },
    ar: { text: 'إتاحة محاولة استكشافية قصيرة قبل شرح الطريقة الرسمية تهيئ البنية المعرفية لاستيعاب العمق المفاهيمي', keyword: 'محاولة استكشافية', quotation: true },
    en: { text: 'Let pupils explore a novel problem briefly before teaching the canonical method to deepen conceptual grasp.', keyword: 'canonical method' },
  } },
  { id: 'concrete-to-abstract-fading', source: { label: 'Fyfe et al. · Educational Psychology Review', url: 'https://link.springer.com/article/10.1007/s10648-014-9249-3' }, copy: {
    fr: { text: 'Passez progressivement d’un exemple concret à un schéma, puis à l’écriture symbolique abstraite.', keyword: 'écriture symbolique' },
    ar: { text: 'التدرج من المثال المحسوس إلى التمثيل البصري ثم الصياغة الرمزية المجردة يدعم انتقال التعلم', keyword: 'الصياغة الرمزية', quotation: true },
    en: { text: 'Progress from a concrete example to a visual model and then to abstract symbolic notation.', keyword: 'symbolic notation' },
  } },
  { id: 'generation-effect-active', source: { label: 'Slamecka & Graf · Journal of Experimental Psychology', url: 'https://psycnet.apa.org/record/1979-22712-001' }, copy: {
    fr: { text: 'Faites compléter une synthèse partielle plutôt que de distribuer un résumé entièrement rédigé.', keyword: 'synthèse partielle' },
    ar: { text: 'إنتاج المتعلم لجزء من الخلاصة بنفسه ينشط أثر التوليد المعرفي أكثر من قراءة ملخص جاهز', keyword: 'أثر التوليد', quotation: true },
    en: { text: 'Have pupils complete a partial summary rather than handing out a finished sheet to leverage the generation effect.', keyword: 'generation effect' },
  } },
  { id: 'split-attention-integration', source: { label: 'Chandler & Sweller · Cognition and Instruction', url: 'https://www.tandfonline.com/doi/abs/10.1207/s1532690xci0804_2' }, copy: {
    fr: { text: 'Placez les légendes directement sur les parties du schéma pour éviter l’effet d’attention partagée.', keyword: 'attention partagée' },
    ar: { text: 'وضع التسميات مباشرة فوق عناصر الرسم يمنع تشتت البصر ويقلل العبء الإدراكي غير الضروري', keyword: 'تشتت البصر', quotation: true },
    en: { text: 'Integrate labels directly onto diagrams to prevent the split-attention effect.', keyword: 'split-attention effect' },
  } },
  { id: 'signaling-visual-cues', source: { label: 'van Gog · Educational Psychology Review', url: 'https://link.springer.com/article/10.1007/s10648-013-9244-0' }, copy: {
    fr: { text: 'Utilisez une seule couleur d’accent au tableau pour guider le regard vers l’invariant de la règle.', keyword: 'guider le regard' },
    ar: { text: 'استعمال لون مميز واحد على السبورة يوجه الانتباه البصري نحو العنصر الجوهري في القاعدة', keyword: 'الانتباه البصري', quotation: true },
    en: { text: 'Use a single accent color on the board to guide visual attention toward the key invariant.', keyword: 'visual attention' },
  } },
  { id: 'pretesting-effect-curiosity', source: { label: 'Richland, Kornell & Kao · Journal of Experimental Psychology', url: 'https://psycnet.apa.org/record/2009-12536-009' }, copy: {
    fr: { text: 'Posez une question diagnostic avant d’aborder le chapitre : même infructueuse, la recherche prépare l’encodage.', keyword: 'question diagnostic' },
    ar: { text: 'طرح سؤال تشخيصي قبل بدء الفصل يوجه البوصلة الانتباهية ويهيئ الدماغ لالتقاط المعلومة المستهدفة', keyword: 'سؤال تشخيصي', quotation: true },
    en: { text: 'Ask a diagnostic pretest question before the chapter: even unsuccessful attempts prime subsequent encoding.', keyword: 'diagnostic pretest' },
  } },
  { id: 'desirable-difficulties-bjork', source: { label: 'Robert & Elizabeth Bjork · Psychology and the Real World', url: 'https://bjorklab.psych.ucla.edu/research/' }, copy: {
    fr: { text: 'Acceptez un léger ralentissement lors de l’entraînement : les difficultés désirables consolident l’apprentissage.', keyword: 'difficultés désirables' },
    ar: { text: 'الصعوبات المرغوبة التي تتطلب جهداً ذهنياً معتدلاً أثناء التدريب تبني تعلماً أعمق وأكثر ثباتاً', keyword: 'الصعوبات المرغوبة', quotation: true },
    en: { text: 'Welcome a modest slowdown during practice: desirable difficulties build durable, transferable learning.', keyword: 'desirable difficulties' },
  } },
  { id: 'cognitive-offloading-notes', source: { label: 'Mueller & Oppenheimer · Psychological Science', url: 'https://journals.sagepub.com/doi/10.1177/0956797614524581' }, copy: {
    fr: { text: 'Encouragez la reformulation personnelle dans le cahier plutôt que la copie mécanique mot à mot.', keyword: 'reformulation personnelle' },
    ar: { text: 'إعادة صياغة الفكرة بأسلوب المتعلم في الدفتر تستدعي معالجة تركيبية أعمق من النقل الحرفي', keyword: 'إعادة صياغة الفكرة', quotation: true },
    en: { text: 'Encourage pupils to paraphrase key ideas in their notebooks rather than copying verbatim.', keyword: 'paraphrase key ideas' },
  } },
  { id: 'drawing-to-learn-wammes', source: { label: 'Wammes, Meade & Fernandes · Current Directions in Psychological Science', url: 'https://journals.sagepub.com/doi/10.1177/0963721418755324' }, copy: {
    fr: { text: 'Faites esquisser un croquis rapide du phénomène étudié : dessiner coordonne vision, geste et sens.', keyword: 'croquis rapide' },
    ar: { text: 'رسم تخطيط سريع للمفهوم يدمج التمثيل البصري والحركي والدلالي في شبكة عصبية واحدة', keyword: 'رسم تخطيط سريع', quotation: true },
    en: { text: 'Ask pupils to sketch a quick diagram of the concept to integrate visual, motor and semantic traces.', keyword: 'quick diagram' },
  } },
  { id: 'peer-instruction-elaboration', source: { label: 'Eric Mazur · American Journal of Physics', url: 'https://pubs.aip.org/aapt/ajp/article/69/9/970/1055667' }, copy: {
    fr: { text: 'Accordez deux minutes d’échange entre voisins après un vote conceptuel pour stimuler la co-élaboration.', keyword: 'échange entre voisins' },
    ar: { text: 'منح دقيقتين للنقاش الثنائي بعد سؤال مفاهيمي يحفز التبرير الحججي وتصحيح التمثلات الخاطئة', keyword: 'للنقاش الثنائي', quotation: true },
    en: { text: 'Give pairs two minutes to justify their reasoning after a concept question to refine mental models.', keyword: 'mental models' },
  } },
  { id: 'protege-effect-teaching', source: { label: 'Nestojko et al. · Memory & Cognition', url: 'https://link.springer.com/article/10.3758/s13421-014-0416-z' }, copy: {
    fr: { text: 'Annoncez aux élèves qu’ils devront expliquer la notion à un pair : cela structure immédiatement leur écoute.', keyword: 'expliquer la notion' },
    ar: { text: 'تهيئة المتعلم لشرح الفكرة لزميله ترفع جودة التنظيم الذهني للمعلومات منذ لحظة الاستماع', keyword: 'لشرح الفكرة لزميله', quotation: true },
    en: { text: 'Tell pupils they will explain the concept to a partner: this expectation organizes encoding from the start.', keyword: 'explain the concept' },
  } },
  { id: 'self-efficacy-bandura', source: { label: 'Albert Bandura · Educational Psychologist', url: 'https://www.tandfonline.com/doi/abs/10.1207/s15326985ep2802_3' }, copy: {
    fr: { text: 'Graduez la difficulté des premiers exercices pour offrir une expérience de maîtrise authentique dès le départ.', keyword: 'expérience de maîtrise' },
    ar: { text: 'تدرج التمارين الأولى نحو نجاحات ملموسة يبني الكفاءة الذاتية ويدعم المثابرة أمام المسائل الصعبة', keyword: 'الكفاءة الذاتية', quotation: true },
    en: { text: 'Sequence initial exercises for early mastery experiences that strengthen pupils’ self-efficacy.', keyword: 'self-efficacy' },
  } },
  { id: 'autonomy-supportive-framing', source: { label: 'Ryan & Deci · Contemporary Educational Psychology', url: 'https://www.sciencedirect.com/science/article/abs/pii/S0361476X99910202' }, copy: {
    fr: { text: 'Expliquez l’utilité d’une consigne exigeante : comprendre le sens soutient l’engagement autonome.', keyword: 'engagement autonome' },
    ar: { text: 'توضيح الغاية التربوية من النشاط يغذي الدافعية الذاتية ويجعل الانخراط في العمل أكثر استدامة', keyword: 'الدافعية الذاتية', quotation: true },
    en: { text: 'Share the rationale behind demanding tasks: understanding purpose nurtures autonomous motivation.', keyword: 'autonomous motivation' },
  } },
  { id: 'executive-function-routines', source: { label: ' Adele Diamond · Annual Review of Psychology', url: 'https://www.annualreviews.org/doi/10.1146/annurev-psych-113011-143750' }, copy: {
    fr: { text: 'Stabilisez les rituels de début et de fin de séance pour économiser le contrôle inhibiteur des élèves.', keyword: 'rituels de début' },
    ar: { text: 'ثبات روتين بداية الحصة ونهايتها يوفر طاقة الوظائف التنفيذية لصالح التفكير في محتوى الدرس', keyword: 'الوظائف التنفيذية', quotation: true },
    en: { text: 'Keep opening and closing routines predictable to save pupils’ executive function resources for learning.', keyword: 'executive function' },
  } },
  { id: 'sleep-dependent-consolidation', source: { label: 'Walker & Stickgold · Nature Reviews Neuroscience', url: 'https://www.nature.com/articles/nrn1432' }, copy: {
    fr: { text: 'Répartissez l’étude d’un chapitre exigeant sur deux séances séparées par une nuit pour favoriser la consolidation.', keyword: 'consolidation' },
    ar: { text: 'توزيع الفصل الدسم على حصتين يفصل بينهما النوم يسمح للحصين والقشرة المخية بدمج الذكريات', keyword: 'بدمج الذكريات', quotation: true },
    en: { text: 'Spread demanding chapters across two days so overnight memory consolidation can stabilize new traces.', keyword: 'memory consolidation' },
  } },
  { id: 'contextual-variability-transfer', source: { label: 'Barnett & Ceci · Psychological Bulletin', url: 'https://psycnet.apa.org/record/2002-13562-004' }, copy: {
    fr: { text: 'Présentez un même principe dans trois contextes distincts pour aider les élèves à abstraire la structure profonde.', keyword: 'structure profonde' },
    ar: { text: 'توظيف القاعدة الواحدة في سياقات متعددة يساعد المتعلم على تجريد البنية العميقة ونقل التعلم', keyword: 'البنية العميقة', quotation: true },
    en: { text: 'Show the same principle across varied contexts so pupils abstract the deep structure for transfer.', keyword: 'deep structure' },
  } },
  { id: 'contrasting-cases-perception', source: { label: 'Schwartz & Bransford · Cognition and Instruction', url: 'https://www.tandfonline.com/doi/abs/10.1207/s1532690xci1604_4' }, copy: {
    fr: { text: 'Juxtaposez deux exemples proches qui diffèrent par un seul paramètre pour affiner la discrimination conceptuelle.', keyword: 'discrimination conceptuelle' },
    ar: { text: 'مقارنة مثالين متقاربين يختلفان في متغير واحد تشحذ التمييز المفاهيمي قبل تقديم القاعدة العامة', keyword: 'التمييز المفاهيمي', quotation: true },
    en: { text: 'Place two contrasting cases side by side to sharpen conceptual discrimination before stating the rule.', keyword: 'contrasting cases' },
  } },
  { id: 'refutation-text-misconceptions', source: { label: 'Sinatra & Broughton · Educational Psychologist', url: 'https://www.tandfonline.com/doi/abs/10.1080/00461520.2011.611369' }, copy: {
    fr: { text: 'Nommez explicitement l’idée reçue courante puis démontrez pourquoi le modèle scientifique l’explique mieux.', keyword: 'idée reçue' },
    ar: { text: 'استحضار التمثل الخاطئ الشائع وتفنيده بالحجة العلمية أكثر نجاعة من الاكتفاء بعرض الصواب فقط', keyword: 'التمثل الخاطئ', quotation: true },
    en: { text: 'Address common misconceptions explicitly and show why the scientific model explains the evidence better.', keyword: 'common misconceptions' },
  } },
  { id: 'cold-call-inclusive-warmth', source: { label: 'Dallimore, Hertenstein & Platt · Journal of Management Education', url: 'https://journals.sagepub.com/doi/10.1177/1052562912446067' }, copy: {
    fr: { text: 'Annoncez la question à toute la classe avant de désigner un élève avec bienveillance pour maintenir l’engagement collectif.', keyword: 'toute la classe' },
    ar: { text: 'طرح السؤال على الجميع قبل تسمية المتحدث بلطف يضمن يقظة الفصل كله دون إثارة القلق', keyword: 'يقظة الفصل', quotation: true },
    en: { text: 'Pose the question to the whole class before warmly calling on a pupil to keep everyone thinking.', keyword: 'whole class' },
  } },
  { id: 'think-pair-share-processing', source: { label: 'Lyman · Reading Psychology', url: 'https://www.tandfonline.com/doi/abs/10.1080/0270271810020201' }, copy: {
    fr: { text: 'Structurer « réfléchir seul, comparer à deux, partager » sécurise la prise de parole des élèves réservés.', keyword: 'réfléchir seul' },
    ar: { text: 'تدرج فكر بمفردك ثم ناقش زميلك ثم شارك الجماعة يمنح المتعلمين الخجولين ثقة معرفية عالية', keyword: 'ثقة معرفية', quotation: true },
    en: { text: 'Use Think-Pair-Share so quieter pupils rehearse and refine their ideas before whole-class discussion.', keyword: 'Think-Pair-Share' },
  } },
  { id: 'exit-ticket-diagnostic', source: { label: 'Dylan Wiliam · Studies in Educational Evaluation', url: 'https://www.sciencedirect.com/science/article/abs/pii/S0191491X11000149' }, copy: {
    fr: { text: 'Recueillez une réponse courte en fin d’heure pour ajuster l’accroche de votre prochaine séance.', keyword: 'prochaine séance' },
    ar: { text: 'جمع بطاقة خروج سريعة في ختام الحصة يمنح الأستاذ تشخيصاً دقيقاً لتكييف منطلق الدرس القادم', keyword: 'بطاقة خروج', quotation: true },
    en: { text: 'Use a one-minute exit ticket at the end of class to tailor the opening of your next lesson.', keyword: 'exit ticket' },
  } },
  { id: 'hinge-question-midpoint', source: { label: 'Wiliam & Leahy · Embedding Formative Assessment', url: 'https://www.learningsciences.com/product/embedding-formative-assessment/' }, copy: {
    fr: { text: 'Placez une question charnière à mi-séance pour vérifier que toute la classe peut franchir l’étape suivante.', keyword: 'question charnière' },
    ar: { text: 'إدراج سؤال مفصلي في منتصف الدرس يكشف فوراً مدى جاهزية القسم للانتقال إلى المحور الموالي', keyword: 'سؤال مفصلي', quotation: true },
    en: { text: 'Insert a hinge question midway through the lesson to check readiness before moving to the next step.', keyword: 'hinge question' },
  } },
  { id: 'cognitive-closure-summary', source: { label: 'Stanislas Dehaene · How We Learn (Odile Jacob)', url: 'https://www.college-de-france.fr/fr/chaire/stanislas-dehaene-psychologie-cognitive-experimentale-chaire-statutaire' }, copy: {
    fr: { text: 'Réservez les trois dernières minutes pour que les élèves formulent eux-mêmes l’idée essentielle du jour.', keyword: 'idée essentielle' },
    ar: { text: 'تخصيص الدقائق الثلاث الأخيرة ليصوغ المتعلمون خلاصة الحصة يغلق الحلقة الانتباهية ويثبت الأثر', keyword: 'خلاصة الحصة', quotation: true },
    en: { text: 'Save the final three minutes for pupils to state the day’s core takeaway in their own words.', keyword: 'core takeaway' },
  } },
  { id: 'four-pillars-dehaene', source: { label: 'Stanislas Dehaene · Trends in Cognitive Sciences', url: 'https://www.cell.com/trends/cognitive-sciences/home' }, copy: {
    fr: { text: 'Appuyez chaque séance sur les quatre piliers : attention ciblée, engagement actif, retour sur l’erreur et consolidation.', keyword: 'quatre piliers' },
    ar: { text: 'يرتكز التعلم الفعال على أربع دعائم عصبية هي الانتباه والانخراط النشط وتصحيح الخطأ والترسيخ', keyword: 'أربع دعائم عصبية', quotation: true },
    en: { text: 'Anchor lessons in the four pillars of learning: attention, active engagement, error feedback and consolidation.', keyword: 'four pillars' },
  } },
  { id: 'social-belonging-walton', source: { label: 'Walton & Cohen · Science', url: 'https://www.science.org/doi/10.1126/science.1198364' }, copy: {
    fr: { text: 'Normalisez les tâtonnements au début d’un nouveau chapitre : savoir que le doute est partagé réduit l’anxiété.', keyword: 'doute est partagé' },
    ar: { text: 'طمأنة المتعلمين بأن الصعوبة في بداية الفصل أمر طبيعي ومشترك تخفض القلق وتحفز المثابرة', keyword: 'تخفض القلق', quotation: true },
    en: { text: 'Normalize initial struggle in a new unit: knowing difficulty is shared protects belonging and persistence.', keyword: 'initial struggle' },
  } },
  { id: 'wise-feedback-yeager', source: { label: 'Yeager et al. · Journal of Experimental Psychology: General', url: 'https://psycnet.apa.org/record/2013-35860-001' }, copy: {
    fr: { text: 'Accompagnez une correction exigeante d’un message explicite de confiance dans la capacité de l’élève à réussir.', keyword: 'confiance dans la capacité' },
    ar: { text: 'إرفاق الملاحظات التصحيحية الدقيقة بتأكيد ثقة الأستاذ في قدرة المتعلم على التطور يضاعف تقبل التوجيه', keyword: 'ثقة الأستاذ', quotation: true },
    en: { text: 'Pair high standards in your feedback with clear assurance that you believe the pupil can meet them.', keyword: 'high standards' },
  } },
  { id: 'math-anxiety-expressive', source: { label: 'Ramirez & Beilock · Science', url: 'https://www.science.org/doi/10.1126/science.1199427' }, copy: {
    fr: { text: 'Avant un contrôle important, proposez une consigne claire et rassurante pour libérer la mémoire de travail du stress.', keyword: 'libérer la mémoire' },
    ar: { text: 'التمهيد المطمئن والواضح قبل الفرض المحروس يخفف العبء الانفعالي ويحرر سعة الذاكرة العاملة للتحليل', keyword: 'العبء الانفعالي', quotation: true },
    en: { text: 'Begin major assessments with a calm, reassuring framing to free working memory from test anxiety.', keyword: 'test anxiety' },
  } },
  { id: 'gesture-embodied-cognition', source: { label: 'Goldin-Meadow · Trends in Cognitive Sciences', url: 'https://www.cell.com/trends/cognitive-sciences/fulltext/S1364-6613(99)01397-2' }, copy: {
    fr: { text: 'Accompagnez vos explications de gestes précis pointant les relations spatiales au tableau.', keyword: 'gestes précis' },
    ar: { text: 'الإشارات اليدوية الدقيقة أثناء ربط عناصر الشكل على السبورة تدعم الإدراك المتجسد وتيسر الفهم', keyword: 'الإدراك المتجسد', quotation: true },
    en: { text: 'Use purposeful linking gestures at the board to ground abstract relations in embodied cognition.', keyword: 'embodied cognition' },
  } },
  { id: 'advance-organizers-ausubel', source: { label: 'David Ausubel · Journal of Educational Psychology', url: 'https://psycnet.apa.org/record/1961-04457-001' }, copy: {
    fr: { text: 'Affichez en début d’heure une carte très brève du plan pour offrir une charpente d’accueil aux notions.', keyword: 'charpente d’accueil' },
    ar: { text: 'تقديم منظم متقدم موجز في مطلع الحصة يمنح المتعلمين خريطة ذهنية لاستيعاب التفاصيل اللاحقة', keyword: 'منظم متقدم', quotation: true },
    en: { text: 'Share a brief advance organizer at the start of class to provide a mental scaffold for new details.', keyword: 'advance organizer' },
  } },
  { id: 'episodic-memory-anchoring', source: { label: 'Tulving · Annual Review of Psychology', url: 'https://www.annualreviews.org/doi/10.1146/annurev.psych.53.100901.135114' }, copy: {
    fr: { text: 'Associez une règle abstraite à une expérience de classe marquante pour mobiliser la mémoire épisodique.', keyword: 'mémoire épisodique' },
    ar: { text: 'ربط القاعدة المجردة بتجربة صفية ملموسة يوظف الذاكرة العرضية لدعم استرجاع المعرفة الدلالية', keyword: 'الذاكرة العرضية', quotation: true },
    en: { text: 'Tie an abstract rule to a memorable classroom demonstration to recruit episodic memory.', keyword: 'episodic memory' },
  } },
  { id: 'successive-relearning-rawson', source: { label: 'Rawson & Dunlosky · Educational Psychology Review', url: 'https://link.springer.com/article/10.1007/s10648-011-9184-5' }, copy: {
    fr: { text: 'Combinez rappel actif et révision espacée sur les définitions fondamentales tout au long du trimestre.', keyword: 'révision espacée' },
    ar: { text: 'الدمج بين الاسترجاع النشط والمراجعة المتباعدة للتعاريف الأساسية يحقق أعلى درجات الاحتفاظ المعرفي', keyword: 'والمراجعة المتباعدة', quotation: true },
    en: { text: 'Combine retrieval practice with spaced review for core definitions across the term.', keyword: 'spaced review' },
  } },
  { id: 'modality-principle-narration', source: { label: 'Low & Sweller · Cambridge Handbook of Multimedia Learning', url: 'https://www.cambridge.org/core/books/cambridge-handbook-of-multimedia-learning/04A2A0A3B8E8A5E1A9E7E9D6F4B7C2D1' }, copy: {
    fr: { text: 'Commenter oralement une figure géométrique ou un graphique allège davantage le canal visuel qu’un long paragraphe écrit.', keyword: 'canal visuel' },
    ar: { text: 'التعليق الصوتي المتزامن مع الرسم البياني يخفف الضغط عن القناة البصرية ويعزز التكامل الإدراكي', keyword: 'القناة البصرية', quotation: true },
    en: { text: 'Narrating a diagram aloud rather than adding dense text beside it relieves the visual channel.', keyword: 'visual channel' },
  } },
  { id: 'expertise-reversal-effect', source: { label: 'Kalyuga · Educational Psychology Review', url: 'https://link.springer.com/article/10.1007/s10648-007-9054-3' }, copy: {
    fr: { text: 'Allégez les explications pas-à-pas pour les élèves déjà avancés afin d’éviter l’effet d’inversion de l’expertise.', keyword: 'inversion de l’expertise' },
    ar: { text: 'تبسيط التوجيهات للمتعلمين المتقدمين يمنع أثر انعكاس الخبرة ويتيح لهم معالجة المسائل بمرونة', keyword: 'انعكاس الخبرة', quotation: true },
    en: { text: 'Streamline step-by-step guidance for advanced pupils to avoid the expertise reversal effect.', keyword: 'expertise reversal' },
  } },
  { id: 'question-planning-teacher', source: { label: 'د. إخلاص محمد عبد الحي · تعليم جديد', url: 'https://www.new-educ.com/نصائح-لأسئلة-فاعلة-في-التدريس' }, copy: {
    fr: { text: 'Préparez la progression cognitive de vos questions avant d’entrer en classe.', keyword: 'progression cognitive' },
    ar: { text: 'خطط جيداً لأسئلة درسك قبل أن تباشر بالتدريس', keyword: 'لأسئلة درسك', quotation: true },
    en: { text: 'Plan the cognitive progression of your lesson questions before you start teaching.', keyword: 'lesson questions' },
  } },
  { id: 'lesson-objective-clarity', source: { label: 'سراب العاني · تعليم جديد', url: 'https://www.new-educ.com/خطة-التدريس-إعداد-خطة-فاعلة-قبل-كل-درس' }, copy: {
    fr: { text: 'Clarifiez l’objectif d’apprentissage visé pour orienter l’attention sélective de la classe.', keyword: 'objectif d’apprentissage' },
    ar: { text: 'تحديد الهدف التعليمي المؤمل الوصول إليه من هذا الدرس', keyword: 'الهدف التعليمي', quotation: true },
    en: { text: 'Clarify the target learning objective so pupils can direct their selective attention.', keyword: 'learning objective' },
  } },
  { id: 'empathetic-listening-answers', source: { label: 'مؤسسة الملكة رانيا · دليل التغذية الراجعة', url: 'https://qrf.org/ar/برامجنا/الدليل-الإرشادي-للتغذية-الراجعة?page=2' }, copy: {
    fr: { text: 'Écoutez la démarche de l’élève jusqu’au bout pour repérer le raisonnement sous-jacent avant d’intervenir.', keyword: 'raisonnement sous-jacent' },
    ar: { text: 'ينبغي للمعلم أن يستمع جيدًا إلى إجابات الطلبة', keyword: 'يستمع جيدًا', quotation: true },
    en: { text: 'Listen carefully to pupils’ answers to diagnose their underlying reasoning before intervening.', keyword: 'underlying reasoning' },
  } },
  { id: 'preventive-classroom-climate', source: { label: 'هشام البشر · تعليم جديد', url: 'https://www.new-educ.com/الإدارة-الصفية-الفعالة' }, copy: {
    fr: { text: 'Privilégiez des repères préventifs calmes pour préserver la continuité cognitive du groupe.', keyword: 'repères préventifs' },
    ar: { text: 'التفكير في الأساليب الوقائية التي تقلل من الأفعال غير المرغوب فيها', keyword: 'الأساليب الوقائية', quotation: true },
    en: { text: 'Use calm preventive cues to protect the classroom’s shared cognitive focus.', keyword: 'preventive cues' },
  } },
  { id: 'progress-records-teaching', source: { label: 'الأونروا · التقييم الهادف لتحسين نوعية التعلم', url: 'https://www.unrwa.org/ar/content/المجمع-التدريبي-الثالث-التقييم-الهادف-لتحسين-نوعية-التعلم' }, copy: {
    fr: { text: 'Conservez des traces régulières des acquis pour ajuster le rythme des prochaines séances.', keyword: 'traces régulières' },
    ar: { text: 'من الضروري أن يحتفظ المعلم بسجلات عن تقدم تعلم الطلبة', keyword: 'بسجلات', quotation: true },
    en: { text: 'Keep concise records of pupil progress to calibrate the pacing of upcoming lessons.', keyword: 'pupil progress' },
  } },
  { id: 'reflective-practitioner-review', source: { label: 'د. محمود عبد المجيد رشيد عساف · تعليم جديد', url: 'https://www.new-educ.com/المعايير-المهنية-واختبارات-المهنة' }, copy: {
    fr: { text: 'Notez après la séance ce qui a facilité le déclic cognitif pour enrichir votre répertoire.', keyword: 'déclic cognitif' },
    ar: { text: 'المعلم ممارس للتفكير والتأمل والتدبر، يقوم باستمرار بمراجعة وتقييم آثار قراراته وأفعاله على الآخرين.', keyword: 'بمراجعة وتقييم', quotation: true },
    en: { text: 'Reflect briefly after class on which teaching decisions unlocked understanding.', keyword: 'teaching decisions' },
  } },
  { id: 'check-understanding-adaptation', source: { label: 'زكريا الشهاوي · تعليم جديد', url: 'https://www.new-educ.com/التغذية-الراجعة-و-قياس-مستوى-الفهم' }, copy: {
    fr: { text: 'Sondez la compréhension réelle avant de décider de passer au chapitre suivant ou de consolider.', keyword: 'compréhension réelle' },
    ar: { text: 'التحقق من فهم الطلاب سيجعلك تقرر الانتقال إلى درس جديد أو إعادة الشرح لما سبق أو إجراء المزيد من التدريبات أو الأنشطة', keyword: 'التحقق من فهم الطلاب', quotation: true },
    en: { text: 'Check actual understanding before deciding whether to advance, re-explain or consolidate.', keyword: 'actual understanding' },
  } },
  { id: 'enactment-effect-motor', source: { label: 'Engelkamp & Zimmer · Memory & Cognition', url: 'https://link.springer.com/article/10.3758/BF03197072' }, copy: {
    fr: { text: 'Faites manipuler ou tracer les grandeurs étudiées : l’action motrice enrichit l’encodage mnésique.', keyword: 'action motrice' },
    ar: { text: 'إشراك المتعلم في التمثيل العملي أو الهندسي للمفهوم يدمج الذاكرة الحركية ويعزز الاستحضار', keyword: 'الذاكرة الحركية', quotation: true },
    en: { text: 'Have pupils physically trace or manipulate representations to recruit motor memory during encoding.', keyword: 'motor memory' },
  } },
  { id: 'hypercorrection-effect-butterfield', source: { label: 'Butterfield & Metcalfe · Journal of Experimental Psychology', url: 'https://psycnet.apa.org/record/2001-18061-011' }, copy: {
    fr: { text: 'Exploitez une erreur commise avec assurance : la surprise lors du corrigé ancre durablement la bonne règle.', keyword: 'la surprise' },
    ar: { text: 'تصحيح خطأ كان المتعلم واثقاً منه يولد دهشة معرفية ترسخ القاعدة الصحيحة بقوة', keyword: 'دهشة معرفية', quotation: true },
    en: { text: 'Use high-confidence errors productively: the surprise of correction strongly anchors the accurate rule.', keyword: 'surprise of correction' },
  } },
  { id: 'zeigarnik-open-question', source: { label: 'Bluma Zeigarnik · Psychologische Forschung', url: 'https://link.springer.com/journal/426' }, copy: {
    fr: { text: 'Terminez parfois par une question ouverte qui trouvera sa réponse au cours suivant pour maintenir la curiosité.', keyword: 'question ouverte' },
    ar: { text: 'ختم الحصة بسؤال تشويقي مفتوح يبقي الدماغ في حالة معالجة لاواعية حتى اللقاء القادم', keyword: 'بسؤال تشويقي مفتوح', quotation: true },
    en: { text: 'Occasionally close with an open question to be resolved next time, keeping curiosity active.', keyword: 'open question' },
  } },
  { id: 'emotional-contagion-prosody', source: { label: 'Hatfield, Cacioppo & Rapson · Emotional Contagion (Cambridge)', url: 'https://www.cambridge.org/core/books/emotional-contagion/4B7D2B1B0F4A5E6C8D9A1B2C3D4E5F6A' }, copy: {
    fr: { text: 'Modulez le rythme et la chaleur de votre voix : la prosodie posée de l’enseignant régule l’attention de la classe.', keyword: 'votre voix' },
    ar: { text: 'نبرة الصوت الهادئة والمتحمسة للأستاذ تنتقل بالعدوى الانفعالية الإيجابية وتضبط إيقاع الانتباه الصفي', keyword: 'نبرة الصوت', quotation: true },
    en: { text: 'Use a calm, expressive vocal pace: teacher prosody shapes classroom emotional regulation and focus.', keyword: 'teacher prosody' },
  } },
  { id: 'goal-specificity-locke', source: { label: 'Locke & Latham · American Psychologist', url: 'https://psycnet.apa.org/record/2002-15790-003' }, copy: {
    fr: { text: 'Formulez un critère de réussite concret et observable plutôt qu’une consigne générale comme « faites de votre mieux ».', keyword: 'critère de réussite' },
    ar: { text: 'تحديد معيار نجاح دقيق وقابل للملاحظة يوجه الجهد المعرفي أفضل من التوجيهات العامة', keyword: 'معيار نجاح دقيق', quotation: true },
    en: { text: 'Set a specific, observable success criterion rather than a vague prompt like “do your best”.', keyword: 'success criterion' },
  } },
  { id: 'implementation-intentions-gollwitzer', source: { label: 'Peter Gollwitzer · American Psychologist', url: 'https://psycnet.apa.org/record/1999-05760-004' }, copy: {
    fr: { text: 'Enseignez des heuristiques « si je rencontre tel cas, alors j’applique telle méthode » pour automatiser le déclenchement.', keyword: 'si je rencontre' },
    ar: { text: 'ربط شروط المسألة بخطة عمل بصيغة إذا واجهت كذا سأطبق كذا يسرع استدعاء المهارة', keyword: 'خطة عمل', quotation: true },
    en: { text: 'Teach “if-then” heuristics linking problem cues to actions so strategies trigger automatically.', keyword: 'if-then' },
  } },
  { id: 'cognitive-disequilibrium-piaget', source: { label: 'D’Mello & Graesser · Learning and Instruction', url: 'https://www.sciencedirect.com/science/article/abs/pii/S0959475211000533' }, copy: {
    fr: { text: 'Accompagnez la perplexité face à un contre-exemple : ce déséquilibre cognitif passager ouvre la voie au changement conceptuel.', keyword: 'déséquilibre cognitif' },
    ar: { text: 'استثمار لحظة الحيرة المعرفية أمام مثال مضاد يمهد لإعادة بناء المفهوم على أساس علمي سليم', keyword: 'الحيرة المعرفية', quotation: true },
    en: { text: 'Guide pupils through brief cognitive disequilibrium when facing a counterexample to spark conceptual change.', keyword: 'cognitive disequilibrium' },
  } },
  { id: 'collaborative-inhibition-retrieval', source: { label: 'Weldon & Bellinger · Journal of Experimental Psychology', url: 'https://psycnet.apa.org/record/1997-05936-008' }, copy: {
    fr: { text: 'Accordez toujours un temps de recherche individuelle écrite avant de lancer un travail de groupe.', keyword: 'recherche individuelle' },
    ar: { text: 'تخصيص دقيقتين للتفكير الفردي المكتوب قبل العمل الجماعي يحمي استقلالية الاستحضار الذهني لكل متعلم', keyword: 'للتفكير الفردي', quotation: true },
    en: { text: 'Always give brief individual written thinking time before group work so every pupil retrieves independently.', keyword: 'thinking time' },
  } },
  { id: 'semantic-network-concept-mapping', source: { label: 'Nesbit & Adesope · Review of Educational Research', url: 'https://journals.sagepub.com/doi/10.3102/00346543076003413' }, copy: {
    fr: { text: 'En fin de chapitre, faites relier les notions clés par des flèches causales pour structurer le réseau sémantique.', keyword: 'réseau sémantique' },
    ar: { text: 'بناء خريطة مفاهيمية تربط المصطلحات بعلاقات سببية في نهاية الباب ينظم الشبكة الدلالية', keyword: 'الشبكة الدلالية', quotation: true },
    en: { text: 'At unit end, have pupils link core concepts with labeled arrows to organize their semantic network.', keyword: 'semantic network' },
  } },
];

/** One tip per day, identical across rerenders/locales; browsing never needs a timer or storage write. */
export function pedagogicalTipForDay(day: string, offset = 0): PedagogicalTip {
  const epoch = Date.parse(`${day}T12:00:00Z`);
  const index = Number.isFinite(epoch) ? Math.floor(epoch / 86_400_000) : 0;
  const step = Number.isFinite(offset) ? Math.trunc(offset) : 0;
  return PEDAGOGICAL_TIPS[((index + step) % PEDAGOGICAL_TIPS.length + PEDAGOGICAL_TIPS.length) % PEDAGOGICAL_TIPS.length];
}
