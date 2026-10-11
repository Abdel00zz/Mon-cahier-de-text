import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  springValue,
  springRect,
  calculateBreathingOffset,
  evaluateBlinkState,
  calculatePupilDirection,
  Rect2D,
  Point2D,
} from '@/lib/motion-physics';
import { soundEngine } from '@/lib/sound-engine';

export interface MotionFilmProps {
  /** Frame initiale (défaut: 0) */
  initialFrame?: number;
  /** Lecture automatique au chargement (défaut: false) */
  autoPlay?: boolean;
  /** Callback déclenché à chaque mise à jour de frame */
  onFrameChange?: (frame: number) => void;
  /** Mode compact ou plein écran */
  className?: string;
}

const TOTAL_FRAMES = 960; // 32 beats * 30 frames (16.0s à 60 FPS)
const FPS = 60;

const KEY_MOMENTS = [
  { frame: 60, beat: 2, label: 'F60 · Entrée & 2.5D', desc: 'Perspective 2.5D et entrée de la mascotte' },
  { frame: 180, beat: 6, label: 'F180 · Sélection', desc: 'Sélection du cours et pointage gestuel' },
  { frame: 330, beat: 11, label: 'F330 · Expansion', desc: 'Pleine expansion One Container' },
  { frame: 540, beat: 18, label: 'F540 · Validation', desc: 'Bruit sec et validation sans confetti' },
  { frame: 780, beat: 26, label: 'F780 · Repli & Clin d’œil', desc: 'Repli dans la grille et clin d’œil mascotte' },
];

const HOMEWORK_TEXT = "Exercice 4 p. 52 : Analyse de texte & questions 1 à 3 pour jeudi.";

export const MotionFilmCanvas: React.FC<MotionFilmProps> = ({
  initialFrame = 0,
  autoPlay = false,
  onFrameChange,
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [currentFrame, setCurrentFrame] = useState(initialFrame);
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [speed, setSpeed] = useState<number>(1);
  const [isMuted, setIsMuted] = useState(soundEngine.isMuted());

  const animFrameIdRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);
  const accumulatedTimeRef = useRef<number>(0);
  const lastSoundFrameRef = useRef<number>(-1);

  // Synchronise le son lors du passage sur des frames spécifiques
  const triggerAudioAtFrame = useCallback((frame: number) => {
    if (frame === lastSoundFrameRef.current) return;
    lastSoundFrameRef.current = frame;

    if (frame === 30 || frame === 90) soundEngine.playGlide();
    else if (frame === 210) soundEngine.playCardOpen();
    else if (frame >= 390 && frame <= 500 && frame % 12 === 0) soundEngine.playKeyTap();
    else if (frame === 540) soundEngine.playValidateClick();
    else if (frame === 570 || frame === 780) soundEngine.playSyncChime();
  }, []);

  // Fonction de rendu pur de n'importe quelle frame sur le contexte 2D 1920x1080
  const renderFrame = useCallback((ctx: CanvasRenderingContext2D, f: number) => {
    const W = 1920;
    const H = 1080;

    ctx.save();
    ctx.clearRect(0, 0, W, H);

    // ─────────────────────────────────────────────────────────────
    // 1. FOND DE SCÈNE & TEXTURE CHROMATIQUE FEUTRÉE (60-30-10)
    // ─────────────────────────────────────────────────────────────
    const bgGrad = ctx.createRadialGradient(W / 2, H / 2, 100, W / 2, H / 2, 1100);
    bgGrad.addColorStop(0, '#ffffff');
    bgGrad.addColorStop(0.5, '#f8fafc');
    bgGrad.addColorStop(1, '#f1f5f9');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, W, H);

    // Trame de points décoratifs subtils (dot matrix feutrée)
    ctx.fillStyle = 'rgba(148, 163, 184, 0.12)';
    for (let gx = 40; gx < W; gx += 40) {
      for (let gy = 40; gy < H; gy += 40) {
        ctx.beginPath();
        ctx.arc(gx, gy, 1.2, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // ─────────────────────────────────────────────────────────────
    // 2. EN-TÊTE SUPÉRIEURE DE L'APPLICATION (Mon cahier de textes)
    // ─────────────────────────────────────────────────────────────
    ctx.save();
    // Barre de navigation supérieure
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = 'rgba(15, 23, 42, 0.04)';
    ctx.shadowBlur = 16;
    ctx.shadowOffsetY = 4;
    ctx.fillRect(40, 24, W - 80, 72);
    ctx.restore();

    ctx.strokeStyle = 'rgba(226, 232, 240, 0.8)';
    ctx.lineWidth = 1;
    ctx.strokeRect(40, 24, W - 80, 72);

    // Logo & Titre
    // Carré logo indigo
    ctx.fillStyle = '#4f46e5';
    ctx.beginPath();
    ctx.roundRect(64, 38, 44, 44, 12);
    ctx.fill();

    // Plume stylisée sur le logo
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(80, 70);
    ctx.quadraticCurveTo(86, 52, 94, 46);
    ctx.quadraticCurveTo(88, 62, 80, 70);
    ctx.fill();

    ctx.fillStyle = '#0f172a';
    ctx.font = '600 22px "DM Sans", -apple-system, sans-serif';
    ctx.fillText('Mon cahier de textes', 124, 65);

    ctx.fillStyle = '#64748b';
    ctx.font = '500 14px "DM Sans", sans-serif';
    ctx.fillText('Année scolaire 2026 · 2027  —  Espace Pédagogique Enseignant', 360, 65);

    // Onglets actifs
    const tabs = ['Emploi du temps', 'Mes classes', 'Devoirs & Suivi', 'Guide'];
    let tabX = 1380;
    tabs.forEach((tab, i) => {
      const active = i === 0;
      if (active) {
        ctx.fillStyle = '#1e293b';
        ctx.beginPath();
        ctx.roundRect(tabX - 12, 38, 140, 44, 10);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
      } else {
        ctx.fillStyle = '#64748b';
      }
      ctx.font = '500 14px "DM Sans", sans-serif';
      ctx.fillText(tab, tabX, 65);
      tabX += 120;
    });

    // ─────────────────────────────────────────────────────────────
    // 3. PERSPECTIVE 2.5D DE L'EMPLOI DU TEMPS (rotateX: -4°, rotateY: +6°)
    // ─────────────────────────────────────────────────────────────
    // Calcul de l'inclinaison progressive
    const tiltProgress = springValue(0, 1, f, 30, 40);
    const skewX = tiltProgress * 0.055; // rotateY (+6°)
    const scaleY = 1 - tiltProgress * 0.035; // rotateX (-4°)

    ctx.save();
    // Point de pivot pour la perspective 2.5D
    ctx.translate(680, 520);
    ctx.transform(1, 0, skewX, scaleY, 0, 0);
    ctx.translate(-680, -520);

    // Conteneur de l'Emploi du temps
    const calX = 70;
    const calY = 130;
    const calW = 1260;
    const calH = 880;

    // Ombre 2.5D portée
    ctx.save();
    ctx.fillStyle = 'rgba(15, 23, 42, 0.06)';
    ctx.shadowColor = 'rgba(15, 23, 42, 0.12)';
    ctx.shadowBlur = 32 * tiltProgress;
    ctx.shadowOffsetY = 16 * tiltProgress;
    ctx.beginPath();
    ctx.roundRect(calX, calY, calW, calH, 24);
    ctx.fill();
    ctx.restore();

    // Surface du calendrier
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.roundRect(calX, calY, calW, calH, 24);
    ctx.fill();
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // En-tête des jours
    const days = [
      { name: 'Lundi', date: '13 Octobre' },
      { name: 'Mardi', date: '14 Octobre', highlight: true },
      { name: 'Mercredi', date: '15 Octobre' },
      { name: 'Jeudi', date: '16 Octobre' },
      { name: 'Vendredi', date: '17 Octobre' },
      { name: 'Samedi', date: '18 Octobre' },
    ];
    const colW = (calW - 120) / 6;

    // Colonne des heures à gauche
    const hours = ['08:00', '09:00', '10:00', '11:00', '14:00', '15:00', '16:00'];
    ctx.fillStyle = '#94a3b8';
    ctx.font = '600 13px "DM Sans", monospace';
    hours.forEach((h, hi) => {
      const hy = calY + 90 + hi * 110;
      ctx.fillText(h, calX + 24, hy + 6);
      // Lignes horizontales douces
      ctx.strokeStyle = 'rgba(241, 245, 249, 0.9)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(calX + 90, hy);
      ctx.lineTo(calX + calW - 20, hy);
      ctx.stroke();
    });

    // En-têtes de colonnes des jours
    days.forEach((day, di) => {
      const dx = calX + 100 + di * colW;
      if (day.highlight) {
        ctx.fillStyle = 'rgba(79, 70, 229, 0.08)';
        ctx.beginPath();
        ctx.roundRect(dx - 6, calY + 16, colW - 8, 52, 12);
        ctx.fill();
      }
      ctx.fillStyle = day.highlight ? '#4f46e5' : '#1e293b';
      ctx.font = '700 15px "DM Sans", sans-serif';
      ctx.fillText(day.name, dx + 8, calY + 38);
      ctx.fillStyle = day.highlight ? '#6366f1' : '#64748b';
      ctx.font = '500 12px "DM Sans", sans-serif';
      ctx.fillText(day.date, dx + 8, calY + 56);
    });

    // Autres cours fictifs dans la grille
    const mockCards = [
      { di: 0, hi: 0, title: 'Mathématiques', group: 'TC 1', color: '#0284c7' },
      { di: 0, hi: 2, title: 'Physique-Chimie', group: '1BAC 2', color: '#0d9488' },
      { di: 1, hi: 0, title: 'Anglais', group: '2AC 3', color: '#d97706' },
      { di: 2, hi: 1, title: 'Mathématiques', group: '3AC 1', color: '#0284c7' },
      { di: 3, hi: 2, title: 'Français', group: 'TC 1', color: '#6366f1' },
      { di: 4, hi: 4, title: 'Histoire-Géo', group: '3AC 1', color: '#e11d48' },
    ];
    mockCards.forEach(c => {
      const cx = calX + 100 + c.di * colW;
      const cy = calY + 90 + c.hi * 110 + 4;
      ctx.fillStyle = `${c.color}14`;
      ctx.beginPath();
      ctx.roundRect(cx, cy, colW - 20, 94, 10);
      ctx.fill();
      ctx.strokeStyle = `${c.color}35`;
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.fillStyle = c.color;
      ctx.font = '600 13px "DM Sans", sans-serif';
      ctx.fillText(c.title, cx + 10, cy + 24);
      ctx.fillStyle = '#64748b';
      ctx.font = '500 11px "DM Sans", sans-serif';
      ctx.fillText(c.group, cx + 10, cy + 44);
    });

    ctx.restore(); // Fin de la transformation 2.5D du calendrier

    // ─────────────────────────────────────────────────────────────
    // 4. LE COURS CIBLÉ : MARDI 14 OCTOBRE 10H00 (FRANÇAIS 3AC 1)
    //    MORPHING CONTINU ("ONE CONTAINER NEVER CUTS")
    // ─────────────────────────────────────────────────────────────
    // Coordonnées de base dans la grille (avec skew 2.5D appliqué)
    const baseCardRect: Rect2D = {
      x: 320,
      y: 436,
      w: colW - 20,
      h: 96,
    };
    // Coordonnées du grand panneau central déployé (1240x780)
    const expandedCardRect: Rect2D = {
      x: 340,
      y: 150,
      w: 1240,
      h: 780,
    };

    // Calcul de la trajectoire de morphing
    let currentContainerRect: Rect2D;
    let expansionProgress = 0;

    if (f < 210) {
      // Dans la grille
      currentContainerRect = baseCardRect;
      expansionProgress = 0;
    } else if (f >= 210 && f < 330) {
      // En cours d'expansion One Container (Frame 210 -> 330, ressort sous-amorti)
      currentContainerRect = springRect(baseCardRect, expandedCardRect, f, 210, 110);
      expansionProgress = (f - 210) / 120;
    } else if (f >= 330 && f < 660) {
      // Pleine expansion maintenue
      currentContainerRect = expandedCardRect;
      expansionProgress = 1;
    } else if (f >= 660 && f < 780) {
      // Repli continu One Container (Frame 660 -> 780)
      currentContainerRect = springRect(expandedCardRect, baseCardRect, f, 660, 110);
      expansionProgress = Math.max(0, 1 - (f - 660) / 110);
    } else {
      // Replié dans la grille
      currentContainerRect = baseCardRect;
      expansionProgress = 0;
    }

    // Effet de mise en surbrillance / pointage à Frame 180 (Beat 6)
    const isPointingAtCard = f >= 170 && f < 220;
    const isCourseValidated = f >= 540;

    // Rendu du Conteneur Morphing (One Container)
    ctx.save();
    // Ombre dynamique proportionnelle à l'élévation Z
    const elevationZ = expansionProgress;
    ctx.shadowColor = `rgba(30, 27, 75, ${0.12 + elevationZ * 0.16})`;
    ctx.shadowBlur = 12 + elevationZ * 48;
    ctx.shadowOffsetY = 6 + elevationZ * 24;

    // Fond du conteneur
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.roundRect(
      currentContainerRect.x,
      currentContainerRect.y,
      currentContainerRect.w,
      currentContainerRect.h,
      12 + elevationZ * 16
    );
    ctx.fill();
    ctx.restore();

    // Bordure & Liseré spéculaire
    ctx.save();
    const borderGrad = ctx.createLinearGradient(
      currentContainerRect.x,
      currentContainerRect.y,
      currentContainerRect.x + currentContainerRect.w,
      currentContainerRect.y + currentContainerRect.h
    );
    if (isPointingAtCard) {
      borderGrad.addColorStop(0, '#6366f1');
      borderGrad.addColorStop(1, '#4f46e5');
      ctx.lineWidth = 2.5;
    } else if (elevationZ > 0.05) {
      borderGrad.addColorStop(0, 'rgba(99, 102, 241, 0.45)');
      borderGrad.addColorStop(0.5, 'rgba(226, 232, 240, 0.9)');
      borderGrad.addColorStop(1, 'rgba(79, 70, 229, 0.3)');
      ctx.lineWidth = 1.5;
    } else {
      borderGrad.addColorStop(0, '#e0e7ff');
      borderGrad.addColorStop(1, '#c7d2fe');
      ctx.lineWidth = 1.2;
    }
    ctx.strokeStyle = borderGrad;
    ctx.beginPath();
    ctx.roundRect(
      currentContainerRect.x,
      currentContainerRect.y,
      currentContainerRect.w,
      currentContainerRect.h,
      12 + elevationZ * 16
    );
    ctx.stroke();
    ctx.restore();

    // Contenu intérieur du conteneur selon son état (carte compacte vs panneau étendu)
    if (expansionProgress < 0.35) {
      // Vue compacte dans la grille
      const cardX = currentContainerRect.x;
      const cardY = currentContainerRect.y;

      ctx.fillStyle = isPointingAtCard ? '#4338ca' : '#4f46e5';
      ctx.font = '700 13.5px "DM Sans", sans-serif';
      ctx.fillText('Français', cardX + 12, cardY + 24);

      ctx.fillStyle = '#475569';
      ctx.font = '600 11.5px "DM Sans", sans-serif';
      ctx.fillText('3AC 1  ·  10h00 - 11h00', cardX + 12, cardY + 44);

      // Badge de statut (Séance validée si f >= 540)
      if (isCourseValidated) {
        ctx.fillStyle = '#10b981';
        ctx.beginPath();
        ctx.roundRect(cardX + 12, cardY + 60, 96, 22, 6);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.font = '700 11px "DM Sans", sans-serif';
        ctx.fillText('✓ Séance validée', cardX + 18, cardY + 75);
      } else {
        ctx.fillStyle = 'rgba(79, 70, 229, 0.12)';
        ctx.beginPath();
        ctx.roundRect(cardX + 12, cardY + 60, 84, 22, 6);
        ctx.fill();
        ctx.fillStyle = '#4f46e5';
        ctx.font = '600 11px "DM Sans", sans-serif';
        ctx.fillText('À renseigner', cardX + 18, cardY + 75);
      }
    } else {
      // ─────────────────────────────────────────────────────────
      // Vue grand panneau central ("Full Expansion One Container")
      // ─────────────────────────────────────────────────────────
      const pX = currentContainerRect.x;
      const pY = currentContainerRect.y;
      const opacity = Math.min(1, (expansionProgress - 0.35) / 0.4);

      ctx.save();
      ctx.globalAlpha = opacity;

      // En-tête du cours
      ctx.fillStyle = '#4f46e5';
      ctx.beginPath();
      ctx.roundRect(pX + 32, pY + 28, 140, 28, 8);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = '700 12px "DM Sans", sans-serif';
      ctx.fillText('MARDI 14 OCTOBRE', pX + 42, pY + 46);

      ctx.fillStyle = '#0f172a';
      ctx.font = '700 24px "DM Sans", sans-serif';
      ctx.fillText('Français — 3ème Année Collège (Groupe 3AC 1)', pX + 32, pY + 86);

      ctx.fillStyle = '#64748b';
      ctx.font = '500 15px "DM Sans", sans-serif';
      ctx.fillText('Horaires officiels : 10h00 - 11h00  ·  Salle 14  ·  M. Le Professeur', pX + 32, pY + 112);

      // Séparateur horizontal
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(pX + 32, pY + 130);
      ctx.lineTo(pX + currentContainerRect.w - 32, pY + 130);
      ctx.stroke();

      // Bloc Séquence & Plan de séance (Loi de Jakob / Référence Pédagogique)
      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      ctx.roundRect(pX + 32, pY + 148, 560, 220, 16);
      ctx.fill();
      ctx.strokeStyle = '#e2e8f0';
      ctx.stroke();

      ctx.fillStyle = '#4338ca';
      ctx.font = '700 13px "DM Sans", sans-serif';
      ctx.fillText('SÉQUENCE 2 · POÉSIE LYRIQUE & FIGURES DE STYLE', pX + 52, pY + 178);

      ctx.fillStyle = '#0f172a';
      ctx.font = '600 17px "DM Sans", sans-serif';
      ctx.fillText('Séance n° 14 : Étude de texte — « Le Lac » (Lamartine)', pX + 52, pY + 208);

      ctx.fillStyle = '#334155';
      ctx.font = '400 14px "DM Sans", sans-serif';
      ctx.fillText('• Objectif : Identifier la métaphore du temps qui s’écoule.', pX + 52, pY + 236);
      ctx.fillText('• Déroulement : Lecture expressive, analyse des strophes 1 à 4.', pX + 52, pY + 260);
      ctx.fillText('• Compétence : Maîtrise des figures de style (prosopopée, anaphore).', pX + 52, pY + 284);

      // Badge durée
      ctx.fillStyle = '#e0e7ff';
      ctx.beginPath();
      ctx.roundRect(pX + 52, pY + 312, 100, 26, 6);
      ctx.fill();
      ctx.fillStyle = '#4338ca';
      ctx.font = '700 11px "DM Sans", sans-serif';
      ctx.fillText('DURÉE : 1H00', pX + 64, pY + 329);

      // Bloc Pièces Jointes & Documents PDF
      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      ctx.roundRect(pX + 620, pY + 148, 580, 220, 16);
      ctx.fill();
      ctx.strokeStyle = '#e2e8f0';
      ctx.stroke();

      ctx.fillStyle = '#475569';
      ctx.font = '700 13px "DM Sans", sans-serif';
      ctx.fillText('DOCUMENTS & RESSOURCES ASSOCIÉES (2)', pX + 640, pY + 178);

      // Fichier 1 PDF
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.roundRect(pX + 640, pY + 196, 540, 68, 12);
      ctx.fill();
      ctx.strokeStyle = '#cbd5e1';
      ctx.stroke();

      // Icône PDF rouge/bordeaux
      ctx.fillStyle = '#e11d48';
      ctx.beginPath();
      ctx.roundRect(pX + 656, pY + 210, 38, 40, 8);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = '700 11px monospace';
      ctx.fillText('PDF', pX + 664, pY + 235);

      ctx.fillStyle = '#0f172a';
      ctx.font = '600 14px "DM Sans", sans-serif';
      ctx.fillText('support_texte_le_lac_lamartine.pdf', pX + 708, pY + 226);
      ctx.fillStyle = '#64748b';
      ctx.font = '400 12px "DM Sans", sans-serif';
      ctx.fillText('Document élève A4  ·  1.2 Mo  ·  Validé conforme', pX + 708, pY + 246);

      // Fichier 2 PDF
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.roundRect(pX + 640, pY + 278, 540, 68, 12);
      ctx.fill();
      ctx.strokeStyle = '#cbd5e1';
      ctx.stroke();

      ctx.fillStyle = '#0284c7';
      ctx.beginPath();
      ctx.roundRect(pX + 656, pY + 292, 38, 40, 8);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = '700 11px monospace';
      ctx.fillText('DOC', pX + 664, pY + 317);

      ctx.fillStyle = '#0f172a';
      ctx.font = '600 14px "DM Sans", sans-serif';
      ctx.fillText('fiche_vocabulaire_figures_de_style.pdf', pX + 708, pY + 308);
      ctx.fillStyle = '#64748b';
      ctx.font = '400 12px "DM Sans", sans-serif';
      ctx.fillText('Fiche mémo vocabulaire  ·  640 Ko  ·  Prêt à projeter', pX + 708, pY + 328);

      // ─────────────────────────────────────────────────────────
      // Zone de saisie du devoir & Validation chirurgicale
      // ─────────────────────────────────────────────────────────
      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      ctx.roundRect(pX + 32, pY + 396, currentContainerRect.w - 64, 340, 16);
      ctx.fill();
      ctx.strokeStyle = '#e2e8f0';
      ctx.stroke();

      ctx.fillStyle = '#0f172a';
      ctx.font = '700 16px "DM Sans", sans-serif';
      ctx.fillText('Travail à faire (Devoir pour la prochaine séance)', pX + 56, pY + 432);

      ctx.fillStyle = '#64748b';
      ctx.font = '400 13px "DM Sans", sans-serif';
      ctx.fillText('Saisie du devoir inscrite automatiquement dans le cahier et notifiée aux élèves.', pX + 56, pY + 454);

      // Boîte de champ texte saisie
      const inputX = pX + 56;
      const inputY = pY + 472;
      const inputW = currentContainerRect.w - 112;
      const inputH = 120;

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.roundRect(inputX, inputY, inputW, inputH, 12);
      ctx.fill();
      ctx.strokeStyle = f >= 390 ? '#4f46e5' : '#cbd5e1';
      ctx.lineWidth = f >= 390 ? 2 : 1;
      ctx.stroke();

      // Simulation de la frappe lettre par lettre (Frames 390 -> 510)
      let typedCharsCount = 0;
      if (f >= 390 && f < 510) {
        typedCharsCount = Math.floor(((f - 390) / 120) * HOMEWORK_TEXT.length);
      } else if (f >= 510) {
        typedCharsCount = HOMEWORK_TEXT.length;
      }
      const visibleHomeworkText = HOMEWORK_TEXT.substring(0, typedCharsCount);

      ctx.fillStyle = '#0f172a';
      ctx.font = '500 17px "DM Sans", monospace';
      ctx.fillText(visibleHomeworkText, inputX + 20, inputY + 44);

      // Curseur battant chirurgical (2 Hz)
      if (f >= 360 && f < 540) {
        const cursorBlink = Math.sin(f * 0.28) > 0;
        if (cursorBlink) {
          const textWidth = ctx.measureText(visibleHomeworkText).width;
          ctx.fillStyle = '#4f46e5';
          ctx.fillRect(inputX + 22 + textWidth, inputY + 26, 2.5, 24);
        }
      }

      // Date d'échéance programmée
      ctx.fillStyle = '#475569';
      ctx.font = '500 13px "DM Sans", sans-serif';
      ctx.fillText('📅 Échéance : Jeudi 16 Octobre 2026 à 08h00  ·  Type : Travail écrit individuel', inputX + 20, inputY + 88);

      // Bouton de validation chirurgicale
      const btnX = inputX;
      const btnY = inputY + inputH + 24;
      const btnW = 260;
      const btnH = 54;

      const isButtonHovered = f >= 520 && f < 540;
      const isButtonClicked = f >= 540;

      ctx.save();
      if (isButtonClicked) {
        ctx.fillStyle = '#059669'; // Vert émeraude validé
      } else if (isButtonHovered) {
        ctx.fillStyle = '#4338ca'; // Indigo sombre pressé
      } else {
        ctx.fillStyle = '#4f46e5'; // Indigo officiel
      }
      ctx.beginPath();
      ctx.roundRect(btnX, btnY, btnW, btnH, 14);
      ctx.fill();

      // Tracé morphing de la coche (Checkmark) net sans confetti
      if (isButtonClicked) {
        const checkProgress = Math.min(1, (f - 540) / 16);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3.5;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        ctx.beginPath();
        // Premier segment : (btnX + 28, btnY + 27) vers (btnX + 38, btnY + 36)
        const p1x = btnX + 26;
        const p1y = btnY + 27;
        const p2x = btnX + 36;
        const p2y = btnY + 37;
        const p3x = btnX + 52;
        const p3y = btnY + 18;

        ctx.moveTo(p1x, p1y);
        if (checkProgress < 0.4) {
          const seg1 = checkProgress / 0.4;
          ctx.lineTo(p1x + (p2x - p1x) * seg1, p1y + (p2y - p1y) * seg1);
        } else {
          ctx.lineTo(p2x, p2y);
          const seg2 = (checkProgress - 0.4) / 0.6;
          ctx.lineTo(p2x + (p3x - p2x) * seg2, p2y + (p3y - p2y) * seg2);
        }
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.font = '700 15px "DM Sans", sans-serif';
        ctx.fillText('Séance Enregistrée', btnX + 66, btnY + 33);
      } else {
        ctx.fillStyle = '#ffffff';
        ctx.font = '700 15px "DM Sans", sans-serif';
        ctx.fillText('Enregistrer & Valider', btnX + 46, btnY + 33);
      }
      ctx.restore();

      // Badge secondaire de confirmation propre
      if (isButtonClicked) {
        ctx.fillStyle = 'rgba(16, 185, 129, 0.12)';
        ctx.beginPath();
        ctx.roundRect(btnX + btnW + 20, btnY, 320, btnH, 12);
        ctx.fill();
        ctx.strokeStyle = 'rgba(16, 185, 129, 0.4)';
        ctx.stroke();

        ctx.fillStyle = '#065f46';
        ctx.font = '600 13px "DM Sans", sans-serif';
        ctx.fillText('✓ Synchronisé avec le Bulletin Officiel', btnX + btnW + 36, btnY + 33);
      }

      ctx.restore(); // Fin du grand panneau
    }

    // ─────────────────────────────────────────────────────────────
    // 5. LA MASCOTTE « PLUME » VECTORIELLE PURE
    // ─────────────────────────────────────────────────────────────
    // Position de base de la mascotte
    const mascotTargetX = 1620;
    const mascotTargetY = 660;

    // Entrée sous-amortie (Frame 30 -> 60)
    const mascotX = springValue(1860, mascotTargetX, f, 30, 30);
    const mascotEntranceY = springValue(1080, mascotTargetY, f, 30, 30);

    // Respiration continue du torse : sin(frame * 0.08) * 3.5px
    const breathOffset = calculateBreathingOffset(f, 0.08, 3.5);
    const mascotY = mascotEntranceY + breathOffset;

    // État des yeux et clignements (Frames 45, 165, 345, 530, et clin d'œil à 780)
    const blinkState = evaluateBlinkState(f);

    // Orientation dynamique des pupilles
    let pupilTarget: Point2D;
    if (f < 140) {
      pupilTarget = { x: calX + 300, y: calY + 300 }; // Vers le calendrier
    } else if (f >= 140 && f < 240) {
      pupilTarget = { x: baseCardRect.x + 80, y: baseCardRect.y + 40 }; // Vers la case de cours
    } else if (f >= 240 && f < 640) {
      pupilTarget = { x: 740, y: 560 }; // Vers le formulaire / la zone de devoir
    } else {
      pupilTarget = { x: 1620, y: 500 }; // Face à la caméra / l'utilisateur
    }

    ctx.save();
    ctx.translate(mascotX, mascotY);

    // Ombre au sol de la mascotte
    ctx.fillStyle = 'rgba(15, 23, 42, 0.12)';
    ctx.beginPath();
    ctx.ellipse(0, 240, 72, 16, 0, 0, Math.PI * 2);
    ctx.fill();

    // ── BUSTE (body.svg) ──
    ctx.save();
    const jacketGrad = ctx.createLinearGradient(0, 60, 0, 240);
    jacketGrad.addColorStop(0, '#4f46e5');
    jacketGrad.addColorStop(0.5, '#4338ca');
    jacketGrad.addColorStop(1, '#312e81');

    // Épaules et torse
    ctx.fillStyle = jacketGrad;
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-74, 240);
    ctx.bezierCurveTo(-76, 178, -56, 118, -26, 112);
    ctx.lineTo(-14, 110);
    ctx.quadraticCurveTo(0, 114, 14, 110);
    ctx.lineTo(26, 112);
    ctx.bezierCurveTo(56, 118, 76, 178, 74, 240);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Plastron blanc
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(-16, 114);
    ctx.lineTo(0, 158);
    ctx.lineTo(16, 114);
    ctx.quadraticCurveTo(0, 117, -16, 114);
    ctx.fill();
    ctx.stroke();

    // Cravate scolaire indigo
    ctx.fillStyle = '#6366f1';
    ctx.beginPath();
    ctx.moveTo(-4, 134);
    ctx.lineTo(4, 134);
    ctx.lineTo(6, 168);
    ctx.lineTo(0, 174);
    ctx.lineTo(-6, 168);
    ctx.closePath();
    ctx.fill();

    // Écusson scolaire brodé (gauche)
    ctx.fillStyle = '#1e1b4b';
    ctx.beginPath();
    ctx.arc(-38, 154, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 1.2;
    ctx.stroke();
    // Étoile/plume d'or
    ctx.fillStyle = '#fbbf24';
    ctx.beginPath();
    ctx.moveTo(-38, 148);
    ctx.lineTo(-35, 158);
    ctx.lineTo(-41, 158);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // ── TÊTE & CASQUE (head.svg) ──
    ctx.save();
    // Micro-inclinaison de tête
    const headTilt = Math.sin(f * 0.04) * 0.025;
    ctx.rotate(headTilt);

    // Écouteurs latéraux (Ear pods)
    // Pod gauche
    ctx.fillStyle = '#e2e8f0';
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(-98, -8, 16, 48, 8);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#4f46e5';
    ctx.beginPath();
    ctx.arc(-90, 16, 4, 0, Math.PI * 2);
    ctx.fill();

    // Pod droit
    ctx.fillStyle = '#e2e8f0';
    ctx.beginPath();
    ctx.roundRect(82, -8, 16, 48, 8);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#4f46e5';
    ctx.beginPath();
    ctx.arc(90, 16, 4, 0, Math.PI * 2);
    ctx.fill();

    // Coque de casque blanc perle
    const headShellGrad = ctx.createLinearGradient(0, -68, 0, 84);
    headShellGrad.addColorStop(0, '#ffffff');
    headShellGrad.addColorStop(0.7, '#f8fafc');
    headShellGrad.addColorStop(1, '#e2e8f0');

    ctx.fillStyle = headShellGrad;
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(-76, -68, 152, 152, 42);
    ctx.fill();
    ctx.stroke();

    // Plume supérieure stylisée (indigo #4f46e5)
    ctx.save();
    const plumeGrad = ctx.createLinearGradient(0, -114, 18, -68);
    plumeGrad.addColorStop(0, '#6366f1');
    plumeGrad.addColorStop(0.6, '#4f46e5');
    plumeGrad.addColorStop(1, '#3730a3');

    ctx.fillStyle = plumeGrad;
    ctx.strokeStyle = '#312e81';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(4, -68);
    ctx.quadraticCurveTo(8, -96, 20, -118);
    ctx.quadraticCurveTo(6, -92, -2, -68);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Nervure de plume
    ctx.strokeStyle = '#c7d2fe';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(2, -68);
    ctx.quadraticCurveTo(8, -94, 18, -114);
    ctx.stroke();
    ctx.restore();

    // Visière technologique foncée
    const visorGrad = ctx.createLinearGradient(0, -26, 0, 56);
    visorGrad.addColorStop(0, '#0f172a');
    visorGrad.addColorStop(1, '#1e1b4b');

    ctx.fillStyle = visorGrad;
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(-64, -26, 128, 92, 28);
    ctx.fill();
    ctx.stroke();

    // Liseré spéculaire oblique sur la visière (Liquid Glass)
    ctx.fillStyle = 'rgba(56, 189, 248, 0.12)';
    ctx.beginPath();
    ctx.moveTo(-52, -14);
    ctx.quadraticCurveTo(0, -22, 40, -14);
    ctx.lineTo(30, 0);
    ctx.quadraticCurveTo(-4, -6, -46, 2);
    ctx.closePath();
    ctx.fill();

    // ── YEUX, ORBITES & PUPILLES (eyes.svg & pupils.svg) ──
    const leftEyeOrigin: Point2D = { x: mascotX - 26, y: mascotY + 18 };
    const rightEyeOrigin: Point2D = { x: mascotX + 26, y: mascotY + 18 };

    const leftPupilOffset = calculatePupilDirection(pupilTarget, leftEyeOrigin, 4.5);
    const rightPupilOffset = calculatePupilDirection(pupilTarget, rightEyeOrigin, 4.5);

    // Dessin œil gauche
    ctx.save();
    ctx.translate(-26, 18);
    if (blinkState.blinkProgress > 0.8 && !blinkState.isWinking) {
      // Clignement œil fermé
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2.5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-16, 2);
      ctx.quadraticCurveTo(0, 10, 16, 2);
      ctx.stroke();
    } else {
      // Orbite ouverte
      ctx.fillStyle = '#0f172a';
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.ellipse(0, 0, 17, 21 * (1 - blinkState.blinkProgress * 0.9), 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Pupille directionnelle mobile
      if (blinkState.blinkProgress < 0.7) {
        ctx.save();
        ctx.translate(leftPupilOffset.x, leftPupilOffset.y);
        // Iris cyan
        ctx.fillStyle = '#0284c7';
        ctx.beginPath();
        ctx.arc(0, 0, 9, 0, Math.PI * 2);
        ctx.fill();
        // Cœur noir
        ctx.fillStyle = '#020617';
        ctx.beginPath();
        ctx.arc(0, 0, 5, 0, Math.PI * 2);
        ctx.fill();
        // Reflet blanc vif
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(2.5, -2.5, 2.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }
    ctx.restore();

    // Dessin œil droit
    ctx.save();
    ctx.translate(26, 18);
    if (blinkState.isWinking) {
      // Clin d'œil franc (Frame 780+)
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 3.5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-16, -1);
      ctx.quadraticCurveTo(0, 10, 16, -1);
      ctx.stroke();
      // Étoile complice
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath();
      ctx.arc(19, -6, 2.5, 0, Math.PI * 2);
      ctx.fill();
    } else if (blinkState.blinkProgress > 0.8) {
      // Clignement œil fermé
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2.5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-16, 2);
      ctx.quadraticCurveTo(0, 10, 16, 2);
      ctx.stroke();
    } else {
      // Orbite ouverte
      ctx.fillStyle = '#0f172a';
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.ellipse(0, 0, 17, 21 * (1 - blinkState.blinkProgress * 0.9), 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Pupille directionnelle mobile
      if (blinkState.blinkProgress < 0.7) {
        ctx.save();
        ctx.translate(rightPupilOffset.x, rightPupilOffset.y);
        ctx.fillStyle = '#0284c7';
        ctx.beginPath();
        ctx.arc(0, 0, 9, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#020617';
        ctx.beginPath();
        ctx.arc(0, 0, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(2.5, -2.5, 2.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }
    ctx.restore();

    ctx.restore(); // Fin de la tête

    // ── BRAS, MAINS & STYLET (hands.svg & stylus.svg) ──
    ctx.save();
    if (f >= 170 && f <= 210) {
      // Index pointé vers la carte de cours (Frame 180)
      ctx.translate(-70, 130);
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-20, 0);
      ctx.lineTo(-70, -30); // Index pointé vers la gauche
      ctx.lineTo(-70, -20);
      ctx.lineTo(-20, 10);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else if (f >= 360 && f <= 620) {
      // Main tenant le stylet tactile haute précision
      ctx.translate(-50, 135);

      // Dessin du stylet haute précision
      ctx.save();
      ctx.rotate(-0.4);
      // Corps aluminium
      ctx.fillStyle = '#cbd5e1';
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 1.5;
      ctx.fillRect(-6, -80, 12, 100);
      ctx.strokeRect(-6, -80, 12, 100);

      // Bague indigo
      ctx.fillStyle = '#4f46e5';
      ctx.fillRect(-6, -30, 12, 14);

      // Pointe fine active
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.moveTo(-4, 20);
      ctx.lineTo(4, 20);
      ctx.lineTo(0, 32);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.arc(0, 32, 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Main fermée en pince
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(0, 0, 18, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    } else if (f >= 770) {
      // Salut amical final (Frame 780+)
      ctx.translate(65, 120);
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(0, -10, 16, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      // Doigts déployés en coucou
      for (let fi = -2; fi <= 2; fi++) {
        ctx.beginPath();
        ctx.moveTo(fi * 6, -20);
        ctx.lineTo(fi * 7, -34);
        ctx.stroke();
      }
    } else {
      // Main au repos
      ctx.translate(-60, 145);
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(-14, -14, 28, 28, 10);
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();

    ctx.restore(); // Fin de la mascotte

    // ─────────────────────────────────────────────────────────────
    // 6. BANNIÈRE SIGNATURE FINALE (Frames 780 -> 960)
    // ─────────────────────────────────────────────────────────────
    if (f >= 780) {
      const bannerOpacity = Math.min(1, (f - 780) / 40);
      ctx.save();
      ctx.globalAlpha = bannerOpacity;

      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.beginPath();
      ctx.roundRect(W / 2 - 280, H - 110, 560, 54, 27);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.font = '600 16px "DM Sans", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Mon cahier de textes — Conçu pour l’enseignant', W / 2, H - 76);
      ctx.restore();
    }

    ctx.restore();
  }, []);

  // Boucle d'animation principale à 60 FPS
  useEffect(() => {
    if (!isPlaying) {
      if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
      lastTimeRef.current = null;
      return;
    }

    const step = (time: number) => {
      if (lastTimeRef.current === null) {
        lastTimeRef.current = time;
      }
      const deltaMs = time - lastTimeRef.current;
      lastTimeRef.current = time;

      accumulatedTimeRef.current += deltaMs * speed;
      const frameDurationMs = 1000 / FPS;

      if (accumulatedTimeRef.current >= frameDurationMs) {
        const framesToAdvance = Math.floor(accumulatedTimeRef.current / frameDurationMs);
        accumulatedTimeRef.current -= framesToAdvance * frameDurationMs;

        setCurrentFrame(prev => {
          const next = prev + framesToAdvance;
          if (next >= TOTAL_FRAMES) {
            setIsPlaying(false);
            return TOTAL_FRAMES;
          }
          triggerAudioAtFrame(next);
          onFrameChange?.(next);
          return next;
        });
      }

      animFrameIdRef.current = requestAnimationFrame(step);
    };

    animFrameIdRef.current = requestAnimationFrame(step);

    return () => {
      if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
    };
  }, [isPlaying, speed, triggerAudioAtFrame, onFrameChange]);

  // Redessine dès que la frame change
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    renderFrame(ctx, currentFrame);
  }, [currentFrame, renderFrame]);

  // Formatage du timecode 00:SS:FF
  const formatTimecode = (f: number) => {
    const totalSeconds = Math.floor(f / FPS);
    const frames = f % FPS;
    const seconds = totalSeconds % 60;
    return `00:${String(seconds).padStart(2, '0')}:${String(frames).padStart(2, '0')}`;
  };

  const currentBeat = Math.floor(currentFrame / 30) + 1;

  const jumpToFrame = (f: number) => {
    const target = Math.max(0, Math.min(TOTAL_FRAMES, f));
    setCurrentFrame(target);
    triggerAudioAtFrame(target);
    onFrameChange?.(target);
  };

  return (
    <div className={`motion-film-container flex flex-col items-center bg-stone-900 text-stone-100 p-4 rounded-3xl shadow-2xl ${className}`}>
      {/* Zone Canvas 16:9 haute définition 1920x1080 */}
      <div className="relative w-full max-w-[1280px] aspect-video bg-black rounded-2xl overflow-hidden border border-stone-800 shadow-inner">
        <canvas
          ref={canvasRef}
          width={1920}
          height={1080}
          className="w-full h-full object-contain block"
        />

        {/* Badge Timecode en surimpression discrète en haut à droite */}
        <div className="absolute top-4 right-4 bg-stone-950/80 backdrop-blur-md px-3 py-1.5 rounded-lg border border-stone-700/50 flex items-center gap-3 text-xs font-mono">
          <span className="text-indigo-400 font-semibold">BEAT {currentBeat} / 32</span>
          <span className="text-stone-400">|</span>
          <span className="text-stone-200">{formatTimecode(currentFrame)}</span>
          <span className="text-stone-400">|</span>
          <span className="text-stone-400">F{currentFrame}</span>
        </div>
      </div>

      {/* Barre de contrôle du Player avec Scrubber de précision */}
      <div className="w-full max-w-[1280px] mt-4 flex flex-col gap-3 bg-stone-950/90 border border-stone-800 p-4 rounded-2xl backdrop-blur-xl">
        {/* Scrubber linéaire */}
        <div className="flex items-center gap-3 w-full">
          <span className="text-xs font-mono text-stone-400 w-16 text-left">
            {formatTimecode(currentFrame)}
          </span>
          <input
            type="range"
            min={0}
            max={TOTAL_FRAMES}
            value={currentFrame}
            onChange={e => jumpToFrame(Number(e.target.value))}
            className="flex-1 accent-indigo-500 h-2 bg-stone-800 rounded-lg cursor-pointer"
          />
          <span className="text-xs font-mono text-stone-400 w-16 text-right">
            {formatTimecode(TOTAL_FRAMES)}
          </span>
        </div>

        {/* Boutons d'accès direct aux 5 Keyframes du cahier des charges */}
        <div className="flex items-center justify-between gap-2 overflow-x-auto py-1 border-t border-b border-stone-800/80">
          <span className="text-xs text-stone-400 font-medium whitespace-nowrap mr-2">Keyframes QA :</span>
          <div className="flex gap-2">
            {KEY_MOMENTS.map(km => {
              const isActive = Math.abs(currentFrame - km.frame) <= 5;
              return (
                <button
                  key={km.frame}
                  type="button"
                  onClick={() => jumpToFrame(km.frame)}
                  title={km.desc}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap cursor-pointer ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20 ring-1 ring-indigo-400'
                      : 'bg-stone-900 hover:bg-stone-800 text-stone-300 border border-stone-800'
                  }`}
                >
                  {km.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Commandes de transport (Play, Frame par Frame, Vitesse, Mute) */}
        <div className="flex items-center justify-between gap-4 pt-1">
          <div className="flex items-center gap-2">
            {/* Saut -1 Beat (-30 frames) */}
            <button
              type="button"
              onClick={() => jumpToFrame(currentFrame - 30)}
              className="px-2.5 py-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 text-stone-300 text-xs font-mono border border-stone-800 cursor-pointer"
              title="Reculer d'un beat (-30 frames)"
            >
              -1 Beat
            </button>
            {/* Saut -1 Frame */}
            <button
              type="button"
              onClick={() => jumpToFrame(currentFrame - 1)}
              className="px-2.5 py-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 text-stone-300 text-xs font-mono border border-stone-800 cursor-pointer"
              title="Image précédente (-1 frame)"
            >
              -1F
            </button>

            {/* Play / Pause principal */}
            <button
              type="button"
              onClick={() => setIsPlaying(p => !p)}
              className={`px-5 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 cursor-pointer ${
                isPlaying
                  ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-lg shadow-amber-900/30'
                  : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-900/30'
              }`}
            >
              {isPlaying ? '⏸ Pause' : '▶ Lecture 60 FPS'}
            </button>

            {/* Saut +1 Frame */}
            <button
              type="button"
              onClick={() => jumpToFrame(currentFrame + 1)}
              className="px-2.5 py-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 text-stone-300 text-xs font-mono border border-stone-800 cursor-pointer"
              title="Image suivante (+1 frame)"
            >
              +1F
            </button>
            {/* Saut +1 Beat (+30 frames) */}
            <button
              type="button"
              onClick={() => jumpToFrame(currentFrame + 30)}
              className="px-2.5 py-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 text-stone-300 text-xs font-mono border border-stone-800 cursor-pointer"
              title="Avancer d'un beat (+30 frames)"
            >
              +1 Beat
            </button>
          </div>

          <div className="flex items-center gap-4">
            {/* Sélecteur de vitesse */}
            <div className="flex items-center gap-1 bg-stone-900 p-1 rounded-xl border border-stone-800">
              {[0.25, 0.5, 1, 2].map(spd => (
                <button
                  key={spd}
                  type="button"
                  onClick={() => setSpeed(spd)}
                  className={`px-2 py-1 rounded-lg text-xs font-mono cursor-pointer ${
                    speed === spd
                      ? 'bg-indigo-600 text-white'
                      : 'text-stone-400 hover:text-stone-200'
                  }`}
                >
                  {spd}x
                </button>
              ))}
            </div>

            {/* Bouton Mute / Unmute pour le Sound Engine procédural */}
            <button
              type="button"
              onClick={() => {
                const muted = soundEngine.toggleMute();
                setIsMuted(muted);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium border cursor-pointer flex items-center gap-1.5 ${
                isMuted
                  ? 'bg-stone-900 text-stone-400 border-stone-800'
                  : 'bg-emerald-950/60 text-emerald-400 border-emerald-800'
              }`}
              title="Activer ou couper le Sound Design procédural Web Audio"
            >
              {isMuted ? '🔇 Audio coupé' : '🔊 Audio Web API'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
