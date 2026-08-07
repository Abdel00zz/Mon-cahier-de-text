import { useState, useEffect, useCallback, useRef } from 'react';

export interface UseScrollOptions {
  threshold?: number;
  key?: string;
  restore?: boolean;
}

export function useScroll(options: UseScrollOptions = {}) {
  const { threshold = 10, key, restore = false } = options;
  const [scrollY, setScrollY] = useState(0);
  const [isScrolled, setIsScrolled] = useState(false);
  const scrollPositionsRef = useRef<Record<string, number>>({});

  useEffect(() => {
    const handleScroll = () => {
      const current = window.scrollY;
      setScrollY(current);
      setIsScrolled(current > threshold);

      if (restore && key) {
        scrollPositionsRef.current[key] = current;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });

    if (restore && key && scrollPositionsRef.current[key] !== undefined) {
      window.scrollTo(0, scrollPositionsRef.current[key]);
    }

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [key, restore, threshold]);

  const scrollTo = useCallback((y: number, smooth = true) => {
    window.scrollTo({
      top: y,
      behavior: smooth ? 'smooth' : 'auto',
    });
  }, []);

  const scrollToTop = useCallback(() => scrollTo(0), [scrollTo]);

  return {
    scrollY,
    isScrolled,
    scrollTo,
    scrollToTop,
  };
}
