"use client";

import {
  ExternalLink,
  Pause,
  Play,
  Repeat,
  Repeat1,
  Shuffle,
  SkipBack,
  SkipForward,
  Volume1,
  Volume2,
  VolumeX,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { isPlayable, type MusicSelection } from "@/content/music";
import { cn } from "@/lib/utils";
import { Crate } from "./crate";
import { sleeveArt } from "./sleeve-art";
import {
  createSurfaceNoise,
  type Rpm,
  type SurfaceNoise,
} from "./surface-noise";
import { createTrackEngine, type TrackEngine } from "./track-engine";
import {
  createYouTubeEngine,
  type DeckError,
  type YouTubeEngine,
} from "./youtube-engine";
import styles from "./turntable.module.css";

interface TurntableProps {
  crateName: string;
  crateCreatedAt: string;
  records: ReadonlyArray<MusicSelection>;
  /** Record to cue on load (from `?track=`); ignored if unknown or unplayable. */
  initialId?: string;
}

type RepeatMode = "off" | "all" | "one";

const BAR_COUNT = 12;
const IDLE_LEVEL = 0.06;
const SKIP_AFTER_ERROR_S = 5;

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const whole = Math.floor(seconds);
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}`;
}

function shuffled<T>(items: T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function isTextInput(element: Element | null): boolean {
  if (!element) return false;
  const tag = element.tagName;
  return (
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    tag === "SELECT" ||
    (element as HTMLElement).isContentEditable
  );
}

function errorCopy(error: DeckError): { title: string; body: string } {
  switch (error.code) {
    case "blocked":
      return {
        title: "YouTube didn't load.",
        body: "Playback here runs through YouTube, which may be blocked on your network or in your region (mainland China, for example). Nothing on this page is broken — the source just can't be reached from your IP.",
      };
    case "not-embeddable":
      return {
        title: "This record won't play here.",
        body: "The owner of this source doesn't allow it to be embedded, or it isn't available from your IP / region. You can open it on YouTube directly.",
      };
    case "unavailable":
      return {
        title: "This record is gone from the source.",
        body: "The video was removed or made private. The crate still lists it; the deck just can't play it.",
      };
    default:
      return {
        title: "The source hiccuped.",
        body: `YouTube's player reported an error${error.raw ? ` (${error.raw})` : ""}. Try again, or skip to the next record.`,
      };
  }
}

/**
 * The deck. Three engines behind one set of controls:
 *  - empty: no playable records → dropping the needle plays synthesised
 *    surface noise (nothing is fetched) and the meter reads it;
 *  - file: a local /audio/ file through <audio> + Web Audio (meter on);
 *  - youtube: the IFrame Player API in a visible frame (no audio data, so
 *    the meter is hidden rather than faked; 45 rpm is disabled).
 * Errors from the source are shown in words, with the reason, never hidden.
 */
export function Turntable({
  crateName,
  crateCreatedAt,
  records,
  initialId,
}: TurntableProps) {
  const playable = useMemo(() => records.filter(isPlayable), [records]);
  const byId = useMemo(
    () => new Map(playable.map((r) => [r.id, r])),
    [playable],
  );
  const hasRecords = playable.length > 0;

  const [currentId, setCurrentId] = useState<string | null>(() =>
    initialId && byId.has(initialId) ? initialId : (playable[0]?.id ?? null),
  );
  const [order, setOrder] = useState<string[]>(() => playable.map((r) => r.id));
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState<RepeatMode>("off");
  const [playing, setPlaying] = useState(false);
  const [buffering, setBuffering] = useState(false);
  const [rpm, setRpm] = useState<Rpm>(33);
  const [volume, setVolume] = useState(0.5);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState<DeckError | null>(null);
  const [skipIn, setSkipIn] = useState<number | null>(null);
  const [engineReady, setEngineReady] = useState(false);

  const current = currentId ? (byId.get(currentId) ?? null) : null;
  const mode: "empty" | "file" | "youtube" = !current
    ? "empty"
    : current.source.kind;

  const noiseRef = useRef<SurfaceNoise | null>(null);
  const fileRef = useRef<TrackEngine | null>(null);
  const ytRef = useRef<YouTubeEngine | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const frameRef = useRef<HTMLDivElement | null>(null);
  const barRefs = useRef<Array<HTMLSpanElement | null>>([]);
  const rafRef = useRef(0);
  /** Whether the next record change should start playing right away. */
  const chainRef = useRef(false);
  // Latest-callback refs so engine events and key handlers never go stale.
  const togglePlayRef = useRef<() => Promise<void>>(async () => {});
  const onEndedRef = useRef<() => void>(() => {});

  // ── Ordering ─────────────────────────────────────────────────────────
  const neighbour = useCallback(
    (delta: 1 | -1): string | null => {
      if (!currentId || order.length === 0) return null;
      const index = order.indexOf(currentId);
      const next = index + delta;
      if (next < 0 || next >= order.length) {
        return repeat === "all"
          ? order[(next + order.length) % order.length]
          : null;
      }
      return order[next];
    },
    [currentId, order, repeat],
  );

  const toggleShuffle = useCallback(() => {
    setShuffle((on) => {
      const next = !on;
      const ids = playable.map((r) => r.id);
      if (next && currentId) {
        // The current record stays first so "next" is a fresh draw.
        setOrder([
          currentId,
          ...shuffled(ids.filter((id) => id !== currentId)),
        ]);
      } else {
        setOrder(ids);
      }
      return next;
    });
  }, [currentId, playable]);

  const cycleRepeat = () =>
    setRepeat((r) => (r === "off" ? "all" : r === "all" ? "one" : "off"));

  // ── Engines ──────────────────────────────────────────────────────────
  const analyser = useCallback((): AnalyserNode | null => {
    if (mode === "file") return fileRef.current?.analyser ?? null;
    if (mode === "empty") return noiseRef.current?.analyser ?? null;
    return null;
  }, [mode]);

  const ensureYouTube = useCallback((): YouTubeEngine | null => {
    if (ytRef.current) return ytRef.current;
    if (!frameRef.current) return null;
    setEngineReady(false);
    const engine = createYouTubeEngine(frameRef.current, {
      onReady: () => setEngineReady(true),
      onPlaying: () => {
        setPlaying(true);
        setBuffering(false);
        setError(null);
      },
      onPaused: () => {
        setPlaying(false);
        setBuffering(false);
      },
      onBuffering: () => setBuffering(true),
      onEnded: () => {
        setPlaying(false);
        onEndedRef.current();
      },
      onError: (deckError) => {
        setPlaying(false);
        setBuffering(false);
        setError(deckError);
        if (deckError.code !== "blocked" && chainRef.current)
          setSkipIn(SKIP_AFTER_ERROR_S);
      },
    });
    ytRef.current = engine;
    return engine;
  }, []);

  // Load the current record into its engine whenever it changes.
  useEffect(() => {
    if (!current) return;
    const autoplay = chainRef.current;
    setProgress(0);
    setDuration(0);
    setError(null);
    setSkipIn(null);

    if (current.source.kind === "youtube") {
      audioRef.current?.pause();
      // The YouTube script is only injected once someone drops the needle;
      // a cued record on page load stays a static sleeve until then.
      const engine = ytRef.current ?? (autoplay ? ensureYouTube() : null);
      engine?.setVolume(volume);
      engine?.load(current.source.videoId, autoplay);
      if (!autoplay) setPlaying(false);
    } else {
      ytRef.current?.pause();
      if (autoplay) {
        requestAnimationFrame(() => {
          const audio = audioRef.current;
          if (!audio) return;
          audio.currentTime = 0;
          void audio.play();
        });
      } else {
        setPlaying(false);
      }
    }
    // volume is applied through its own effect; only the record matters here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current, ensureYouTube]);

  // Keep the URL shareable without a navigation.
  useEffect(() => {
    if (!currentId) return;
    const url = new URL(window.location.href);
    url.searchParams.set("track", currentId);
    window.history.replaceState(window.history.state, "", url);
  }, [currentId]);

  const select = useCallback(
    (id: string, autoplay: boolean) => {
      if (!byId.has(id)) return;
      if (id === currentId) {
        if (autoplay) void togglePlayRef.current();
        return;
      }
      // chainRef is read by the load effect after the state update lands.
      chainRef.current = autoplay;
      setCurrentId(id);
    },
    [byId, currentId],
  );

  const step = useCallback(
    (delta: 1 | -1, autoplay: boolean) => {
      const id = neighbour(delta);
      if (!id) {
        setPlaying(false);
        return;
      }
      select(id, autoplay);
    },
    [neighbour, select],
  );

  onEndedRef.current = () => {
    if (repeat === "one") {
      if (mode === "youtube") {
        ytRef.current?.seek(0);
        ytRef.current?.play();
      } else if (audioRef.current) {
        audioRef.current.currentTime = 0;
        void audioRef.current.play();
      }
      return;
    }
    // A source error mid-chain also lands here via the countdown.
    step(1, true);
  };

  // Countdown after a source error, then skip (only when we were chaining).
  useEffect(() => {
    if (skipIn === null) return;
    if (skipIn <= 0) {
      setSkipIn(null);
      step(1, true);
      return;
    }
    const timer = window.setTimeout(
      () => setSkipIn((s) => (s === null ? null : s - 1)),
      1000,
    );
    return () => window.clearTimeout(timer);
  }, [skipIn, step]);

  // ── Transport ────────────────────────────────────────────────────────
  const togglePlay = async () => {
    if (mode === "empty") {
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
      return;
    }

    if (mode === "youtube" && current?.source.kind === "youtube") {
      if (error?.code === "blocked") {
        // Retry from scratch: the script may load this time.
        ytRef.current?.dispose();
        ytRef.current = null;
        setError(null);
        const engine = ensureYouTube();
        engine?.setVolume(volume);
        engine?.load(current.source.videoId, true);
        return;
      }
      const engine = ensureYouTube();
      if (!engine) return;
      if (playing) {
        engine.pause();
      } else {
        setError(null);
        setSkipIn(null);
        if (!engineReady) {
          // First interaction: the player is still loading; queue autoplay.
          engine.load(current.source.videoId, true);
          setBuffering(true);
        } else {
          engine.play();
        }
      }
      return;
    }

    const audio = audioRef.current;
    if (!audio) return;
    fileRef.current ??= createTrackEngine(audio);
    fileRef.current.setVolume(volume);
    await fileRef.current.resume();
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
  togglePlayRef.current = togglePlay;

  const onSeek = (value: number) => {
    if (!duration) return;
    if (mode === "youtube") ytRef.current?.seek(value * duration);
    else if (audioRef.current) audioRef.current.currentTime = value * duration;
    setProgress(value);
  };

  // ── Meter / progress loops ───────────────────────────────────────────
  useEffect(() => {
    const node = analyser();
    const bars = barRefs.current;
    if (!playing || !node) {
      cancelAnimationFrame(rafRef.current);
      bars.forEach((bar) =>
        bar?.style.setProperty("--level", String(IDLE_LEVEL)),
      );
      return;
    }
    const data = new Uint8Array(node.frequencyBinCount);
    const tick = () => {
      node.getByteFrequencyData(data);
      for (let i = 0; i < BAR_COUNT; i++) {
        const raw = (data[1 + i] ?? 0) / 255;
        const level = Math.min(1, Math.max(IDLE_LEVEL, raw * (1 + i * 0.1)));
        bars[i]?.style.setProperty("--level", level.toFixed(3));
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [playing, analyser]);

  useEffect(() => {
    if (mode !== "youtube") return;
    const poll = () => {
      const engine = ytRef.current;
      if (!engine) return;
      const total = engine.duration();
      setDuration(total);
      setProgress(total ? engine.currentTime() / total : 0);
    };
    poll();
    if (!playing) return;
    const timer = window.setInterval(poll, 250);
    return () => window.clearInterval(timer);
  }, [mode, playing, currentId, engineReady]);

  const syncTime = (audio: HTMLAudioElement) => {
    const total = Number.isFinite(audio.duration) ? audio.duration : 0;
    setDuration(total);
    setProgress(total ? audio.currentTime / total : 0);
  };

  // ── Parameter sync ───────────────────────────────────────────────────
  useEffect(() => {
    noiseRef.current?.setVolume(volume);
    fileRef.current?.setVolume(volume);
    ytRef.current?.setVolume(volume);
  }, [volume]);

  useEffect(() => {
    noiseRef.current?.setRpm(rpm);
    if (audioRef.current) audioRef.current.playbackRate = rpm / 33.333;
  }, [rpm]);

  useEffect(() => {
    if (mode === "youtube" && rpm !== 33) setRpm(33);
  }, [mode, rpm]);

  // The frame unmounts outside youtube mode; the player must go with it.
  useEffect(() => {
    if (mode === "youtube" || !ytRef.current) return;
    ytRef.current.dispose();
    ytRef.current = null;
    setEngineReady(false);
  }, [mode]);

  useEffect(() => {
    return () => {
      noiseRef.current?.dispose();
      fileRef.current?.dispose();
      ytRef.current?.dispose();
    };
  }, []);

  // ── Keyboard: space play/pause · n/p next/prev · s shuffle ───────────
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (isTextInput(document.activeElement)) return;
      if (document.querySelector("dialog[open]")) return;
      const key = event.key.toLowerCase();
      if (key === " ") {
        event.preventDefault();
        void togglePlayRef.current();
      } else if (key === "n" && hasRecords) {
        event.preventDefault();
        step(1, playing);
      } else if (key === "p" && hasRecords) {
        event.preventDefault();
        step(-1, playing);
      } else if (key === "s" && hasRecords) {
        event.preventDefault();
        toggleShuffle();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [hasRecords, playing, step, toggleShuffle]);

  // ── Render ───────────────────────────────────────────────────────────
  const status = (() => {
    if (error) return "Source error";
    if (mode === "empty")
      return playing ? "Empty deck · surface noise" : "Empty deck";
    if (buffering) return "Buffering";
    return playing ? "Now playing" : "Cued";
  })();

  const VolumeIcon = volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2;
  const RepeatIcon = repeat === "one" ? Repeat1 : Repeat;
  const youtubeUrl =
    current?.source.kind === "youtube"
      ? `https://www.youtube.com/watch?v=${current.source.videoId}`
      : null;
  const showMeter = mode !== "youtube";
  const canStep = playable.length > 1;
  const copy = error ? errorCopy(error) : null;

  return (
    <div className="flex flex-col gap-16">
      <section
        aria-label="Record deck"
        data-playing={playing}
        className={cn(styles.deck, "p-5 sm:p-8")}
        style={{ ["--rev" as string]: `${(60 / rpm).toFixed(3)}s` }}
      >
        <div className="relative grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:items-center">
          {/* Platter */}
          <div className={styles.stage} aria-hidden="true">
            <div className={styles.mat} />
            <div className={styles.record}>
              <div
                className={styles.label}
                style={current ? sleeveArt(current.id) : undefined}
              >
                <div className={styles.labelInk}>
                  {current ? (
                    <>
                      <p className="line-clamp-2 px-3 font-display text-[13px] font-semibold leading-tight tracking-tight sm:text-sm">
                        {current.title}
                      </p>
                      <p className="line-clamp-1 px-3 font-mono text-[9px] uppercase tracking-[0.2em] opacity-80 sm:text-[10px]">
                        {current.artist}
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
            </div>
            <div className={styles.spindle} />
            <svg
              className={styles.arm}
              viewBox="0 0 100 100"
              aria-hidden="true"
            >
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
          <div className="flex min-w-0 flex-col gap-5">
            <div className="flex flex-wrap items-center gap-3 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              <span className={styles.strobe} aria-hidden="true" />
              <span aria-live="polite">{status}</span>
              <span aria-hidden="true">·</span>
              <span>{rpm === 33 ? "33⅓" : "45"} rpm</span>
              {mode === "youtube" ? (
                <>
                  <span aria-hidden="true">·</span>
                  <span>via YouTube</span>
                </>
              ) : null}
            </div>

            {/* The visible YouTube frame doubles as the record sleeve. */}
            {mode === "youtube" ? (
              <div className={styles.sleeveFrame}>
                <div ref={frameRef} className={styles.video} />
                {copy && error ? (
                  <div className={styles.errorCard} role="alert">
                    <p className="font-display text-base font-semibold leading-tight text-foreground">
                      {copy.title}
                    </p>
                    <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
                      {copy.body}
                    </p>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      {youtubeUrl && error.code !== "blocked" ? (
                        <a
                          href={youtubeUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={styles.pillButton}
                        >
                          Open on YouTube{" "}
                          <ExternalLink
                            className="h-3.5 w-3.5"
                            aria-hidden="true"
                          />
                        </a>
                      ) : null}
                      {error.code === "blocked" ? (
                        <button
                          type="button"
                          onClick={() => void togglePlay()}
                          className={styles.pillButton}
                        >
                          Try again
                        </button>
                      ) : canStep ? (
                        <button
                          type="button"
                          onClick={() => step(1, true)}
                          className={styles.pillButton}
                        >
                          Next record{skipIn !== null ? ` · ${skipIn}s` : ""}
                        </button>
                      ) : null}
                    </div>
                  </div>
                ) : !engineReady ? (
                  <div className={styles.frameHint} aria-hidden="true">
                    <span className="font-mono text-[11px] uppercase tracking-[0.18em]">
                      {playing || buffering
                        ? "Loading YouTube…"
                        : "Drop the needle to load the player"}
                    </span>
                  </div>
                ) : null}
              </div>
            ) : null}

            <div>
              {current ? (
                <>
                  <h2 className="font-display text-[26px] font-semibold leading-tight tracking-tight text-foreground">
                    {current.title}
                  </h2>
                  <p className="mt-1 text-base text-muted-foreground">
                    {current.artist}
                    {current.album ? (
                      <span className="opacity-70"> · {current.album}</span>
                    ) : null}
                  </p>
                  {current.note ? (
                    <p className="mt-3 max-w-prose text-[15px] leading-relaxed text-foreground/85">
                      {current.note}
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

            {showMeter ? (
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
            ) : null}

            {/* Transport */}
            <div className="flex flex-wrap items-center gap-3">
              {canStep ? (
                <button
                  type="button"
                  onClick={() => step(-1, playing)}
                  aria-label="Previous record"
                  className={styles.roundButton}
                >
                  <SkipBack className="h-4 w-4" aria-hidden="true" />
                </button>
              ) : null}

              <button
                type="button"
                onClick={() => void togglePlay()}
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

              {canStep ? (
                <>
                  <button
                    type="button"
                    onClick={() => step(1, playing)}
                    aria-label="Next record"
                    className={styles.roundButton}
                  >
                    <SkipForward className="h-4 w-4" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={toggleShuffle}
                    aria-pressed={shuffle}
                    aria-label="Shuffle the crate"
                    className={cn(
                      styles.roundButton,
                      shuffle && styles.roundButtonOn,
                    )}
                  >
                    <Shuffle className="h-4 w-4" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={cycleRepeat}
                    aria-pressed={repeat !== "off"}
                    aria-label={
                      repeat === "off"
                        ? "Repeat: off"
                        : repeat === "all"
                          ? "Repeat: whole crate"
                          : "Repeat: this record"
                    }
                    className={cn(
                      styles.roundButton,
                      repeat !== "off" && styles.roundButtonOn,
                    )}
                  >
                    <RepeatIcon className="h-4 w-4" aria-hidden="true" />
                  </button>
                </>
              ) : null}
            </div>

            {hasRecords ? (
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
                  disabled={!duration}
                  onChange={(event) =>
                    onSeek(Number(event.target.value) / 1000)
                  }
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
                {([33, 45] as const).map((speed) => {
                  const disabled = speed === 45 && mode === "youtube";
                  return (
                    <button
                      key={speed}
                      type="button"
                      role="radio"
                      aria-checked={rpm === speed}
                      disabled={disabled}
                      title={
                        disabled
                          ? "YouTube playback can't run at 45"
                          : undefined
                      }
                      onClick={() => setRpm(speed)}
                      className={cn(
                        "rounded-[7px] px-3 py-1.5 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-40",
                        rpm === speed
                          ? "bg-accent-soft text-foreground"
                          : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {speed === 33 ? "33⅓" : "45"}
                    </button>
                  );
                })}
              </div>
            </div>

            {hasRecords ? (
              <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                keys · space play · n next · p prev · s shuffle
              </p>
            ) : null}
          </div>
        </div>

        {current?.source.kind === "file" ? (
          <audio
            ref={audioRef}
            src={current.source.src}
            preload="metadata"
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
            onEnded={() => onEndedRef.current()}
            onLoadedMetadata={(event) => syncTime(event.currentTarget)}
            onDurationChange={(event) => syncTime(event.currentTarget)}
            onTimeUpdate={(event) => syncTime(event.currentTarget)}
          />
        ) : null}
      </section>

      {records.length > 0 ? (
        <Crate
          name={crateName}
          createdAt={crateCreatedAt}
          records={records}
          currentId={currentId}
          playing={playing}
          onSelect={(id) => select(id, true)}
        />
      ) : null}
    </div>
  );
}
