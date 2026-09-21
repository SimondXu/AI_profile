import type { CSSProperties } from "react";

/**
 * Procedural record-sleeve art, seeded by the record id so every sleeve in
 * the crate is distinct and stable across renders. No images are fetched:
 * this deliberately avoids pulling YouTube thumbnails for decoration.
 *
 * Colour is *not* random: sleeves draw from six duotones built on the
 * studio's own materials (paper, cobalt, wood, vinyl) plus two inks that
 * sit inside that palette, so a crate of 116 reads as one collection.
 * Only the pattern and its angle are seeded.
 */

function hash(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

interface Duotone {
  /** Field colour. */
  a: string;
  /** Figure colour. */
  b: string;
  /** Representative colour for ambient lighting while this record plays. */
  glow: string;
}

const DUOTONES: Duotone[] = [
  { a: "var(--material-paper)", b: "var(--accent)", glow: "#2e52d4" },
  { a: "var(--material-vinyl)", b: "var(--material-wood)", glow: "#c9a27a" },
  { a: "var(--accent)", b: "var(--material-vinyl)", glow: "#2e52d4" },
  { a: "var(--material-paper)", b: "#1c1c1e", glow: "#8a8f9a" },
  { a: "#8f3a2f", b: "var(--material-paper)", glow: "#8f3a2f" },
  { a: "#d3a82a", b: "var(--material-vinyl)", glow: "#d3a82a" },
];

const PATTERNS = 5;

export function sleeveGlow(id: string): string {
  return DUOTONES[hash(id) % DUOTONES.length].glow;
}

export function sleeveArt(id: string): CSSProperties {
  const h = hash(id);
  const { a, b } = DUOTONES[h % DUOTONES.length];
  const pattern = (h >>> 8) % PATTERNS;
  const angle = (h >>> 16) % 180;
  const offset = 30 + ((h >>> 24) % 40);

  switch (pattern) {
    case 0:
      // Concentric rings, off-centre — a label seen through the cut-out.
      return {
        background: `repeating-radial-gradient(circle at ${offset}% 40%, ${b} 0 7px, ${a} 7px 16px)`,
      };
    case 1:
      // Wide bands.
      return {
        background: `repeating-linear-gradient(${angle}deg, ${a} 0 18px, ${b} 18px 34px)`,
      };
    case 2:
      // A sun over a horizon.
      return {
        background: `radial-gradient(circle at ${offset}% 34%, ${b} 0 21%, transparent 22%), linear-gradient(180deg, ${a} 0 62%, ${b} 62% 100%)`,
      };
    case 3:
      // Halftone dots on a field.
      return {
        background: `radial-gradient(circle, ${b} 0 2.2px, transparent 2.8px) 0 0 / 11px 11px, ${a}`,
      };
    default:
      // A single diagonal split with a thin rule.
      return {
        background: `linear-gradient(${angle}deg, ${a} 0 ${offset}%, ${b} ${offset}% calc(${offset}% + 3px), ${a} calc(${offset}% + 3px) calc(${offset}% + 9px), ${b} calc(${offset}% + 9px) 100%)`,
      };
  }
}
