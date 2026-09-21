"use client";

import { useCallback, useEffect, useRef } from "react";

/**
 * Paces a pulse to a record's real tempo. The engines only report position
 * every ~250 ms, so `sync()` takes those samples and the rAF loop
 * extrapolates between them, writing `--beat` (1 on the beat, decaying to 0
 * before the next) onto `element`. Nothing is written without a tempo, and
 * nothing at all under prefers-reduced-motion — the pulse never pretends.
 */
export function useBeat(
  element: React.RefObject<HTMLElement | null>,
  bpm: number | undefined,
  active: boolean,
) {
  const sampleRef = useRef<{ seconds: number; at: number } | null>(null);
  const rafRef = useRef(0);

  const sync = useCallback((seconds: number) => {
    sampleRef.current = { seconds, at: performance.now() };
  }, []);

  useEffect(() => {
    const el = element.current;
    if (!el) return;
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (!bpm || !active || reduced) {
      el.style.removeProperty("--beat");
      return;
    }
    const period = 60 / bpm;
    const tick = (now: number) => {
      const sample = sampleRef.current;
      if (sample) {
        const seconds = sample.seconds + (now - sample.at) / 1000;
        const phase = (((seconds % period) + period) % period) / period;
        // Fast attack, exponential release: reads as a thump, not a sine.
        const beat = Math.exp(-phase * 5.5);
        el.style.setProperty("--beat", beat.toFixed(3));
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(rafRef.current);
      el.style.removeProperty("--beat");
    };
  }, [element, bpm, active]);

  return sync;
}
