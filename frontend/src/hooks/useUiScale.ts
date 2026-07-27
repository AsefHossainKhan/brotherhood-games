"use client";

import { useLayoutEffect, useState } from "react";

// Reference design size the board looks best at (scale === 1). Everything
// (cards, table, seats) is sized as `basePx * scale`, so the whole board
// grows/shrinks fluidly with the window and never overflows a short 720p
// viewport or looks tiny on a large monitor.
const REF_WIDTH = 1180;
const REF_HEIGHT = 720;
const MIN_SCALE = 0.5;
const MAX_SCALE = 1.5;

/**
 * Returns a single fluid scale factor derived from the current viewport,
 * clamped to sane bounds. Recomputes on resize.
 */
export function useUiScale(): number {
  const [scale, setScale] = useState(1);

  useLayoutEffect(() => {
    const compute = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      const raw = Math.min(w / REF_WIDTH, h / REF_HEIGHT);
      const clamped = Math.max(MIN_SCALE, Math.min(MAX_SCALE, raw));
      setScale(clamped);
    };
    compute();
    window.addEventListener("resize", compute);
    return () => window.removeEventListener("resize", compute);
  }, []);

  return scale;
}
