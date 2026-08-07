import { useState, useEffect, useRef } from 'react';

export type RateLimitMode = 'debounce' | 'throttle';

export function useRateLimit<T>(
  value: T,
  delayMs: number = 300,
  mode: RateLimitMode = 'debounce'
): T {
  const [rateLimitedValue, setRateLimitedValue] = useState<T>(value);
  const lastExecutedRef = useRef<number>(Date.now());
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (mode === 'debounce') {
      timerRef.current = setTimeout(() => {
        setRateLimitedValue(value);
      }, delayMs);

      return () => {
        if (timerRef.current) clearTimeout(timerRef.current);
      };
    }

    if (mode === 'throttle') {
      const now = Date.now();
      const elapsed = now - lastExecutedRef.current;

      if (elapsed >= delayMs) {
        setRateLimitedValue(value);
        lastExecutedRef.current = now;
      } else {
        timerRef.current = setTimeout(() => {
          setRateLimitedValue(value);
          lastExecutedRef.current = Date.now();
        }, delayMs - elapsed);
      }

      return () => {
        if (timerRef.current) clearTimeout(timerRef.current);
      };
    }
  }, [value, delayMs, mode]);

  return rateLimitedValue;
}
