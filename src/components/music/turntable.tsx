"use client";

import {
  Pause,
  Play,
  SkipBack,
  SkipForward,
  Volume1,
  Volume2,
  VolumeX,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { MusicSelection } from "@/content/music";
import { cn } from "@/lib/utils";
import {
  createSurfaceNoise,
  type Rpm,
  type SurfaceNoise,
} from "./surface-noise";
import { createTrackEngine, type TrackEngine } from "./track-engine";
import styles from "./turntable.module.css";

type PlayableTrack = MusicSelection & { audioSrc: string };

interface TurntableProps {
  /** Selections that carry a local `audioSrc`. Empty → the deck plays surface noise. */
  tracks: ReadonlyArray<PlayableTrack>;
}

const BAR_COUNT = 12;
const IDLE_LEVEL = 0.06;

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const whole = Math.floor(seconds);
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}`;
}

/**
 * A working record deck. With no tracks it is an empty deck: dropping the
 * needle plays the surface noise of a blank record (synthesised, nothing is
 * fetched) and the meter shows it. With tracks it is a real player — same
 * platter, tonearm and meter, driven by an <audio> element.
 */
export function Turntable({ tracks }: TurntableProps) {
  const hasTracks = tracks.length > 0;

  const [playing, setPlaying] = useState(false);
  const [rpm, setRpm] = useState<Rpm>(33);
  const [volume, setVolume] = useState(0.5);
  const [index, setIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);

  const noiseRef = useRef<SurfaceNoise | null>(null);
  const engineRef = useRef<TrackEngine | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const barRefs = useRef<Array<HTMLSpanElement | null>>([]);
  const frameRef = useRef<number>(0);

  const track = hasTracks ? tracks[Math.min(index, tracks.length - 1)] : null;

  const analyser = useCallback((): AnalyserNode | null => {
    return hasTracks
      ? (engineRef.current?.analyser ?? null)
      : (noiseRef.current?.analyser ?? null);
  }, [hasTracks]);

  // Meter loop: reads the analyser and writes CSS custom properties directly,
  // so the 60fps update never touches React state.
  useEffect(() => {
    const node = analyser();
    const bars = barRefs.current;

    if (!playing || !node) {
      cancelAnimationFrame(frameRef.current);
      bars.forEach((bar) =>
        bar?.style.setProperty("--level", String(IDLE_LEVEL)),
      );
      return;
    }

    const data = new Uint8Array(node.frequencyBinCount);
    const tick = () => {
      node.getByteFrequencyData(data);
      for (let i = 0; i < BAR_COUNT; i++) {
        // One bin per bar, skipping DC. Surface noise is bass-heavy, so tilt
        // the upper bars up to keep the whole meter alive.
        const raw = (data[1 + i] ?? 0) / 255;
        const level = Math.min(1, Math.max(IDLE_LEVEL, raw * (1 + i * 0.1)));
        bars[i]?.style.setProperty("--level", level.toFixed(3));
      }
      frameRef.current = requestAnimationFrame(tick);
    };
    frameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameRef.current);
  }, [playing, analyser]);

  useEffect(() => {
    return () => {
      noiseRef.current?.dispose();
      engineRef.current?.dispose();
    };
  }, []);

  // ── Empty deck ───────────────────────────────────────────────────────
  const toggleNoise = async () => {
    noiseRef.current ??= createSurfaceNoise();
    const noise = noiseRef.current;
    if (playing) {
      noise.stop();
      setPlaying(false);
      return;
    }
    noise.setVolume(volume);
    noise.setRpm(rpm);
    await noise.start();
    setPlaying(true);
  };

  // ── Real tracks ──────────────────────────────────────────────────────
  const ensureEngine = async () => {
    const audio = audioRef.current;
    if (!audio) return null;
    engineRef.current ??= createTrackEngine(audio);
    engineRef.current.setVolume(volume);
    await engineRef.current.resume();
    return audio;
  };

  const toggleTrack = async () => {
    const audio = await ensureEngine();
    if (!audio) return;
    if (playing) {
      audio.pause();
      return;
    }
    audio.playbackRate = rpm / 33.333;
    try {
      await audio.play();
    } catch {
      setPlaying(false);
    }
  };

  const step = (delta: 1 | -1, resume = playing) => {
    if (!hasTracks) return;
    const next = (index + delta + tracks.length) % tracks.length;
    setIndex(next);
    setProgress(0);
    if (resume) {
      // Wait for the new src to be applied before playing.
      requestAnimationFrame(() => {
        const audio = audioRef.current;
        if (!audio) return;
        audio.currentTime = 0;
        void audio.play();
      });
    }
  };

  const syncTime = (audio: HTMLAudioElement) => {
    const total = Number.isFinite(audio.duration) ? audio.duration : 0;
    setDuration(total);
    setProgress(total ? audio.currentTime / total : 0);
  };

  const onSeek = (value: number) => {
    const audio = audioRef.current;
    if (!audio || !duration) return;
    audio.currentTime = value * duration;
    setProgress(value);
  };

  // Keep engine parameters in sync with the sliders.
  useEffect(() => {
    noiseRef.current?.setVolume(volume);
    engineRef.current?.setVolume(volume);
  }, [volume]);

  useEffect(() => {
    noiseRef.current?.setRpm(rpm);
    if (audioRef.current) audioRef.current.playbackRate = rpm / 33.333;
  }, [rpm]);

  const toggle = hasTracks ? toggleTrack : toggleNoise;

  const status = useMemo(() => {
    if (hasTracks) return playing ? "Now playing" : "Record loaded";
    return playing ? "Empty deck · surface noise" : "Empty deck";
  }, [hasTracks, playing]);

  const VolumeIcon = volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2;

  return (
    <section
      aria-label="Record deck"
      data-playing={playing}
      className={cn(styles.deck, "p-5 sm:p-8")}
      style={{ ["--rev" as string]: `${(60 / rpm).toFixed(3)}s` }}
    >
      <div className="relative grid gap-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:items-center">
        {/* Platter */}
        <div className={styles.stage} aria-hidden="true">
          <div className={styles.mat} />
          <div className={styles.record}>
            <div className={styles.label}>
              {track ? (
                <>
                  <p className="line-clamp-2 px-3 font-display text-[13px] font-semibold leading-tight tracking-tight sm:text-sm">
                    {track.title}
                  </p>
                  <p className="px-3 font-mono text-[9px] uppercase tracking-[0.2em] opacity-80 sm:text-[10px]">
                    {track.artist}
                  </p>
                </>
              ) : (
                <>
                  <p className="font-mono text-[9px] uppercase leading-relaxed tracking-[0.2em] sm:text-[10px]">
                    No record
                    <br />
                    loaded
                  </p>
                  <p className="font-mono text-[9px] uppercase tracking-[0.2em] opacity-70 sm:text-[10px]">
                    side —
                  </p>
                </>
              )}
            </div>
          </div>
          <div className={styles.spindle} />
          {/* Tonearm: pivot top-right, swings in over the grooves when playing. */}
          <svg className={styles.arm} viewBox="0 0 100 100" aria-hidden="true">
            <g className={styles.armPivot}>
              <line
                x1="88"
                y1="12"
                x2="92"
                y2="62"
                className={styles.armTube}
              />
              <line
                x1="88"
                y1="12"
                x2="92"
                y2="62"
                className={styles.armTubeHighlight}
              />
              <g transform="translate(92 62) rotate(-4)">
                <rect
                  x="-2.6"
                  y="-1"
                  width="5.2"
                  height="9"
                  rx="0.8"
                  className={styles.headshell}
                />
                <rect
                  x="-0.5"
                  y="8"
                  width="1"
                  height="2.5"
                  className={styles.stylus}
                />
              </g>
              <circle cx="88" cy="12" r="6.5" className={styles.pivotBase} />
              <circle cx="88" cy="12" r="3.2" className={styles.pivotCap} />
            </g>
          </svg>
        </div>

        {/* Controls */}
        <div className="flex flex-col gap-6">
          <div className="flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            <span className={styles.strobe} aria-hidden="true" />
            <span aria-live="polite">{status}</span>
            <span aria-hidden="true">·</span>
            <span>{rpm === 33 ? "33⅓" : "45"} rpm</span>
          </div>

          <div>
            {track ? (
              <>
                <h2 className="font-display text-[28px] font-semibold leading-tight tracking-tight text-foreground">
                  {track.title}
                </h2>
                <p className="mt-1 text-base text-muted-foreground">
                  {track.artist}
                </p>
                {track.note ? (
                  <p className="mt-3 max-w-prose text-[15px] leading-relaxed text-foreground/85">
                    {track.note}
                  </p>
                ) : null}
              </>
            ) : (
              <>
                <h2 className="font-display text-[28px] font-semibold leading-tight tracking-tight text-foreground">
                  Nothing pressed yet.
                </h2>
                <p className="mt-2 max-w-prose text-[15px] leading-relaxed text-muted-foreground">
                  Drop the needle anyway. The deck plays the sound of a blank
                  record — synthesised on the spot, nothing is fetched.
                </p>
              </>
            )}
          </div>

          <div className={styles.meter} aria-hidden="true">
            {Array.from({ length: BAR_COUNT }, (_, i) => (
              <span
                key={i}
                ref={(el) => {
                  barRefs.current[i] = el;
                }}
                className={styles.bar}
                style={{ ["--level" as string]: IDLE_LEVEL }}
              />
            ))}
          </div>

          {/* Transport */}
          <div className="flex items-center gap-3">
            {hasTracks && tracks.length > 1 ? (
              <button
                type="button"
                onClick={() => step(-1)}
                aria-label="Previous record"
                className="grid h-11 w-11 place-items-center rounded-full border border-border bg-surface text-foreground transition hover:-translate-y-0.5 hover:border-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:hover:translate-y-0"
              >
                <SkipBack className="h-4 w-4" aria-hidden="true" />
              </button>
            ) : null}

            <button
              type="button"
              onClick={() => void toggle()}
              aria-pressed={playing}
              className="inline-flex h-12 items-center gap-2.5 rounded-full bg-foreground px-5 font-medium text-background shadow-[0_10px_24px_-12px_rgba(0,0,0,0.6)] transition hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:hover:translate-y-0"
            >
              {playing ? (
                <Pause className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Play className="h-4 w-4" aria-hidden="true" />
              )}
              {playing ? "Lift the needle" : "Drop the needle"}
            </button>

            {hasTracks && tracks.length > 1 ? (
              <button
                type="button"
                onClick={() => step(1)}
                aria-label="Next record"
                className="grid h-11 w-11 place-items-center rounded-full border border-border bg-surface text-foreground transition hover:-translate-y-0.5 hover:border-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:hover:translate-y-0"
              >
                <SkipForward className="h-4 w-4" aria-hidden="true" />
              </button>
            ) : null}
          </div>

          {/* Progress (real tracks only — an empty record has no runtime) */}
          {hasTracks ? (
            <label className="flex flex-col gap-2">
              <span className="flex justify-between font-mono text-[11px] tabular-nums text-muted-foreground">
                <span>{formatTime(progress * duration)}</span>
                <span className="sr-only">Position</span>
                <span>{formatTime(duration)}</span>
              </span>
              <input
                type="range"
                min={0}
                max={1000}
                value={Math.round(progress * 1000)}
                onChange={(event) => onSeek(Number(event.target.value) / 1000)}
                className={styles.range}
                style={{ ["--fill" as string]: `${progress * 100}%` }}
                aria-label="Position"
              />
            </label>
          ) : null}

          <div className="grid gap-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
            <label className="flex items-center gap-3">
              <VolumeIcon
                className="h-4 w-4 shrink-0 text-muted-foreground"
                aria-hidden="true"
              />
              <input
                type="range"
                min={0}
                max={100}
                value={Math.round(volume * 100)}
                onChange={(event) =>
                  setVolume(Number(event.target.value) / 100)
                }
                className={styles.range}
                style={{ ["--fill" as string]: `${volume * 100}%` }}
                aria-label="Volume"
              />
            </label>

            <div
              role="radiogroup"
              aria-label="Platter speed"
              className="inline-flex justify-self-start rounded-[10px] border border-border bg-surface p-1 font-mono text-xs"
            >
              {([33, 45] as const).map((speed) => (
                <button
                  key={speed}
                  type="button"
                  role="radio"
                  aria-checked={rpm === speed}
                  onClick={() => setRpm(speed)}
                  className={cn(
                    "rounded-[7px] px-3 py-1.5 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                    rpm === speed
                      ? "bg-accent-soft text-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {speed === 33 ? "33⅓" : "45"}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {track ? (
        <audio
          ref={audioRef}
          src={track.audioSrc}
          preload="metadata"
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onEnded={() => {
            // `pause` has already fired by now, so pass resume explicitly.
            if (tracks.length > 1) step(1, true);
            else setPlaying(false);
          }}
          onLoadedMetadata={(event) => syncTime(event.currentTarget)}
          onDurationChange={(event) => syncTime(event.currentTarget)}
          onTimeUpdate={(event) => syncTime(event.currentTarget)}
        />
      ) : null}
    </section>
  );
}
