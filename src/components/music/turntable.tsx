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
import {
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { isPlayable, type MusicSelection } from "@/content/music";
import { cn } from "@/lib/utils";
import { Crate } from "./crate";
import { playNeedle } from "./needle-sound";
import { sleeveGlow } from "./sleeve-art";
import { SleeveImage } from "./sleeve-image";
import {
  createSurfaceNoise,
  type Rpm,
  type SurfaceNoise,
} from "./surface-noise";
import { createTrackEngine, type TrackEngine } from "./track-engine";
import { useBeat } from "./use-beat";
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
/** Tonearm choreography. `idle` means the arm follows `playing`. */
type Phase = "idle" | "lifting" | "swapping" | "dropping";
type Swap = "out" | "in" | null;

const BAR_COUNT = 12;
const IDLE_LEVEL = 0.06;
const SKIP_AFTER_ERROR_S = 5;
/** Arm angle over the outer groove and the run-out groove, degrees. */
const ARM_OUTER = 14;
const ARM_INNER = 24;
/** Choreography timings, ms (collapsed to 0 under reduced motion). */
const T_LIFT = 420;
const T_OUT = 220;
const T_IN = 320;
const T_DROP = 520;
const SFX_KEY = "deck-sfx";

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

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
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
 *  - youtube: the IFrame Player API in a visible monitor (no audio data, so
 *    the meter is hidden rather than faked; 45 rpm is disabled).
 *
 * The tonearm is the progress control: it tracks inward as the record plays
 * and can be dragged to seek. Changing records is a choreographed sequence
 * (lift → swap → drop) rather than a re-render. Errors from the source are
 * shown in words, with the reason, in place of the player — never over it.
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
  const [phase, setPhase] = useState<Phase>("idle");
  const [swap, setSwap] = useState<Swap>(null);
  const [rpm, setRpm] = useState<Rpm>(33);
  const [volume, setVolume] = useState(0.5);
  const [progress, setProgress] = useState(0);
  const [dragProgress, setDragProgress] = useState<number | null>(null);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState<DeckError | null>(null);
  const [skipIn, setSkipIn] = useState<number | null>(null);
  const [engineCreated, setEngineCreated] = useState(false);
  const [engineReady, setEngineReady] = useState(false);
  const [sfx, setSfx] = useState(true);

  const current = currentId ? (byId.get(currentId) ?? null) : null;
  const mode: "empty" | "file" | "youtube" = !current
    ? "empty"
    : current.source.kind;
  const deckRef = useRef<HTMLElement | null>(null);
  const syncBeat = useBeat(deckRef, current?.bpm, playing);

  const noiseRef = useRef<SurfaceNoise | null>(null);
  const fileRef = useRef<TrackEngine | null>(null);
  const ytRef = useRef<YouTubeEngine | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const frameRef = useRef<HTMLDivElement | null>(null);
  const recordRef = useRef<HTMLDivElement | null>(null);
  const armSvgRef = useRef<SVGSVGElement | null>(null);
  const barRefs = useRef<Array<HTMLSpanElement | null>>([]);
  const rafRef = useRef(0);
  const meterRaf = useRef(0);
  const timersRef = useRef<number[]>([]);
  /** Whether the next record change should start playing right away. */
  const chainRef = useRef(false);
  // Latest-callback refs so engine events and key handlers never go stale.
  const togglePlayRef = useRef<() => Promise<void>>(async () => {});
  const onEndedRef = useRef<() => void>(() => {});
  const sfxRef = useRef(true);
  const volumeRef = useRef(0.5);
  sfxRef.current = sfx;
  volumeRef.current = volume;

  // ── UI sound preference ──────────────────────────────────────────────
  useEffect(() => {
    try {
      if (window.localStorage.getItem(SFX_KEY) === "off") setSfx(false);
    } catch {
      // Storage may be unavailable; default stays on.
    }
  }, []);

  const toggleSfx = () => {
    setSfx((on) => {
      try {
        window.localStorage.setItem(SFX_KEY, on ? "off" : "on");
      } catch {
        // Ignore.
      }
      return !on;
    });
  };

  const cue = useCallback((kind: "drop" | "lift") => {
    if (sfxRef.current) playNeedle(kind, volumeRef.current);
  }, []);

  // ── Timers ───────────────────────────────────────────────────────────
  const clearTimers = () => {
    timersRef.current.forEach((id) => window.clearTimeout(id));
    timersRef.current = [];
  };
  const after = (ms: number, fn: () => void) => {
    if (ms <= 0) {
      fn();
      return;
    }
    timersRef.current.push(window.setTimeout(fn, ms));
  };

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
    setEngineCreated(true);
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

  const pauseEngines = () => {
    ytRef.current?.pause();
    audioRef.current?.pause();
    if (mode === "empty" && noiseRef.current) {
      noiseRef.current.stop();
      setPlaying(false);
    }
  };

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
      engine?.setVolume(volumeRef.current);
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
  }, [current, ensureYouTube]);

  // Keep the URL shareable without a navigation.
  useEffect(() => {
    if (!currentId) return;
    const url = new URL(window.location.href);
    url.searchParams.set("track", currentId);
    window.history.replaceState(window.history.state, "", url);
  }, [currentId]);

  // ── Choreography ─────────────────────────────────────────────────────
  /**
   * lift (if the needle is down) → slide the old record out → new record in
   * → drop (if we should play). Engine loading starts at the swap so YouTube
   * buffers while the arm comes down.
   */
  const select = useCallback(
    (id: string, autoplay: boolean) => {
      if (!byId.has(id)) return;
      if (id === currentId) {
        if (autoplay) void togglePlayRef.current();
        return;
      }
      clearTimers();
      const reduced = prefersReducedMotion();
      const needleDown = playing || phase === "dropping";
      const lift = needleDown ? (reduced ? 0 : T_LIFT) : 0;
      const out = reduced ? 0 : T_OUT;
      const inn = reduced ? 0 : T_IN;
      const drop = reduced ? 0 : T_DROP;

      if (needleDown) {
        cue("lift");
        setPhase("lifting");
        pauseEngines();
      }
      after(lift, () => {
        setSwap("out");
        setPhase("swapping");
        after(out, () => {
          chainRef.current = autoplay;
          setCurrentId(id);
          setSwap("in");
          after(inn, () => {
            setSwap(null);
            if (autoplay) {
              cue("drop");
              setPhase("dropping");
              after(drop, () => setPhase("idle"));
            } else {
              setPhase("idle");
            }
          });
        });
      });
    },
    // pauseEngines / after / clearTimers only touch refs and `mode`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [byId, currentId, playing, phase, cue],
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
  const startEngine = async () => {
    if (mode === "empty") {
      noiseRef.current ??= createSurfaceNoise();
      noiseRef.current.setVolume(volume);
      noiseRef.current.setRpm(rpm);
      await noiseRef.current.start();
      setPlaying(true);
      return;
    }
    if (mode === "youtube" && current?.source.kind === "youtube") {
      if (error?.code === "blocked") {
        ytRef.current?.dispose();
        ytRef.current = null;
        setEngineCreated(false);
        setError(null);
        const engine = ensureYouTube();
        engine?.setVolume(volume);
        engine?.load(current.source.videoId, true);
        return;
      }
      const engine = ensureYouTube();
      if (!engine) return;
      setError(null);
      setSkipIn(null);
      if (!engineReady) {
        engine.load(current.source.videoId, true);
        setBuffering(true);
      } else {
        engine.play();
      }
      return;
    }
    const audio = audioRef.current;
    if (!audio) return;
    fileRef.current ??= createTrackEngine(audio);
    fileRef.current.setVolume(volume);
    await fileRef.current.resume();
    audio.playbackRate = rpm / 33.333;
    try {
      await audio.play();
    } catch {
      setPlaying(false);
    }
  };

  const togglePlay = async () => {
    clearTimers();
    const reduced = prefersReducedMotion();
    if (playing || phase === "dropping") {
      cue("lift");
      setPhase("lifting");
      pauseEngines();
      after(reduced ? 0 : T_LIFT, () => setPhase("idle"));
      return;
    }
    cue("drop");
    setPhase("dropping");
    await startEngine();
    after(reduced ? 0 : T_DROP, () => setPhase("idle"));
  };
  togglePlayRef.current = togglePlay;

  const seekTo = (value: number) => {
    if (!duration) return;
    if (mode === "youtube") ytRef.current?.seek(value * duration);
    else if (audioRef.current) audioRef.current.currentTime = value * duration;
    setProgress(value);
  };

  // ── Tonearm drag → seek ──────────────────────────────────────────────
  const armAngleFromPointer = (
    event: ReactPointerEvent<SVGElement>,
  ): number => {
    const svg = armSvgRef.current;
    if (!svg) return ARM_OUTER;
    const rect = svg.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;
    // Signed angle (clockwise positive) from the arm's rest vector to the pointer.
    const vx = x - 88;
    const vy = y - 12;
    const rx = 4;
    const ry = 50;
    return (Math.atan2(rx * vy - ry * vx, rx * vx + ry * vy) * 180) / Math.PI;
  };
  const progressFromAngle = (angle: number) =>
    Math.min(1, Math.max(0, (angle - ARM_OUTER) / (ARM_INNER - ARM_OUTER)));

  const needleDown = phase === "dropping" || (phase === "idle" && playing);
  const canDragArm = needleDown && duration > 0 && mode !== "empty";

  const onArmPointerDown = (event: ReactPointerEvent<SVGElement>) => {
    if (!canDragArm) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragProgress(progressFromAngle(armAngleFromPointer(event)));
  };
  const onArmPointerMove = (event: ReactPointerEvent<SVGElement>) => {
    if (dragProgress === null) return;
    setDragProgress(progressFromAngle(armAngleFromPointer(event)));
  };
  const onArmPointerUp = (event: ReactPointerEvent<SVGElement>) => {
    if (dragProgress === null) return;
    event.currentTarget.releasePointerCapture(event.pointerId);
    seekTo(dragProgress);
    setDragProgress(null);
  };

  // ── Platter physics (rAF: spins up, coasts down) ─────────────────────
  useEffect(() => {
    const record = recordRef.current;
    if (!record) return;
    if (prefersReducedMotion()) {
      record.style.transform = "";
      return;
    }
    const target = playing ? (rpm / 60) * 360 : 0;
    let velocity = Number(record.dataset.velocity ?? 0);
    let angle = Number(record.dataset.angle ?? 0);
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      // Exponential approach: ~1.2 s to spin up, ~1.8 s to coast down.
      const tau = target > velocity ? 0.4 : 0.6;
      velocity += (target - velocity) * (1 - Math.exp(-dt / tau));
      if (target === 0 && velocity < 1) velocity = 0;
      angle = (angle + velocity * dt) % 360;
      record.style.transform = `rotate(${angle.toFixed(2)}deg)`;
      record.dataset.velocity = String(velocity);
      record.dataset.angle = String(angle);
      if (velocity > 0 || target > 0)
        rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [playing, rpm]);

  // ── Meter / progress loops ───────────────────────────────────────────
  useEffect(() => {
    const node = analyser();
    const bars = barRefs.current;
    if (!playing || !node) {
      cancelAnimationFrame(meterRaf.current);
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
      meterRaf.current = requestAnimationFrame(tick);
    };
    meterRaf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(meterRaf.current);
  }, [playing, analyser]);

  useEffect(() => {
    if (mode !== "youtube") return;
    const poll = () => {
      const engine = ytRef.current;
      if (!engine) return;
      const total = engine.duration();
      const seconds = engine.currentTime();
      setDuration(total);
      setProgress(total ? seconds / total : 0);
      syncBeat(seconds);
    };
    poll();
    if (!playing) return;
    const timer = window.setInterval(poll, 250);
    return () => window.clearInterval(timer);
  }, [mode, playing, currentId, engineReady, syncBeat]);

  const syncTime = (audio: HTMLAudioElement) => {
    const total = Number.isFinite(audio.duration) ? audio.duration : 0;
    setDuration(total);
    setProgress(total ? audio.currentTime / total : 0);
    syncBeat(audio.currentTime);
  };

  // ── Ambient light: the page glows in the record's colour while it plays ─
  useEffect(() => {
    const root = document.documentElement;
    if (playing && current) {
      root.style.setProperty(
        "--record-glow",
        current.glow ?? sleeveGlow(current.id),
      );
      root.setAttribute("data-record-playing", "");
    } else {
      root.removeAttribute("data-record-playing");
    }
    return () => {
      root.removeAttribute("data-record-playing");
      root.style.removeProperty("--record-glow");
    };
  }, [playing, current]);

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

  // The monitor unmounts outside youtube mode; the player must go with it.
  useEffect(() => {
    if (mode === "youtube" || !ytRef.current) return;
    ytRef.current.dispose();
    ytRef.current = null;
    setEngineReady(false);
    setEngineCreated(false);
  }, [mode]);

  useEffect(() => {
    return () => {
      clearTimers();
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
    if (phase === "lifting") return "Lifting";
    if (phase === "swapping") return "Changing record";
    if (phase === "dropping") return "Dropping the needle";
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
  const shownProgress = dragProgress ?? progress;
  const armAngle = needleDown
    ? ARM_OUTER + shownProgress * (ARM_INNER - ARM_OUTER)
    : 0;
  const armMotion =
    dragProgress !== null
      ? "drag"
      : phase === "lifting" || phase === "dropping" || !needleDown
        ? "swing"
        : "track";
  const showMonitorVideo = engineCreated && !error;
  const needleLabel =
    playing || phase === "dropping" ? "Lift the needle" : "Drop the needle";

  return (
    <div className="flex flex-col gap-16">
      <section
        ref={deckRef}
        aria-label="Record deck"
        data-playing={playing}
        data-phase={phase}
        className={cn(styles.deck, "p-5 sm:p-7 lg:p-8")}
      >
        {/* Beat lamp: a soft halo around the deck that pulses to the tempo. */}
        <div className={styles.halo} aria-hidden="true" />
        <div className="relative grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:items-center lg:gap-10">
          {/* Platter */}
          <div className={styles.stage} aria-hidden="true">
            <div className={styles.mat} />
            <div className={styles.strobe} data-rpm={rpm} />
            <div
              ref={recordRef}
              className={cn(
                styles.record,
                swap === "out" && styles.recordOut,
                swap === "in" && styles.recordIn,
              )}
            >
              <div className={styles.label}>
                {current ? (
                  <SleeveImage
                    id={current.id}
                    artwork={current.artwork}
                    sizes="160px"
                  />
                ) : null}
                <div className={cn(styles.labelInk, "max-lg:opacity-0")}>
                  {current ? (
                    <>
                      <p className="line-clamp-2 px-3 font-display text-[12px] font-semibold leading-tight tracking-tight lg:text-sm">
                        {current.title}
                      </p>
                      <p className="line-clamp-1 px-3 font-mono text-[8px] uppercase tracking-[0.2em] opacity-80 lg:text-[10px]">
                        {current.artist}
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="font-mono text-[8px] uppercase leading-relaxed tracking-[0.2em] lg:text-[10px]">
                        No record
                        <br />
                        loaded
                      </p>
                      <p className="font-mono text-[8px] uppercase tracking-[0.2em] opacity-70 lg:text-[10px]">
                        side —
                      </p>
                    </>
                  )}
                </div>
              </div>
            </div>
            <div className={styles.spindle} />
            <svg
              ref={armSvgRef}
              className={styles.arm}
              viewBox="0 0 100 100"
              data-motion={armMotion}
              style={{ ["--arm-angle" as string]: `${armAngle.toFixed(2)}deg` }}
            >
              <g
                className={cn(styles.armPivot, canDragArm && styles.armGrab)}
                onPointerDown={onArmPointerDown}
                onPointerMove={onArmPointerMove}
                onPointerUp={onArmPointerUp}
                onPointerCancel={onArmPointerUp}
              >
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
                {/* Generous invisible hit area for dragging. */}
                <line
                  x1="88"
                  y1="12"
                  x2="92"
                  y2="66"
                  className={styles.armHit}
                />
              </g>
            </svg>
          </div>

          {/* Controls */}
          <div className="flex min-w-0 flex-col gap-5">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              <span className={styles.lamp} aria-hidden="true" />
              <span aria-live="polite">{status}</span>
              <span aria-hidden="true">·</span>
              <span>{rpm === 33 ? "33⅓" : "45"} rpm</span>
              {current?.bpm ? (
                <>
                  <span aria-hidden="true">·</span>
                  <span className={styles.bpm}>
                    ≈ {Math.round(current.bpm)} bpm
                  </span>
                </>
              ) : null}
              {mode === "youtube" ? (
                <>
                  <span aria-hidden="true">·</span>
                  <span>via YouTube</span>
                </>
              ) : null}
              <button
                type="button"
                onClick={toggleSfx}
                aria-pressed={sfx}
                className="ml-auto rounded-[6px] px-1.5 py-0.5 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                sfx {sfx ? "on" : "off"}
              </button>
            </div>

            {/* Monitor: the record's sleeve until the player exists, then the
                visible YouTube frame; an error takes the frame's place. */}
            {mode === "youtube" && current ? (
              <div className={styles.monitor}>
                <div
                  ref={frameRef}
                  className={cn(
                    styles.video,
                    !showMonitorVideo && styles.videoHidden,
                  )}
                />
                {!engineCreated && !error ? (
                  <div className={styles.monitorArt} aria-hidden="true">
                    <SleeveImage
                      id={current.id}
                      artwork={current.artwork}
                      sizes="(min-width: 1024px) 384px, 100vw"
                      className="scale-125 opacity-60 blur-2xl"
                    />
                    <div className={styles.monitorSquare}>
                      <SleeveImage
                        id={current.id}
                        artwork={current.artwork}
                        sizes="(min-width: 1024px) 216px, 60vw"
                        priority
                      />
                    </div>
                    <span className={styles.monitorChip}>via YouTube</span>
                  </div>
                ) : null}
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
                ) : null}
              </div>
            ) : null}

            <div className={cn(styles.title, swap && styles.titleSwap)}>
              {current ? (
                <>
                  <h2 className="font-display text-[26px] font-semibold leading-[1.1] tracking-tight text-foreground lg:text-[30px]">
                    {current.title}
                  </h2>
                  <p className="mt-1.5 text-base text-muted-foreground">
                    {current.artist}
                    {current.album ? (
                      <span className="opacity-70"> · {current.album}</span>
                    ) : null}
                  </p>
                  {current.note ? (
                    <p className="mt-3 max-w-prose text-[14px] leading-relaxed text-foreground/80">
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
            <div className="flex flex-wrap items-center gap-2.5">
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
                className={styles.needleButton}
              >
                {playing || phase === "dropping" ? (
                  <Pause className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <Play className="h-4 w-4" aria-hidden="true" />
                )}
                {needleLabel}
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
                  <span className={styles.divider} aria-hidden="true" />
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

            {/* Position: the tonearm is the visual control; this is the accessible one. */}
            {hasRecords ? (
              <label className="flex items-center gap-3 font-mono text-[11px] tabular-nums text-muted-foreground">
                <span className="w-9">
                  {formatTime(shownProgress * duration)}
                </span>
                <input
                  type="range"
                  min={0}
                  max={1000}
                  value={Math.round(shownProgress * 1000)}
                  disabled={!duration}
                  onChange={(event) =>
                    seekTo(Number(event.target.value) / 1000)
                  }
                  className={cn(styles.range, styles.rangeThin)}
                  style={{ ["--fill" as string]: `${shownProgress * 100}%` }}
                  aria-label="Position"
                />
                <span className="w-9 text-right">{formatTime(duration)}</span>
              </label>
            ) : null}

            <div className="flex flex-wrap items-center gap-4">
              <label className="flex min-w-[10rem] flex-1 items-center gap-3">
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
                className="inline-flex rounded-[10px] border border-border bg-surface p-1 font-mono text-xs"
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
