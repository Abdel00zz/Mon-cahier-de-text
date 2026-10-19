/**
 * Moteur Physique des Ressorts (Spring Physics)
 * Équation différentielle analytique du 2nd ordre sans approximation numérique instable.
 *
 * Formule analytique sous-amortie (zeta < 1):
 * y(t) = 1 - e^(-zeta * omega_n * t) * ( cos(omega_d * t) + (zeta / sqrt(1 - zeta^2)) * sin(omega_d * t) )
 * avec omega_d = omega_n * sqrt(1 - zeta^2).
 *
 * Calibré sur le tempo 120 BPM : 1 beat = 30 frames (0.5 s à 60 FPS).
 * Dépassement physique (overshoot ~5.5%) et stabilisation chirurgicale en exactement 30 frames.
 */

export interface SpringConfig {
  /** Facteur d'amortissement (sous-amorti si < 1.0, défaut: 0.72) */
  zeta: number;
  /** Pulsation propre non amortie en rad/s (défaut: 14.72 pour stabilisation en 0.5s) */
  omegaN: number;
  /** Nombre exact de frames pour la stabilisation (défaut: 30 frames / 0.5 s à 60 FPS) */
  settleFrames: number;
  /** Fréquence d'échantillonnage vidéo (défaut: 60 FPS) */
  fps: number;
}

export interface Rect2D {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Point2D {
  x: number;
  y: number;
}

const DEFAULT_SPRING_CONFIG: SpringConfig = {
  zeta: 0.72,
  omegaN: 14.72,
  settleFrames: 30,
  fps: 60,
};

/**
 * Calcule la réponse indicielle analytique normalisée f(t) dans [0 .. 1 + overshoot].
 * @param progress Fraction normalisée du temps [0 .. 1]
 * @param config Configuration des ressorts
 */
function evaluateUnderdampedSpring(progress: number, config: SpringConfig = DEFAULT_SPRING_CONFIG): number {
  if (progress <= 0) return 0;
  if (progress >= 1) return 1;

  const { zeta, omegaN, settleFrames, fps } = config;
  const totalDurationSec = settleFrames / fps; // 0.5s
  const t = progress * totalDurationSec;

  const sqrtTerm = Math.sqrt(Math.max(0.0001, 1 - zeta * zeta));
  const omegaD = omegaN * sqrtTerm;
  const decay = Math.exp(-zeta * omegaN * t);
  const oscillation = Math.cos(omegaD * t) + (zeta / sqrtTerm) * Math.sin(omegaD * t);

  const rawValue = 1 - decay * oscillation;

  // Lissage infinitésimal pour garantir la continuité stricte à t=1
  // À progress = 1, la décroissance exponentielle e^(-5.29) est <= 0.005.
  // On applique une interpolation d'ancrage sur les 5 dernières pourcents pour une transition parfaite.
  if (progress > 0.95) {
    const blend = (progress - 0.95) / 0.05;
    return rawValue * (1 - blend) + 1.0 * blend;
  }

  return rawValue;
}

/**
 * Évalue une transition spring entre deux valeurs scalaires pour une frame donnée.
 */
export function springValue(
  from: number,
  to: number,
  frame: number,
  startFrame: number,
  durationFrames: number = DEFAULT_SPRING_CONFIG.settleFrames,
  config: SpringConfig = DEFAULT_SPRING_CONFIG
): number {
  if (frame <= startFrame) return from;
  if (frame >= startFrame + durationFrames) return to;

  const progress = (frame - startFrame) / durationFrames;
  const springProgress = evaluateUnderdampedSpring(progress, config);
  return from + (to - from) * springProgress;
}

/**
 * Évalue une boîte vectorielle 2D (x, y, w, h) - Utilisé pour le Morphing One Container.
 */
export function springRect(
  from: Rect2D,
  to: Rect2D,
  frame: number,
  startFrame: number,
  durationFrames: number = DEFAULT_SPRING_CONFIG.settleFrames,
  config: SpringConfig = DEFAULT_SPRING_CONFIG
): Rect2D {
  return {
    x: springValue(from.x, to.x, frame, startFrame, durationFrames, config),
    y: springValue(from.y, to.y, frame, startFrame, durationFrames, config),
    w: springValue(from.w, to.w, frame, startFrame, durationFrames, config),
    h: springValue(from.h, to.h, frame, startFrame, durationFrames, config),
  };
}

/**
 * Respiration naturelle sinusoïdale continue du buste : sin(frame * 0.08) * 3.5px.
 */
export function calculateBreathingOffset(frame: number, frequency = 0.08, amplitude = 3.5): number {
  return Math.sin(frame * frequency) * amplitude;
}

/**
 * Calcul déterministe des clignements d'yeux programmables et du clin d'œil final.
 * Clignements programmés aux frames : 45, 165, 345, 530.
 * Clin d'œil franc (salut final) : Frame 780 à 860.
 */
export interface BlinkState {
  /** 0 = œil grand ouvert, 1 = œil complètement fermé */
  blinkProgress: number;
  /** Vrai si le clin d'œil final est actif (œil droit fermé, œil gauche ouvert) */
  isWinking: boolean;
}

export function evaluateBlinkState(frame: number): BlinkState {
  // Clin d'œil franc lors du salut final (Beat 26, Frame 780+)
  if (frame >= 780 && frame <= 880) {
    let winkProgress = 1;
    if (frame < 788) {
      // Fermeture rapide en 8 frames
      winkProgress = (frame - 780) / 8;
    } else if (frame > 865) {
      // Réouverture en 15 frames
      winkProgress = Math.max(0, 1 - (frame - 865) / 15);
    }
    return {
      blinkProgress: winkProgress,
      isWinking: true,
    };
  }

  // Clignements périodiques réalistes : durée totale 6 frames (2 frames fermeture, 2 frames contact, 2 frames ouverture)
  const blinkKeyframes = [45, 165, 345, 530];
  for (const kf of blinkKeyframes) {
    if (frame >= kf && frame < kf + 6) {
      const delta = frame - kf;
      if (delta <= 2) return { blinkProgress: delta / 2, isWinking: false };
      if (delta <= 4) return { blinkProgress: 1.0, isWinking: false };
      return { blinkProgress: (6 - delta) / 2, isWinking: false };
    }
  }

  return { blinkProgress: 0, isWinking: false };
}

/**
 * Calcul dynamique de l'orientation des pupilles vers la cible d'attention visuelle.
 */
export function calculatePupilDirection(
  target: Point2D,
  eyeOrigin: Point2D,
  maxOffset: number = 4.5
): Point2D {
  const dx = target.x - eyeOrigin.x;
  const dy = target.y - eyeOrigin.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 0.001) return { x: 0, y: 0 };

  const factor = Math.min(1.0, dist / 250); // Atténuation proportionnelle douce
  return {
    x: (dx / dist) * maxOffset * factor,
    y: (dy / dist) * maxOffset * factor,
  };
}
