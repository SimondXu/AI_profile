/**
 * Web Audio wrapper around an `<audio>` element so real tracks drive the
 * same analyser/meter as the empty-deck surface noise. Built lazily on the
 * first user gesture; a media element can only be attached to one context,
 * so this is created once per element and disposed with the component.
 */

export interface TrackEngine {
  readonly analyser: AnalyserNode;
  resume(): Promise<void>;
  /** 0–1, perceptual curve applied internally. */
  setVolume(value: number): void;
  dispose(): void;
}

export function createTrackEngine(audio: HTMLAudioElement): TrackEngine {
  const context = new AudioContext();
  const source = context.createMediaElementSource(audio);
  const gain = context.createGain();
  const analyser = context.createAnalyser();
  analyser.fftSize = 64;
  analyser.smoothingTimeConstant = 0.78;

  // Meter taps pre-fader, matching the empty-deck engine.
  source.connect(analyser);
  analyser.connect(gain);
  gain.connect(context.destination);

  return {
    analyser,
    async resume() {
      if (context.state === "suspended") await context.resume();
    },
    setVolume(value) {
      const v = Math.min(1, Math.max(0, value));
      gain.gain.setTargetAtTime(v * v, context.currentTime, 0.05);
    },
    dispose() {
      source.disconnect();
      void context.close();
    },
  };
}
