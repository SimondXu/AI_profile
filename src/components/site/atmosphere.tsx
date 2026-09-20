/**
 * Fixed, non-interactive background: a fine dot grid that fades out down
 * the page and two slowly drifting accent/wood "aurora" blobs. Pure CSS
 * (`.atmosphere` in globals.css), so it costs no JS and freezes under
 * prefers-reduced-motion.
 */
export function Atmosphere() {
  return <div className="atmosphere" aria-hidden="true" />;
}
