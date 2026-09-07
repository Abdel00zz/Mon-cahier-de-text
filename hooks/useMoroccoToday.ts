import { useEffect, useState } from 'react';
import { todayInMorocco } from '../utils/calendar';

/** Refresh a date-dependent detector at midnight even while the page stays visible. */
export function useMoroccoToday(): string {
  const [today, setToday] = useState(() => todayInMorocco());
  useEffect(() => {
    const refresh = () => setToday(todayInMorocco());
    const timer = window.setInterval(refresh, 30_000);
    document.addEventListener('visibilitychange', refresh);
    return () => { window.clearInterval(timer); document.removeEventListener('visibilitychange', refresh); };
  }, []);
  return today;
}
