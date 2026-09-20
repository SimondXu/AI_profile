// WCAG 2.x contrast check for the studio v2 token palette.
// Run: node scripts/contrast-check.mjs   (exits 1 when a body-text pair < 4.5:1)

const themes = {
  light: {
    background: "#f3f0e9",
    surface: "#fbfaf6",
    foreground: "#191a1f",
    "muted-foreground": "#5e6068",
    accent: "#2e52d4",
    "accent-foreground": "#ffffff",
  },
  dark: {
    background: "#0f1115",
    surface: "#181b22",
    foreground: "#f1f0eb",
    "muted-foreground": "#a3a6af",
    accent: "#8fa7ff",
    "accent-foreground": "#0f1115",
  },
};

// [foreground token, background token, minimum ratio]
const pairs = [
  ["foreground", "background", 4.5],
  ["muted-foreground", "background", 4.5],
  ["foreground", "surface", 4.5],
  ["muted-foreground", "surface", 4.5],
  ["accent", "background", 4.5],
  ["accent-foreground", "accent", 4.5],
];

function channel(value) {
  const c = value / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function luminance(hex) {
  const n = parseInt(hex.slice(1), 16);
  const r = channel((n >> 16) & 255);
  const g = channel((n >> 8) & 255);
  const b = channel(n & 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a, b) {
  const la = luminance(a);
  const lb = luminance(b);
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

let failed = false;

for (const [theme, tokens] of Object.entries(themes)) {
  console.log(`\n${theme}`);
  for (const [fg, bg, min] of pairs) {
    const ratio = contrast(tokens[fg], tokens[bg]);
    const ok = ratio >= min;
    failed ||= !ok;
    console.log(
      `  ${ok ? "PASS" : "FAIL"} ${fg} on ${bg}: ${ratio.toFixed(2)}:1 (min ${min})`,
    );
  }
}

process.exit(failed ? 1 : 0);
