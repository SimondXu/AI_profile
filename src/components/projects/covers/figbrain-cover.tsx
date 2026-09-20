import styles from "./covers.module.css";

/**
 * FigBrain: four geometric parts (circle, rounded square, triangle, capsule)
 * scattered on a faint grid canvas, each a few px away from an assembled
 * arrangement. Hovering the card nudges every part toward the centre (see
 * covers.module.css) — a small gesture at "generation assembling a design".
 */
export function FigBrainCover() {
  const verticalGuides = [1, 2, 3, 4, 5].map((i) => 100 * i);
  const horizontalGuides = [1, 2, 3].map((i) => 100 * i);

  return (
    <g>
      <g stroke="var(--border)" strokeWidth={1} opacity={0.5}>
        {verticalGuides.map((x) => (
          <line key={`v-${x}`} x1={x} y1={20} x2={x} y2={380} />
        ))}
        {horizontalGuides.map((y) => (
          <line key={`h-${y}`} x1={20} y1={y} x2={580} y2={y} />
        ))}
      </g>

      <g
        className={`${styles.figbrainPart} ${styles.figbrainPartA}`}
        fill="var(--surface)"
        stroke="var(--foreground)"
        strokeWidth={2}
      >
        <circle cx={165} cy={130} r={34} />
      </g>

      <g
        className={`${styles.figbrainPart} ${styles.figbrainPartB}`}
        fill="var(--accent-soft)"
        stroke="var(--accent)"
        strokeWidth={2}
      >
        <rect x={365} y={95} width={70} height={70} rx={14} />
      </g>

      <g
        className={`${styles.figbrainPart} ${styles.figbrainPartC}`}
        fill="var(--surface)"
        stroke="var(--foreground)"
        strokeWidth={2}
      >
        <polygon points="165,255 200,315 130,315" />
      </g>

      <g
        className={`${styles.figbrainPart} ${styles.figbrainPartD}`}
        fill="var(--surface)"
        stroke="var(--foreground)"
        strokeWidth={2}
      >
        <rect x={355} y={270} width={110} height={44} rx={22} />
      </g>
    </g>
  );
}
