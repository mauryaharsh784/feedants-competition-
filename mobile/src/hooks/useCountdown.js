import { useEffect, useRef, useState } from 'react';

function diffToParts(msRemaining) {
  const clamped = Math.max(msRemaining, 0);
  const totalSeconds = Math.floor(clamped / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return { days, hours, minutes, seconds, totalMs: clamped };
}

/**
 * Ticks down to `targetDate` every second using JS Date/time math only -
 * nothing is ever hardcoded like "2 days left". Cleans up its interval on
 * unmount or whenever targetDate changes, to avoid leaking timers.
 */
export function useCountdown(targetDate) {
  const [now, setNow] = useState(() => Date.now());
  const intervalRef = useRef(null);

  useEffect(() => {
    if (!targetDate) return undefined;

    intervalRef.current = setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [targetDate]);

  if (!targetDate) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, totalMs: 0, isFinished: true };
  }

  const target = new Date(targetDate).getTime();
  const msRemaining = target - now;
  const parts = diffToParts(msRemaining);

  return { ...parts, isFinished: msRemaining <= 0 };
}
