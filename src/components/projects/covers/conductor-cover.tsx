import styles from "./covers.module.css";

/**
 * Conductor: an orthographic node graph of workflow modules. One branch
 * (top-left module fans out to two paths) merges back into a single module,
 * and a small checkpoint gate sits on the merge track — a nod to the
 * runtime's branch/merge/checkpoint execution model. Static by default;
 * hovering the card animates the track dash offset (see covers.module.css).
 */
export function ConductorCover() {
  const modules: Array<[number, number]> = [
    [40, 40],
    [220, 40],
    [400, 40],
    [40, 180],
    [220, 180],
    [400, 180],
    [220, 300],
  ];

  const tracks = [
    "M85,62 H265",
    "M265,62 H445",
    "M85,62 V202",
    "M265,62 V202",
    "M445,62 V202",
    "M85,202 H265",
    "M265,202 H445",
    "M85,202 V322 H265",
    "M445,202 V322 H265",
  ];

  return (
    <g>
      <g
        fill="none"
        stroke="var(--border)"
        strokeWidth={2}
        strokeLinecap="round"
      >
        {tracks.map((d) => (
          <path key={d} d={d} />
        ))}
      </g>

      <g
        className={styles.conductorFlow}
        fill="none"
        stroke="var(--accent)"
        strokeWidth={2}
        strokeLinecap="round"
        opacity={0.85}
      >
        {tracks.map((d) => (
          <path key={d} d={d} />
        ))}
      </g>

      <rect
        x={349}
        y={196}
        width={12}
        height={12}
        fill="var(--accent)"
        stroke="var(--surface)"
        strokeWidth={1.5}
      />

      {modules.map(([x, y]) => (
        <rect
          key={`${x}-${y}`}
          x={x}
          y={y}
          width={90}
          height={44}
          rx={10}
          fill="var(--surface)"
          stroke="var(--foreground)"
          strokeWidth={2}
        />
      ))}
    </g>
  );
}
