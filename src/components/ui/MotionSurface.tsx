import { useEffect, useRef, type HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';
import { attachMotionSurface } from './motionSurfaceController';
import './motion-surface.css';

interface MotionSurfaceProps extends HTMLAttributes<HTMLDivElement> {
  /** Déplacement maximal en pixels ; 0 désactive l'animation. Borné à 12 px. */
  travelPx?: number;
}

/** Couche de mouvement autonome pour les figures SVG, sans nouveau rendu React par image. */
export function MotionSurface({ children, className, travelPx = 5, ...props }: MotionSurfaceProps) {
  const root = useRef<HTMLDivElement>(null);
  const layer = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (root.current && layer.current) return attachMotionSurface(root.current, layer.current, travelPx);
  }, [travelPx]);
  return <div {...props} ref={root} className={cn('motion-surface', className)} data-motion="off">
    <div ref={layer} className="motion-surface__layer">{children}</div>
  </div>;
}
