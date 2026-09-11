'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { restoreAlarm, tickAlarm, type AmmaAlarm } from './amma-alarm';
const key = 'amma-alarm-v1';
export function useAmmaAlarm() {
  const [alarm, setAlarm] = useState<AmmaAlarm | null>(null);
  const [storageWarning, setStorageWarning] = useState('');
  const current = useRef<AmmaAlarm | null>(null);
  const update = useCallback((next: AmmaAlarm | null) => {
    current.current = next;
    setAlarm(next);
    try {
      if (next) localStorage.setItem(key, JSON.stringify(next));
      else localStorage.removeItem(key);
      setStorageWarning('');
    } catch {
      setStorageWarning(
        'Storage is unavailable. This alarm will be lost if you refresh or close the page.',
      );
    }
  }, []);
  useEffect(() => {
    const restore = () => {
      try {
        const saved = restoreAlarm(localStorage.getItem(key));
        current.current = saved;
        setAlarm(saved);
      } catch {
        setStorageWarning(
          'Storage is unavailable. Alarms stay only in this tab.',
        );
      }
    };
    restore();
    const tick = () => {
      if (document.hidden) return;
      const next = tickAlarm(current.current, Date.now());
      if (next !== current.current) update(next);
    };
    const sync = (event: StorageEvent) => {
      if (event.key === key || event.key === null) {
        restore();
        tick();
      }
    };
    tick();
    const timer = setInterval(tick, 1000);
    window.addEventListener('storage', sync);
    document.addEventListener('visibilitychange', tick);
    return () => {
      clearInterval(timer);
      window.removeEventListener('storage', sync);
      document.removeEventListener('visibilitychange', tick);
    };
  }, [update]);
  const cancel = useCallback(() => update(null), [update]);
  return {
    alarm,
    ringing: alarm?.status === 'ringing',
    storageWarning,
    set: update,
    cancel,
  };
}
