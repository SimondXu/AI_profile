import styles from "./covers.module.css";

/**
 * Engram: five translucent index-card layers stacked at a slight angle,
 * representing retrievable context slices, with one "memory slip" already
 * pulled part-way out. Hovering the card slides the slip 10px further out
 * (see covers.module.css); everything else stays still.
 */
export function EngramCover() {
  const layerWidth = 340;
  const layerHeight = 30;
  const slant = 40;

  const layers = [0, 1, 2, 3, 4].map((i) => {
    const x = 122 - i * 4;
    const y = 90 + i * 34;
    const opacity = 0.25 + i * 0.0875;
    const points = [
      [x + slant, y],
      [x + slant + layerWidth, y],
      [x + layerWidth, y + layerHeight],
      [x, y + layerHeight],
    ]
      .map(([px, py]) => `${px},${py}`)
      .join(" ");

    return { points, opacity, key: `layer-${i}` };
  });

  return (
    <g>
      {layers.map((layer) => (
        <polygon
          key={layer.key}
          points={layer.points}
          fill="var(--foreground)"
          fillOpacity={layer.opacity}
          stroke="var(--border)"
          strokeWidth={1}
        />
      ))}

      <g className={styles.engramSlip}>
        <polygon
          points="482,150 552,150 532,184 462,184"
          fill="var(--accent)"
          fillOpacity={0.92}
          stroke="var(--surface)"
          strokeWidth={1.5}
        />
      </g>
    </g>
  );
}
