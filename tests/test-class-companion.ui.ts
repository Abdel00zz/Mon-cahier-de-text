import assert from 'node:assert/strict';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { resolveClassGuidance, guidanceAction, guidanceKey } from '../src/domain/assistant/classGuidance';
import { AssistantPopover } from '../src/features/assistant/AssistantPopover';
import { BloubAvatar, toRobotAction } from '../src/components/ui/BloubAvatar';
import { subscribeCompanionChanges } from '../src/features/assistant/useCompanionRevision';
import { notifyPullApplied } from '../src/infrastructure/sync/syncBus';
import { attachAssistantDismiss } from '../src/features/assistant/assistantPopoverController';
import { classGuidanceMessage } from '../src/features/assistant/companionCopy';
import { companionMood, resolvePedagogicalBehavior } from '../src/domain/assistant/companionPedagogicalBehavior';
import { createWelcomeSession } from '../src/features/assistant/welcomeSession';
import type { AppConfig, AppLocale, LessonsData } from '../src/types';

const classes = [{ id: 'a', name: '2ème Bac Sciences Physiques 1' }, { id: 'b', name: 'Tronc Commun Scientifique 2' }];
const slot = (classId: string) => ({ classId, day: 1, slot: 0 });

test('le compagnon progresse création → horaires manquants → cahier, sans muter les données', () => {
  assert.deepEqual(resolveClassGuidance([], {}), { step: 'create' });
  assert.deepEqual(guidanceAction(resolveClassGuidance([], {})), { type: 'create-class' });
  const config = { timetable: [slot('a')] };
  const before = JSON.stringify({ classes, config });
  const partial = resolveClassGuidance(classes, config);
  assert.deepEqual(partial, { step: 'schedule', classId: 'b', className: classes[1].name, remaining: 1 });
  assert.deepEqual(guidanceAction(partial), { type: 'schedule' });
  const ready = resolveClassGuidance(classes, { timetable: [slot('a'), slot('b')] }, 'b');
  assert.equal(ready.step, 'ready');
  assert.deepEqual(guidanceAction(ready), { type: 'open-class', classId: 'b' });
  assert.equal(JSON.stringify({ classes, config }), before);
  const preferredMissing = resolveClassGuidance(classes, {}, 'b');
  assert.equal('classId' in preferredMissing && preferredMissing.classId, 'b', 'priorité à la classe courante si ses horaires manquent');
  const preferredReady = resolveClassGuidance(classes, { timetable: [slot('b')] }, 'b');
  assert.equal('classId' in preferredReady && preferredReady.classId, 'a', 'une classe déjà planifiée ne masque pas les autres besoins');
});

test('créneaux orphelins ou invalides, grille vidée et anciennes données sont distingués', () => {
  const invalid = { timetable: [slot('deleted'), { ...slot('a'), day: 7 }, { ...slot('b'), slot: -1 }] };
  assert.equal(resolveClassGuidance(classes, invalid).step, 'schedule');
  const legacy = { schedules: classes.map(item => ({ classId: item.id, slots: [{ weekday: 1 }] })) };
  assert.equal(resolveClassGuidance(classes, legacy).step, 'ready');
  assert.equal(resolveClassGuidance(classes, { ...legacy, timetable: [] }).step, 'schedule');
  assert.equal(resolveClassGuidance(classes, { schedules: [{ classId: 'a', slots: [] }] }).step, 'schedule');
  const ready = resolveClassGuidance(classes, legacy, 'deleted');
  assert.equal('classId' in ready && ready.classId, 'a');
});

test('une classe supprimée ou un nouvel horaire ne laisse pas une ancienne suggestion active', () => {
  const initial = resolveClassGuidance(classes, {});
  const next = resolveClassGuidance(classes, { timetable: [slot('a')] });
  assert.notEqual(guidanceKey(initial), guidanceKey(next));
  assert.notEqual(guidanceKey(next), guidanceKey(resolveClassGuidance(classes, { timetable: [slot('a'), slot('b')] })));
  assert.deepEqual(resolveClassGuidance([], { timetable: [slot('a')] }), { step: 'create' });
});

test('la bulle reste fermée au départ, sans faux dialogue bloquant l’ouverture automatique des séances', () => {
  const guidance = resolveClassGuidance([{ id: 'x', name: '<script>alert(1)</script> مجموعة 2' }], {});
  for (const locale of ['fr', 'ar', 'en'] as const satisfies readonly AppLocale[]) {
    const html = renderToStaticMarkup(createElement(AssistantPopover, {
      locale, message: classGuidanceMessage(guidance, locale), attentionKey: guidanceKey(guidance), onAction: () => {},
    }));
    assert.match(html, new RegExp(`lang="${locale}"`));
    assert.match(html, new RegExp(`dir="${locale === 'ar' ? 'rtl' : 'ltr'}"`));
    assert.doesNotMatch(html, /<script>/);
    assert.equal((html.match(/type="button"/g) ?? []).length, 1);
    assert.match(html, /aria-expanded="false"/);
    assert.match(html, /press-squeeze="false"/, 'le robot décoratif ne capture pas les gestes du bouton');
    assert.match(html, /data-expression="attentive"/);
    assert.doesNotMatch(html, /assistant-trigger__notice/);
    assert.doesNotMatch(html, /role="dialog"/);
    assert.match(html, /hidden=""/);
    const ids = [...html.matchAll(/aria-controls="([^"]+)"/g)].map(match => match[1]);
    assert.equal(ids.length, 1);
    assert.ok(html.includes(`id="${ids[0]}"`));
  }
});

test('le composant robot avatar intègre le web component agent-robot-avatar et ses états', () => {
  for (const expression of ['neutral', 'attentive', 'surprised', 'happy', 'excited', 'concerned', 'sad'] as const) {
    const html = renderToStaticMarkup(createElement('div', null,
      createElement(BloubAvatar, { expression, animate: false }), createElement(BloubAvatar, { expression, animate: false })));
    assert.match(html, /<agent-robot-avatar/);
    assert.match(html, new RegExp(`data-expression="${expression}"`));
    assert.match(html, /data-animated="false"/);
    assert.doesNotMatch(html, /<script|<style|foreignObject/);
  }
});

test('humeurs proportionnelles aux horaires manquants et rétablies après correction des données', () => {
  const many = Array.from({ length: 8 }, (_, i) => ({ id: `class-${i}`, name: `Classe ${i}` }));
  const expected = ['happy', 'attentive', 'attentive', 'concerned', 'concerned', 'concerned', 'sad', 'sad', 'sad'];
  for (let pending = 0; pending <= many.length; pending++) {
    const timetable = many.slice(pending).map(item => slot(item.id));
    const guidance = resolveClassGuidance(many, { timetable });
    assert.equal(companionMood(guidance), expected[pending]);
  }
  assert.equal(companionMood(resolveClassGuidance([], {})), 'attentive', 'une première ouverture ne culpabilise pas');
  const initial = resolveClassGuidance(many, {});
  const fewer = resolveClassGuidance(many.slice(0, 3), {});
  assert.notEqual(guidanceKey(initial), guidanceKey(fewer), 'le compte change même si la première classe est identique');
});

test('adaptation pédagogique du robot : actions, antenne, rondeur et veille proportionnelles aux problèmes', () => {
  const many = Array.from({ length: 8 }, (_, i) => ({ id: `class-${i}`, name: `Classe ${i}` }));

  // 0 problème : sérénité totale
  const allScheduled = many.map(item => slot(item.id));
  const b0 = resolvePedagogicalBehavior(resolveClassGuidance(many, { timetable: allScheduled }));
  assert.equal(b0.problemCount, 0);
  assert.equal(b0.severity, 'serene');
  assert.equal(b0.robotAction, 'success');
  assert.equal(b0.antennaFlash, false);
  assert.equal(b0.headRoundness, 100);
  assert.equal(b0.autoSleepMs, 25000);

  // 1 problème : regard inquisiteur doux
  const b1 = resolvePedagogicalBehavior(resolveClassGuidance(many, { timetable: allScheduled.slice(1) }));
  assert.equal(b1.problemCount, 1);
  assert.equal(b1.severity, 'minor');
  assert.equal(b1.robotAction, 'inspect');
  assert.equal(b1.antennaFlash, false);
  assert.equal(b1.headRoundness, 85);

  // 4 problèmes : warning avec antenne clignotante
  const b4 = resolvePedagogicalBehavior(resolveClassGuidance(many, { timetable: allScheduled.slice(4) }));
  assert.equal(b4.problemCount, 4);
  assert.equal(b4.severity, 'moderate');
  assert.equal(b4.robotAction, 'warning');
  assert.equal(b4.antennaFlash, true);
  assert.equal(b4.headRoundness, 70);
  assert.equal(b4.autoSleepMs, 0);

  // 7 problèmes : failure avec tête plus carrée et sommeil désactivé
  const b7 = resolvePedagogicalBehavior(resolveClassGuidance(many, { timetable: allScheduled.slice(7) }));
  assert.equal(b7.problemCount, 7);
  assert.equal(b7.severity, 'critical');
  assert.equal(b7.robotAction, 'failure');
  assert.equal(b7.antennaFlash, true);
  assert.equal(b7.headRoundness, 55);
  assert.equal(b7.autoSleepMs, 0);
});

test('accueil bref une seule fois par lancement, sans répétition aux remontages ou après un clic', () => {
  const welcome = createWelcomeSession();
  assert.equal(welcome.remaining(100), 3600);
  assert.equal(welcome.remaining(100), 3600, 'StrictMode ne redémarre pas la durée');
  assert.equal(welcome.remaining(1800), 1900);
  assert.equal(welcome.remaining(3800), 0);
  assert.equal(welcome.remaining(50000), 0, 'le retour du fond Android ne relance pas le salut');
  const dismissed = createWelcomeSession();
  dismissed.remaining(100);
  dismissed.dismiss();
  assert.equal(dismissed.remaining(101), 0);
});

test('message et humeur partagent le même nombre réel de classes à planifier', () => {
  for (const remaining of [1, 2, 3, 6, 12]) {
    const guidance = { step: 'schedule', classId: 'a', className: 'علوم 2', remaining } as const;
    for (const locale of ['fr', 'ar', 'en'] as const) {
      const message = classGuidanceMessage(guidance, locale);
      assert.ok(message.context);
      assert.ok(message.action);
      assert.ok(message.subject);
      if (remaining >= 3) assert.ok(message.context.includes(new Intl.NumberFormat(locale).format(remaining)));
    }
  }
});

test('Échap, retour Android, clic extérieur et sortie clavier ferment proprement sans bloquer le toucher', () => {
  const view = new EventTarget();
  const doc = Object.assign(new EventTarget(), { defaultView: view });
  let inside = true;
  let focused = false;
  const closes: (boolean | undefined)[] = [];
  const root = { ownerDocument: doc, contains: () => inside } as unknown as HTMLElement;
  const panel = { focus: (options: FocusOptions) => { focused = options.preventScroll === true; } } as HTMLElement;
  const dispose = attachAssistantDismiss(root, panel, restore => closes.push(restore));
  assert.equal(focused, true);
  const click = new Event('pointerdown', { cancelable: true });
  doc.dispatchEvent(click);
  assert.equal(closes.length, 0);
  inside = false;
  doc.dispatchEvent(click);
  assert.equal(click.defaultPrevented, false);
  doc.dispatchEvent(new Event('focusin'));
  assert.equal(closes.length, 2);
  const tab = Object.assign(new Event('keydown', { cancelable: true }), { key: 'Tab' });
  doc.dispatchEvent(tab);
  assert.equal(tab.defaultPrevented, false);
  assert.equal(closes.length, 2);
  const escape = Object.assign(new Event('keydown', { cancelable: true }), { key: 'Escape' });
  doc.dispatchEvent(escape);
  assert.equal(escape.defaultPrevented, true);
  assert.equal(closes.at(-1), true);
  const back = new Event('native-back', { cancelable: true });
  view.dispatchEvent(back);
  assert.equal(back.defaultPrevented, true);
  assert.equal(closes.at(-1), true);
  const count = closes.length;
  dispose();
  doc.dispatchEvent(new Event('pointerdown'));
  doc.dispatchEvent(escape);
  view.dispatchEvent(back);
  assert.equal(closes.length, count, 'aucun listener conservé après fermeture');
});

test('le parcours reçoit la configuration partielle sans requérir les données du cahier ou des élèves', () => {
  const config: Partial<AppConfig> = {};
  Object.defineProperty(config, 'classRosters', { get() { throw new Error('données élèves inutiles'); } });
  Object.defineProperty(config, 'assessmentDocuments', { get() { throw new Error('documents inutiles'); } });
  assert.equal(resolveClassGuidance(classes, config).step, 'schedule');
});

test('connexion au cerveau pédagogique : séance en cours prioritaire et guidage direct vers le cahier', () => {
  const scheduledConfig = { timetable: [slot('a'), slot('b')] };
  const guidance = resolveClassGuidance(classes, scheduledConfig, undefined, { activeSessionClassIds: ['b'] });
  assert.equal(guidance.step, 'active-session');
  assert.equal('classId' in guidance && guidance.classId, 'b');
  assert.deepEqual(guidanceAction(guidance), { type: 'open-class', classId: 'b' });

  const behavior = resolvePedagogicalBehavior(guidance);
  assert.equal(behavior.severity, 'minor');
  assert.equal(behavior.robotAction, 'inspect');
  assert.equal(behavior.autoSleepMs, 0, 'reste éveillé pendant la séance');

  for (const locale of ['fr', 'ar', 'en'] as const satisfies readonly AppLocale[]) {
    const msg = classGuidanceMessage(guidance, locale);
    assert.ok(msg.title);
    assert.ok(msg.action);
    assert.ok(msg.context);
  }
});

test('connexion au cerveau pédagogique : détection des anomalies de cahier (formules LaTeX, ordre)', () => {
  const scheduledConfig = { timetable: [slot('a'), slot('b')] };
  const mockLessons = (classId: string) => {
    if (classId === 'a') {
      return [{
        type: 'chapter',
        title: 'Algèbre',
        items: [{ type: 'definition', title: 'Définition', description: 'Soit $x \\in \\mathbb{R} et y' }],
      }];
    }
    return [{
      type: 'chapter',
      title: 'Analyse',
      items: [{ type: 'definition', title: 'Définition', description: 'Soit $x$ réel' }],
    }];
  };

  const guidance = resolveClassGuidance(classes, scheduledConfig, undefined, { readLessons: mockLessons as any });
  assert.equal(guidance.step, 'notebook-issue');
  assert.equal('classId' in guidance && guidance.classId, 'a');
  assert.equal('issueCode' in guidance && guidance.issueCode, 'unclosedFormula');
  assert.deepEqual(guidanceAction(guidance), { type: 'open-class', classId: 'a' });

  const behavior = resolvePedagogicalBehavior(guidance);
  assert.equal(behavior.severity, 'minor');
  assert.equal(behavior.robotAction, 'inspect');
});

test('connexion au cerveau pédagogique : détection des cahiers vierges à initialiser', () => {
  const scheduledConfig = { timetable: [slot('a'), slot('b')] };
  const emptyLessons = () => [];
  const guidance = resolveClassGuidance(classes, scheduledConfig, undefined, { readLessons: emptyLessons as any });
  assert.equal(guidance.step, 'notebook-empty');
  assert.equal('remaining' in guidance && guidance.remaining, 2);
  assert.deepEqual(guidanceAction(guidance), { type: 'open-class', classId: 'a' });
});

test('compréhension immédiate par l’utilisateur : le geste du bot change et un badge visible signale les points à régler', () => {
  const guidanceAlert = { step: 'schedule', classId: 'a', className: '2ème Bac', remaining: 23 } as const;
  const behaviorAlert = resolvePedagogicalBehavior(guidanceAlert);
  assert.equal(behaviorAlert.robotAction, 'failure', 'le geste du bot change en alerte majeure (failure) quand des choses sont à régler');
  assert.equal(behaviorAlert.antennaFlash, true, 'l’antenne clignote pour attirer l’attention');

  // Rendu avec 23 problèmes : le badge visible s'affiche sur le déclencheur
  const htmlAlert = renderToStaticMarkup(createElement(AssistantPopover, {
    locale: 'ar',
    message: classGuidanceMessage(guidanceAlert, 'ar'),
    attentionKey: guidanceKey(guidanceAlert),
    problemCount: behaviorAlert.problemCount,
    robotAction: behaviorAlert.robotAction,
    antennaFlash: behaviorAlert.antennaFlash,
    headRoundness: behaviorAlert.headRoundness,
  }));
  assert.match(htmlAlert, /class="assistant-trigger__badge assistant-trigger__badge--alert"/);
  assert.match(htmlAlert, />23</);
  assert.match(htmlAlert, /data-attention="true"/);

  // Rendu avec 0 problème : sérénité totale, aucun badge parasite
  const guidanceSerene = { step: 'ready', classId: 'a', className: '2ème Bac' } as const;
  const behaviorSerene = resolvePedagogicalBehavior(guidanceSerene);
  assert.equal(behaviorSerene.robotAction, 'success', 'le geste du bot devient un hochement joyeux (success)');
  assert.equal(behaviorSerene.antennaFlash, false);

  const htmlSerene = renderToStaticMarkup(createElement(AssistantPopover, {
    locale: 'ar',
    message: classGuidanceMessage(guidanceSerene, 'ar'),
    problemCount: behaviorSerene.problemCount,
    robotAction: behaviorSerene.robotAction,
    antennaFlash: behaviorSerene.antennaFlash,
    headRoundness: behaviorSerene.headRoundness,
  }));
  assert.doesNotMatch(htmlSerene, /assistant-trigger__badge/);
  assert.match(htmlSerene, /data-attention="false"/);
});

test('la séance réelle prime même si une autre classe attend ses horaires et ignore les identifiants supprimés', () => {
  const guidance = resolveClassGuidance(classes, {}, undefined, {
    activeSessionClassIds: ['deleted', 'b'],
    readLessons: () => { throw new Error('ne doit pas lire tous les cahiers pendant la séance'); },
  });
  assert.equal(guidance.step, 'active-session');
  assert.deepEqual(guidanceAction(guidance), { type: 'open-class', classId: 'b' });
  assert.equal(resolvePedagogicalBehavior(guidance).robotAction, 'inspect');
});

test('cahier illisible, transfert en cours et cahier vide ne sont jamais confondus', () => {
  const config = { timetable: classes.map(item => slot(item.id)) };
  const context = { readLessons: (): LessonsData => { throw new Error('invalid JSON'); } };
  const failed = resolveClassGuidance(classes, config, undefined, context);
  assert.equal(failed.step, 'notebook-unavailable');
  assert.equal(resolvePedagogicalBehavior(failed).robotAction, 'failure');
  const waiting = resolveClassGuidance(classes, config, undefined, { ...context, notebooksLoading: true });
  assert.equal(waiting.step, 'checking');
  assert.equal(resolvePedagogicalBehavior(waiting).robotAction, 'waiting');
  assert.equal(classGuidanceMessage(waiting, 'fr').action, undefined);
  assert.equal(resolveClassGuidance(classes, config, undefined, { readLessons: () => [] }).step, 'notebook-empty');
});

test('la classe ciblée et le conseil affiché restent cohérents après correction ou réception cloud', () => {
  const config = { timetable: classes.map(item => slot(item.id)) };
  const broken: LessonsData = [{ type: 'free', title: 'Formule', description: '$x', date: '2026-10-20' }];
  const fixed: LessonsData = [{ type: 'free', title: 'Formule', description: '$x$', date: '2026-10-20' }];
  let revised = false;
  const readLessons = (id: string) => id === 'b' && revised ? fixed : broken;
  const initial = resolveClassGuidance(classes, config, 'b', { readLessons });
  assert.equal(initial.step, 'notebook-issue');
  assert.deepEqual(guidanceAction(initial), { type: 'open-class', classId: 'b' });
  assert.match(classGuidanceMessage(initial, 'fr').detail, /formule semble incomplète/);
  revised = true;
  const next = resolveClassGuidance(classes, config, 'b', { readLessons });
  assert.deepEqual(guidanceAction(next), { type: 'open-class', classId: 'a' });
});

test('le pont robot conserve les actions métier plutôt que de les remplacer par un état aléatoire', () => {
  assert.equal(toRobotAction('attentive'), 'inspect');
  assert.equal(toRobotAction('waiting'), 'waiting');
  assert.equal(toRobotAction('connection-error'), 'connection-error');
  assert.equal(toRobotAction('happy'), 'success');
});

test('les événements cloud et stockage sont regroupés, suspendus en arrière-plan et nettoyés au démontage', async () => {
  const doc = Object.assign(new EventTarget(), { hidden: false });
  const view = new EventTarget();
  let updates = 0;
  const dispose = subscribeCompanionChanges(() => updates++, doc as unknown as Document, view as unknown as Window);
  const settle = () => new Promise(resolve => setTimeout(resolve, 130));
  try {
    notifyPullApplied(); notifyPullApplied();
    view.dispatchEvent(Object.assign(new Event('storage'), { key: 'classData_v1_a' }));
    await settle();
    assert.equal(updates, 1);
    view.dispatchEvent(Object.assign(new Event('storage'), { key: 'unrelated' }));
    await settle();
    assert.equal(updates, 1);
    doc.hidden = true;
    notifyPullApplied();
    await settle();
    assert.equal(updates, 1);
    doc.hidden = false;
    doc.dispatchEvent(new Event('visibilitychange'));
    await settle();
    assert.equal(updates, 2);
    notifyPullApplied();
    dispose();
    await settle();
    notifyPullApplied();
    view.dispatchEvent(new Event('pageshow'));
    await settle();
    assert.equal(updates, 2);
  } finally { dispose(); }
});
