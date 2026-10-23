import type { ClassGuidance } from './classGuidance';

type PedagogicalSeverity = 'serene' | 'minor' | 'moderate' | 'critical';

export interface PedagogicalBehavior {
  /** Nombre exact de problèmes ou de configurations pédagogiques en attente */
  problemCount: number;
  /** Niveau de gravité pédagogique */
  severity: PedagogicalSeverity;
  /** Humeur d'origine (rétrocompatibilité) */
  mood: 'happy' | 'attentive' | 'concerned' | 'sad';
  /** Action robotique native de agent-robot-avatar */
  robotAction: 'success' | 'inspect' | 'warning' | 'failure' | 'waiting';
  /** Clignotement d'antenne pour signaler une alerte */
  antennaFlash: boolean;
  /** Rondeur de la tête (100 = ronde/amicale, 55 = carrée/alerte) */
  headRoundness: number;
  /** Durée d'inactivité avant sommeil (0 = ne s'endort pas tant que des tâches urgentes restent) */
  autoSleepMs: number;
}

/**
 * Calcule l'adaptation pédagogique du comportement du robot en fonction
 * de la présence de problèmes de configuration/suivi et de leur nombre exact.
 *
 * - 0 problème (sérénité) : tête ronde, regard joyeux 'success', antenne calme, sommeil paisible autorisé.
 * - Séance en cours : regard inquisiteur attentif 'inspect', veille désactivée pendant le cours.
 * - 1 à 2 problèmes (mineur) : regard inquisiteur 'inspect', attentif, sans alarme.
 * - 3 à 5 problèmes (modéré) : regard inquiet 'warning', antenne qui clignote pour attirer l'attention.
 * - 6+ problèmes (critique) : alerte 'failure', antenne clignotante active, sommeil désactivé.
 */
export function resolvePedagogicalBehavior(guidance: ClassGuidance): PedagogicalBehavior {
  if (guidance.step === 'notebook-unavailable') return {
    problemCount: guidance.remaining, severity: 'critical', mood: 'sad', robotAction: 'failure',
    antennaFlash: true, headRoundness: 55, autoSleepMs: 0,
  };
  if (guidance.step === 'checking') return {
    problemCount: 0, severity: 'minor', mood: 'attentive', robotAction: 'waiting',
    antennaFlash: false, headRoundness: 90, autoSleepMs: 30000,
  };
  if (guidance.step === 'ready') {
    return {
      problemCount: 0,
      severity: 'serene',
      mood: 'happy',
      robotAction: 'success',
      antennaFlash: false,
      headRoundness: 100,
      autoSleepMs: 25000,
    };
  }

  if (guidance.step === 'active-session') {
    return {
      problemCount: 0,
      severity: 'minor',
      mood: 'attentive',
      robotAction: 'inspect',
      antennaFlash: false,
      headRoundness: 90,
      autoSleepMs: 0,
    };
  }

  // A review reminder is a gentle prompt, never evidence of a critical failure.
  if (guidance.step === 'notebook-followup') return {
    problemCount: guidance.remaining, severity: 'minor', mood: 'attentive', robotAction: 'inspect',
    antennaFlash: false, headRoundness: 85, autoSleepMs: 60000,
  };

  const problemCount = guidance.step === 'create' ? 1 : guidance.remaining;

  if (problemCount <= 2) {
    return {
      problemCount,
      severity: 'minor',
      mood: 'attentive',
      robotAction: 'inspect',
      antennaFlash: false,
      headRoundness: 85,
      autoSleepMs: 60000,
    };
  }

  if (problemCount <= 5) {
    return {
      problemCount,
      severity: 'moderate',
      mood: 'concerned',
      robotAction: 'warning',
      antennaFlash: true,
      headRoundness: 70,
      autoSleepMs: 0,
    };
  }

  return {
    problemCount,
    severity: 'critical',
    mood: 'sad',
    robotAction: 'failure',
    antennaFlash: true,
    headRoundness: 55,
    autoSleepMs: 0,
  };
}

/**
 * Détermine l'humeur pédagogique du compagnon selon le nombre d'ajustements nécessaires.
 */
export function companionMood(guidance: ClassGuidance): 'happy' | 'attentive' | 'concerned' | 'sad' {
  return resolvePedagogicalBehavior(guidance).mood;
}
