import type { CSSProperties } from "react";

/**
 * Procedural record-sleeve art, seeded by the record id so every sleeve in
 * the crate is distinct and stable across renders. No images are fetched:
 * this deliberately avoids pulling YouTube thumbnails for decoration.
 */

function hash(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

const VARIANTS = 4;

export function sleeveArt(id: string): CSSProperties {
  const h = hash(id);
  const hue = h % 360;
  const hue2 = (hue + 36 + ((h >>> 8) % 60)) % 360;
  const variant = (h >>> 16) % VARIANTS;
  const angle = (h >>> 20) % 180;

  const a = `hsl(${hue} 58% 58%)`;
  const b = `hsl(${hue2} 62% 30%)`;
  const ink = `hsl(${hue} 30% 14%)`;

  switch (variant) {
    case 0:
      // Rings, like a label seen through the sleeve cut-out.
      return {
        background: `repeating-radial-gradient(circle at 62% 42%, ${a} 0 6px, ${b} 6px 12px)`,
      };
    case 1:
      // Diagonal bands.
      return {
        background: `repeating-linear-gradient(${angle}deg, ${a} 0 14px, ${b} 14px 28px, ${ink} 28px 30px)`,
      };
    case 2:
      // Halves with a sun.
      return {
        background: `radial-gradient(circle at 70% 30%, ${a} 0 22%, transparent 23%), linear-gradient(${angle}deg, ${b} 0 55%, ${ink} 55% 100%)`,
      };
    default:
      // Dot grid on a wash.
      return {
        background: `radial-gradient(circle, ${ink} 0 2px, transparent 2.5px) 0 0 / 12px 12px, linear-gradient(${angle}deg, ${a}, ${b})`,
      };
  }
}
