/**
 * Generic: a deterministic 6x4 grid of shapes seeded from the project slug.
 * Same slug -> same cover every render (no Math.random, no Date), so SSR and
 * client markup always match. No hover animation — a static pattern is
 * enough for projects without a dedicated art direction.
 */

const COLUMNS = 6;
const ROWS = 4;
const CELL = 600 / COLUMNS;
const ROW_HEIGHT = 400 / ROWS;
const MAX_ACCENT_CELLS = 3;

/** Deterministic 32-bit FNV-1a hash. */
function hashSlug(input: string): number {
  let hash = 0x811c9dc5;

  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }

  return hash >>> 0;
}

function trianglePoints(cx: number, cy: number, size: number): string {
  return [
    [cx, cy - size],
    [cx + size, cy + size],
    [cx - size, cy + size],
  ]
    .map(([x, y]) => `${x},${y}`)
    .join(" ");
}

interface GenericCoverProps {
  slug: string;
}

export function GenericCover({ slug }: GenericCoverProps) {
  const baseHash = hashSlug(slug || "generic");
  const accentCells = new Set<number>(
    [0, 1, 2].map((seed) => hashSlug(`${slug}#accent${seed}`) % (COLUMNS * ROWS)),
  );
  const accentOrder = Array.from(accentCells).slice(0, MAX_ACCENT_CELLS);

  const cells = Array.from({ length: COLUMNS * ROWS }, (_, index) => {
    const cellHash = hashSlug(`${slug}#${index}#${baseHash}`);
    const shapeType = cellHash % 3;
    const rotation = cellHash % 360;
    const sizeFactor = 0.55 + ((cellHash >>> 8) % 100) / 250;
    const isAccent = accentOrder.includes(index);

    const col = index % COLUMNS;
    const row = Math.floor(index / COLUMNS);
    const cx = col * CELL + CELL / 2;
    const cy = row * ROW_HEIGHT + ROW_HEIGHT / 2;

    const fill = isAccent ? "var(--accent-soft)" : "var(--surface)";
    const stroke = isAccent ? "var(--accent)" : "var(--muted-foreground)";
    const transform = `rotate(${rotation} ${cx} ${cy})`;

    if (shapeType === 0) {
      const r = 20 * sizeFactor;
      return (
        <circle
          key={index}
          cx={cx}
          cy={cy}
          r={r}
          fill={fill}
          stroke={stroke}
          strokeWidth={1.5}
        />
      );
    }

    if (shapeType === 1) {
      const size = 32 * sizeFactor;
      return (
        <rect
          key={index}
          x={cx - size / 2}
          y={cy - size / 2}
          width={size}
          height={size}
          rx={6}
          fill={fill}
          stroke={stroke}
          strokeWidth={1.5}
          transform={transform}
        />
      );
    }

    return (
      <polygon
        key={index}
        points={trianglePoints(cx, cy, 20 * sizeFactor)}
        fill={fill}
        stroke={stroke}
        strokeWidth={1.5}
        transform={transform}
      />
    );
  });

  return <g>{cells}</g>;
}
