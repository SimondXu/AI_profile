/**
 * Thin wrapper over the YouTube IFrame Player API so YouTube-sourced records
 * drive the same deck state as local files. The API script is injected only
 * when the first YouTube record is put on the deck — never on page load — and
 * from the privacy-enhanced host. There is no audio data available from an
 * embed, so the deck hides its meter in this mode rather than fake it.
 *
 * Failure modes are reported, not swallowed: a script that never loads
 * (blocked network / region) and per-video player errors both surface as
 * `DeckError`s the UI can explain.
 */

export type DeckErrorCode =
  "blocked" | "unavailable" | "not-embeddable" | "player";

export interface DeckError {
  code: DeckErrorCode;
  /** Player error number from YouTube when applicable. */
  raw?: number;
}

export interface YouTubeEngineEvents {
  onReady(): void;
  onPlaying(): void;
  onPaused(): void;
  onEnded(): void;
  onBuffering(): void;
  onError(error: DeckError): void;
}

export interface YouTubeEngine {
  load(videoId: string, autoplay: boolean): void;
  play(): void;
  pause(): void;
  seek(seconds: number): void;
  /** 0–1 */
  setVolume(value: number): void;
  currentTime(): number;
  duration(): number;
  dispose(): void;
}

// Minimal typing of the parts of the IFrame API we use.
interface YTPlayer {
  loadVideoById(videoId: string): void;
  cueVideoById(videoId: string): void;
  playVideo(): void;
  pauseVideo(): void;
  seekTo(seconds: number, allowSeekAhead: boolean): void;
  setVolume(volume: number): void;
  getCurrentTime(): number;
  getDuration(): number;
  destroy(): void;
}

interface YTNamespace {
  Player: new (
    element: HTMLElement,
    options: {
      host?: string;
      videoId?: string;
      width?: string | number;
      height?: string | number;
      playerVars?: Record<string, string | number>;
      events?: {
        onReady?: () => void;
        onStateChange?: (event: { data: number }) => void;
        onError?: (event: { data: number }) => void;
      };
    },
  ) => YTPlayer;
  PlayerState: {
    ENDED: number;
    PLAYING: number;
    PAUSED: number;
    BUFFERING: number;
  };
}

declare global {
  interface Window {
    YT?: YTNamespace;
    onYouTubeIframeAPIReady?: () => void;
  }
}

const SCRIPT_SRC = "https://www.youtube.com/iframe_api";
const LOAD_TIMEOUT_MS = 8000;

let apiPromise: Promise<YTNamespace> | null = null;

/** Injects the API script once; rejects if it never reports ready. */
function loadApi(): Promise<YTNamespace> {
  if (typeof window === "undefined")
    return Promise.reject(new Error("no window"));
  if (window.YT?.Player) return Promise.resolve(window.YT);
  apiPromise ??= new Promise<YTNamespace>((resolve, reject) => {
    const timer = window.setTimeout(() => {
      apiPromise = null;
      reject(new Error("timeout"));
    }, LOAD_TIMEOUT_MS);

    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      window.clearTimeout(timer);
      previous?.();
      if (window.YT) resolve(window.YT);
      else reject(new Error("no YT"));
    };

    const script = document.createElement("script");
    script.src = SCRIPT_SRC;
    script.async = true;
    script.onerror = () => {
      window.clearTimeout(timer);
      apiPromise = null;
      reject(new Error("script"));
    };
    document.head.appendChild(script);
  });
  return apiPromise;
}

function mapPlayerError(code: number): DeckError {
  // 100: not found / private · 101, 150: embedding disallowed by owner
  if (code === 101 || code === 150)
    return { code: "not-embeddable", raw: code };
  if (code === 100) return { code: "unavailable", raw: code };
  return { code: "player", raw: code };
}

/**
 * Creates the engine inside `container` (which must stay in the DOM and be
 * visibly sized — YouTube's terms require the player to be visible).
 */
export function createYouTubeEngine(
  container: HTMLElement,
  events: YouTubeEngineEvents,
): YouTubeEngine {
  let player: YTPlayer | null = null;
  let disposed = false;
  let ready = false;
  let pendingVolume = 50;
  let pending: { videoId: string; autoplay: boolean } | null = null;

  const mount = document.createElement("div");
  container.replaceChildren(mount);

  // If the script loads but the player frame never reports ready (the
  // embed host is blocked while the script was cached, for instance), treat
  // it as blocked rather than spinning forever.
  let readyTimer = 0;

  loadApi()
    .then((YT) => {
      if (disposed) return;
      readyTimer = window.setTimeout(() => {
        if (!disposed && !ready) events.onError({ code: "blocked" });
      }, LOAD_TIMEOUT_MS);
      player = new YT.Player(mount, {
        host: "https://www.youtube-nocookie.com",
        width: "100%",
        height: "100%",
        playerVars: {
          controls: 0,
          rel: 0,
          playsinline: 1,
          modestbranding: 1,
          iv_load_policy: 3,
          disablekb: 1,
          origin: window.location.origin,
        },
        events: {
          onReady: () => {
            if (disposed || !player) return;
            window.clearTimeout(readyTimer);
            ready = true;
            player.setVolume(pendingVolume);
            if (pending) {
              const { videoId, autoplay } = pending;
              pending = null;
              if (autoplay) player.loadVideoById(videoId);
              else player.cueVideoById(videoId);
            }
            events.onReady();
          },
          onStateChange: ({ data }) => {
            if (disposed) return;
            if (data === YT.PlayerState.PLAYING) events.onPlaying();
            else if (data === YT.PlayerState.PAUSED) events.onPaused();
            else if (data === YT.PlayerState.ENDED) events.onEnded();
            else if (data === YT.PlayerState.BUFFERING) events.onBuffering();
          },
          onError: ({ data }) => {
            if (disposed) return;
            events.onError(mapPlayerError(data));
          },
        },
      });
    })
    .catch(() => {
      if (!disposed) events.onError({ code: "blocked" });
    });

  return {
    load(videoId, autoplay) {
      if (!ready || !player) {
        pending = { videoId, autoplay };
        return;
      }
      if (autoplay) player.loadVideoById(videoId);
      else player.cueVideoById(videoId);
    },
    play() {
      player?.playVideo();
    },
    pause() {
      player?.pauseVideo();
    },
    seek(seconds) {
      player?.seekTo(seconds, true);
    },
    setVolume(value) {
      pendingVolume = Math.round(Math.min(1, Math.max(0, value)) * 100);
      player?.setVolume(pendingVolume);
    },
    currentTime() {
      return ready && player ? player.getCurrentTime() || 0 : 0;
    },
    duration() {
      return ready && player ? player.getDuration() || 0 : 0;
    },
    dispose() {
      disposed = true;
      window.clearTimeout(readyTimer);
      try {
        player?.destroy();
      } catch {
        // Player may already be gone.
      }
      player = null;
      container.replaceChildren();
    },
  };
}
