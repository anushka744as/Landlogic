import { useEffect, useRef, useState } from 'react';

interface CountUpProps {
  value: number;
  format: (v: number) => string;
  duration?: number;
}

/**
 * Animates a number from its previous value to `value` using an easeOutCubic
 * curve driven by requestAnimationFrame. First render animates from 0.
 */
export function CountUp({ value, format, duration = 900 }: CountUpProps) {
  const [display, setDisplay] = useState(0);
  const fromRef = useRef(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (value == null || Number.isNaN(value)) {
      setDisplay(0);
      return;
    }
    const from = fromRef.current;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      const current = from + (value - from) * eased;
      setDisplay(current);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        fromRef.current = value;
        setDisplay(value);
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, [value, duration]);

  return <>{format(display)}</>;
}
