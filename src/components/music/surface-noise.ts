/**
 * Web Audio engine for the empty deck: the surface noise of a record with
 * nothing pressed on it — tape-like hiss, sparse crackle pops, and a slow
 * amplitude wobble at platter speed. Everything is baked into one looping
 * buffer at creation time, so there are no timers to drift or leak.
 *
 * Created lazily on the first user gesture (autoplay policy) and disposed
 * by the owning component on unmount.
 */

export type Rpm = 33 | 45;

export interface SurfaceNoise {
  /** Frequency data source for meters; `fftSize` is 64 (32 bins). */
  readonly analyser: AnalyserNode;
  start(): Promise<void>;
  stop(): void;
  /** 0–1, perceptual curve applied internally. */
  setVolume(value: number): void;
  /** Platter speed: 45 pitches the loop up and shortens the wobble period. */
  setRpm(rpm: Rpm): void;
  dispose(): void;
}

const LOOP_SECONDS = 6;
const HISS_LEVEL = 0.028;
const POPS_PER_SECOND = 9;

function buildLoop(context: AudioContext): AudioBuffer {
  const sampleRate = context.sampleRate;
  const length = LOOP_SECONDS * sampleRate;
  const buffer = context.createBuffer(1, length, sampleRate);
  const data = buffer.getChannelData(0);

  // Hiss: white noise softened by a one-pole low-pass so it reads as tape,
  // not static.
  let lp = 0;
  const alpha = 0.32;
  for (let i = 0; i < length; i++) {
    lp += alpha * (Math.random() * 2 - 1 - lp);
    data[i] = lp * HISS_LEVEL;
  }

  // Crackle: short decaying impulses at random positions and polarities.
  const popCount = Math.round(LOOP_SECONDS * POPS_PER_SECOND);
  for (let p = 0; p < popCount; p++) {
    const start = Math.floor(Math.random() * (length - 400));
    const amplitude =
      (0.08 + Math.random() * 0.22) * (Math.random() < 0.5 ? -1 : 1);
    const decay = 40 + Math.floor(Math.random() * 220);
    for (let i = 0; i < decay; i++) {
      const env = Math.exp((-4 * i) / decay);
      data[start + i] += amplitude * env * (Math.random() * 0.6 + 0.4);
    }
  }

  // Wobble: one cycle per platter revolution at 33⅓ rpm (~1.8 s), so the
  // loop holds whole revolutions and joins cleanly.
  const revolution = 60 / 33.333;
  for (let i = 0; i < length; i++) {
    const t = i / sampleRate;
    data[i] *= 0.82 + 0.18 * Math.sin((2 * Math.PI * t) / revolution);
  }

  return buffer;
}

export function createSurfaceNoise(): SurfaceNoise {
  const context = new AudioContext();
  const gain = context.createGain();
  const analyser = context.createAnalyser();
  analyser.fftSize = 64;
  analyser.smoothingTimeConstant = 0.72;
  // The signal is quiet by design; narrow the dB window so the meter reads it.
  analyser.minDecibels = -96;
  analyser.maxDecibels = -36;

  // Meter taps the signal pre-fader, so it reflects the record, not the volume.
  gain.gain.value = 0;
  analyser.connect(gain);
  gain.connect(context.destination);

  let source: AudioBufferSourceNode | null = null;
  let loop: AudioBuffer | null = null;
  let volume = 0.5;
  let rpm: Rpm = 33;

  const targetGain = () => volume * volume * 0.9;

  return {
    analyser,

    async start() {
      if (context.state === "suspended") await context.resume();
      if (source) return;
      loop ??= buildLoop(context);
      source = context.createBufferSource();
      source.buffer = loop;
      source.loop = true;
      source.playbackRate.value = rpm / 33.333;
      source.connect(analyser);
      source.start();
      gain.gain.cancelScheduledValues(context.currentTime);
      gain.gain.setValueAtTime(0, context.currentTime);
      gain.gain.linearRampToValueAtTime(
        targetGain(),
        context.currentTime + 0.6,
      );
    },

    stop() {
      if (!source) return;
      const stopping = source;
      source = null;
      gain.gain.cancelScheduledValues(context.currentTime);
      gain.gain.setValueAtTime(gain.gain.value, context.currentTime);
      gain.gain.linearRampToValueAtTime(0, context.currentTime + 0.35);
      stopping.stop(context.currentTime + 0.4);
    },

    setVolume(value) {
      volume = Math.min(1, Math.max(0, value));
      if (source)
        gain.gain.setTargetAtTime(targetGain(), context.currentTime, 0.05);
    },

    setRpm(next) {
      rpm = next;
      if (source)
        source.playbackRate.setTargetAtTime(
          rpm / 33.333,
          context.currentTime,
          0.4,
        );
    },

    dispose() {
      try {
        source?.stop();
      } catch {
        // Already stopped.
      }
      source = null;
      void context.close();
    },
  };
}
