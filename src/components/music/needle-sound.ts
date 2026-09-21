/**
 * Two short UI cues for the deck, synthesised on the spot: the thump and
 * crackle of a stylus landing, and the softer lift. They are interface
 * sounds, not music — the same honest idea as the empty deck's surface noise.
 * A single AudioContext is created lazily on first use.
 */

let context: AudioContext | null = null;
let dropBuffer: AudioBuffer | null = null;
let liftBuffer: AudioBuffer | null = null;

function getContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  context ??= new AudioContext();
  return context;
}

function build(ctx: AudioContext, kind: "drop" | "lift"): AudioBuffer {
  const rate = ctx.sampleRate;
  const seconds = kind === "drop" ? 0.55 : 0.3;
  const buffer = ctx.createBuffer(1, Math.floor(rate * seconds), rate);
  const data = buffer.getChannelData(0);

  // Low thump: a decaying sine, deeper for the drop.
  const thumpHz = kind === "drop" ? 62 : 90;
  const thumpLevel = kind === "drop" ? 0.5 : 0.18;
  for (let i = 0; i < data.length; i++) {
    const t = i / rate;
    data[i] =
      Math.sin(2 * Math.PI * thumpHz * t) * thumpLevel * Math.exp(-t * 18);
  }

  // Crackle: sparse impulses, dense right after contact then thinning out.
  let lp = 0;
  const pops = kind === "drop" ? 26 : 8;
  for (let p = 0; p < pops; p++) {
    const at = Math.floor(Math.pow(Math.random(), 1.8) * data.length * 0.8);
    const amp = (0.06 + Math.random() * 0.16) * (Math.random() < 0.5 ? -1 : 1);
    const len = 30 + Math.floor(Math.random() * 120);
    for (let i = 0; i < len && at + i < data.length; i++) {
      lp += 0.35 * (Math.random() * 2 - 1 - lp);
      data[at + i] += amp * lp * Math.exp((-3 * i) / len) * 3;
    }
  }

  // Short hiss tail so it doesn't end on silence abruptly.
  for (let i = 0; i < data.length; i++) {
    const t = i / rate;
    data[i] += (Math.random() * 2 - 1) * 0.012 * Math.exp(-t * 6);
  }
  return buffer;
}

/** Plays a cue at `volume` (0–1). Silently does nothing if audio is unavailable. */
export function playNeedle(kind: "drop" | "lift", volume: number): void {
  const ctx = getContext();
  if (!ctx) return;
  const play = () => {
    const buffer =
      kind === "drop"
        ? (dropBuffer ??= build(ctx, "drop"))
        : (liftBuffer ??= build(ctx, "lift"));
    const source = ctx.createBufferSource();
    const gain = ctx.createGain();
    gain.gain.value = Math.min(1, Math.max(0, volume)) * 0.6;
    source.buffer = buffer;
    source.connect(gain);
    gain.connect(ctx.destination);
    source.start();
  };
  if (ctx.state === "suspended") {
    void ctx.resume().then(play, () => undefined);
  } else {
    play();
  }
}
