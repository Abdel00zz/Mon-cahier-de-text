export const useHapticFeedback = () => {
  const impact = (style: 'light' | 'medium' | 'heavy' | 'soft' | 'rigid' = 'light') => {
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      const patterns: Record<string, number | number[]> = {
        light: 10,
        medium: 20,
        heavy: 30,
        soft: 6,
        rigid: 15,
      };
      const duration = patterns[style] || 10;
      try {
        navigator.vibrate(duration);
      } catch {
        // Ignorer si vibration non autorisée par le navigateur
      }
    }
  };

  const notification = (type: 'success' | 'warning' | 'error') => {
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      const patterns: Record<string, number[]> = {
        success: [10, 40, 10],
        warning: [15, 50, 15],
        error: [20, 50, 20, 50, 20],
      };
      const pattern = patterns[type] || [10];
      try {
        navigator.vibrate(pattern);
      } catch {
        // Ignorer si non supporté
      }
    }
  };

  return { impact, notification };
};
