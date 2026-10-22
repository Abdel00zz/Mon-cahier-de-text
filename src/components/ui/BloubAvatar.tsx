import React, { memo, useEffect, useRef } from 'react';
import 'agent-robot-avatar';
import type { AgentRobotAvatarAction, AgentRobotAvatar as AgentRobotAvatarElement } from 'agent-robot-avatar';
import './bloub-avatar.css';

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'agent-robot-avatar': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        size?: number | string;
        color?: string;
        'auto-sleep'?: number | string;
        'wake-on'?: 'activity' | 'interaction' | 'manual';
        'motion'?: 'auto' | 'reduce' | 'full';
        'press-squeeze'?: boolean | 'true' | 'false';
        'antenna-drag'?: boolean | 'true' | 'false';
        'head-roundness'?: number | string;
        'antenna-flash'?: boolean | 'true' | 'false';
      };
    }
  }
}

type RobotAction = AgentRobotAvatarAction;
export type BloubExpression = RobotAction | 'happy' | 'excited' | 'concerned' | 'sad' | 'surprised' | 'wink' | 'tongue' | 'playful' | 'neutral' | 'attentive';

export interface BloubAvatarProps {
  expression?: BloubExpression;
  size?: number;
  color?: string;
  animate?: boolean;
  interactive?: boolean;
  attention?: boolean;
  antennaFlash?: boolean;
  headRoundness?: number;
  autoSleepMs?: number;
  className?: string;
}

/**
 * Traduction des humeurs pédagogiques et états de l'application
 * vers les actions natives de CX-ArtLab/agent-robot-avatar.
 */
export function toRobotAction(expression: BloubExpression): AgentRobotAvatarAction {
  switch (expression) {
    case 'happy':
    case 'excited':
    case 'success':
      return 'success';
    case 'concerned':
    case 'warning':
      return 'warning';
    case 'sad':
    case 'failure':
      return 'failure';
    case 'surprised':
    case 'surprise':
      return 'surprise';
    case 'love':
    case 'wink':
    case 'tongue':
    case 'playful':
      return 'love';
    case 'sleep':
      return 'sleep';
    case 'waiting':
      return 'waiting';
    case 'inspect':
      return 'inspect';
    case 'random':
      return 'random';
    case 'neutral':
      return 'idle';
    case 'attentive':
      return 'inspect';
    default:
      return expression;
  }
}

/**
 * Composant Avatar Robot officiel utilisant CX-ArtLab/agent-robot-avatar.
 * Intègre nativement le Web Component avec suivi du regard, clignement organique,
 * déformation press-squeeze, glissement d'antenne et adaptation pédagogique.
 */
export const BloubAvatar = memo(function BloubAvatar({
  expression = 'neutral',
  size = 30,
  color = 'var(--control-ink, #725b47)',
  animate = true,
  interactive = true,
  attention = false,
  antennaFlash,
  headRoundness,
  autoSleepMs = 30000,
  className = '',
}: BloubAvatarProps) {
  const avatarRef = useRef<AgentRobotAvatarElement | null>(null);

  useEffect(() => {
    const el = avatarRef.current;
    if (!el || typeof el.play !== 'function') return;
    const action = toRobotAction(expression);
    if (action === 'idle') {
      el.reset();
    } else {
      el.play(action);
    }
  }, [expression]);

  useEffect(() => {
    const el = avatarRef.current;
    if (!el) return;
    if (typeof el.setPointerFollow === 'function') {
      el.setPointerFollow(animate);
    }
    if (typeof el.setAntennaFlash === 'function') {
      el.setAntennaFlash(antennaFlash ?? attention);
    }
    if (typeof el.setHeadRoundness === 'function' && headRoundness !== undefined) {
      el.setHeadRoundness(headRoundness);
    }
  }, [animate, interactive, attention, antennaFlash, headRoundness]);

  useEffect(() => {
    const el = avatarRef.current;
    const host = el?.parentElement;
    if (!el || !host) return;
    const wake = () => el.noteActivity(true);
    host.addEventListener('pointerenter', wake);
    host.addEventListener('pointerdown', wake);
    host.addEventListener('focusin', wake);
    return () => {
      host.removeEventListener('pointerenter', wake);
      host.removeEventListener('pointerdown', wake);
      host.removeEventListener('focusin', wake);
    };
  }, []);

  return React.createElement('agent-robot-avatar', {
    ref: avatarRef,
    class: `bloub-avatar ${className}`.trim(),
    size,
    color,
    motion: animate ? 'auto' : 'reduce',
    'auto-sleep': String(autoSleepMs),
    'wake-on': 'interaction',
    'press-squeeze': interactive ? 'true' : 'false',
    'antenna-drag': 'false',
    'head-roundness': headRoundness !== undefined ? String(headRoundness) : undefined,
    'data-expression': expression,
    'data-animated': animate ? 'true' : 'false',
    'data-attention': (antennaFlash ?? attention) ? 'true' : 'false',
    'aria-hidden': 'true',
  });
});
