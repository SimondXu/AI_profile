"use client";

import { ChevronLeft, ChevronRight, Search, X } from "lucide-react";
import {
  type KeyboardEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { MusicSelection } from "@/content/music";
import { isPlayable } from "@/content/music";
import { cn } from "@/lib/utils";
import { sleeveArt } from "./sleeve-art";
import styles from "./crate.module.css";

interface CrateProps {
  name: string;
  createdAt: string;
  records: ReadonlyArray<MusicSelection>;
  currentId: string | null;
  playing: boolean;
  onSelect(id: string): void;
}

const MIN_CHIP_COUNT = 3;

function primaryArtist(artist: string): string {
  return artist.split(/,|\/|&| feat\. /i)[0].trim();
}

/**
 * The crate: every record in the playlist as a sleeve you flip through.
 * Horizontal, snap-scrolled, keyboard-navigable (←/→ moves between sleeves,
 * Enter puts one on the deck). Filter by text or by the artists that show up
 * most — both derived from the data, nothing hand-written.
 */
export function Crate({
  name,
  createdAt,
  records,
  currentId,
  playing,
  onSelect,
}: CrateProps) {
  const [query, setQuery] = useState("");
  const [artistFilter, setArtistFilter] = useState<string | null>(null);
  const listRef = useRef<HTMLUListElement | null>(null);

  const artistChips = useMemo(() => {
    const counts = new Map<string, number>();
    for (const record of records) {
      const key = primaryArtist(record.artist);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return [...counts.entries()]
      .filter(([, count]) => count >= MIN_CHIP_COUNT)
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, 8);
  }, [records]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return records.filter((record) => {
      if (artistFilter && primaryArtist(record.artist) !== artistFilter)
        return false;
      if (!q) return true;
      return (
        record.title.toLowerCase().includes(q) ||
        record.artist.toLowerCase().includes(q) ||
        (record.album?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [records, query, artistFilter]);

  const playableCount = useMemo(
    () => records.filter(isPlayable).length,
    [records],
  );

  // Keep the record on the deck in view when it changes (e.g. auto-advance).
  useEffect(() => {
    if (!currentId) return;
    const el = listRef.current?.querySelector<HTMLElement>(
      `[data-id="${CSS.escape(currentId)}"]`,
    );
    el?.scrollIntoView({
      inline: "center",
      block: "nearest",
      behavior: "smooth",
    });
  }, [currentId]);

  const nudge = (direction: 1 | -1) => {
    const list = listRef.current;
    if (!list) return;
    list.scrollBy({
      left: direction * list.clientWidth * 0.8,
      behavior: "smooth",
    });
  };

  const onListKeyDown = (event: KeyboardEvent<HTMLUListElement>) => {
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
    const buttons = [
      ...(listRef.current?.querySelectorAll<HTMLButtonElement>(
        "button[data-id]",
      ) ?? []),
    ];
    const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
    if (index === -1) return;
    event.preventDefault();
    const next =
      buttons[
        (index + (event.key === "ArrowRight" ? 1 : -1) + buttons.length) %
          buttons.length
      ];
    next?.focus();
    next?.scrollIntoView({
      inline: "center",
      block: "nearest",
      behavior: "smooth",
    });
  };

  return (
    <section aria-labelledby="crate-title" className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-2">
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">
            The crate
          </p>
          <h2
            id="crate-title"
            className="font-display text-[32px] font-semibold leading-[1.15] tracking-tight text-foreground"
          >
            {name}
          </h2>
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            {records.length} records · since {createdAt} · {playableCount} on
            YouTube
          </p>
        </div>

        <label className="relative flex w-full items-center sm:w-72">
          <Search
            className="pointer-events-none absolute left-3 h-4 w-4 text-muted-foreground"
            aria-hidden="true"
          />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Find in the crate…"
            aria-label="Find a record"
            className="w-full rounded-[10px] border border-border bg-surface py-2 pl-9 pr-3 font-mono text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          />
        </label>
      </div>

      {artistChips.length ? (
        <div
          className="flex flex-wrap items-center gap-2"
          role="group"
          aria-label="Filter by artist"
        >
          {artistChips.map(([artist, count]) => {
            const active = artistFilter === artist;
            return (
              <button
                key={artist}
                type="button"
                aria-pressed={active}
                onClick={() => setArtistFilter(active ? null : artist)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[13px] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                  active
                    ? "border-accent bg-accent-soft text-foreground"
                    : "border-border bg-surface text-muted-foreground hover:border-input hover:text-foreground",
                )}
              >
                {artist}
                <span className="font-mono text-[11px]">×{count}</span>
                {active ? <X className="h-3 w-3" aria-hidden="true" /> : null}
              </button>
            );
          })}
        </div>
      ) : null}

      {visible.length === 0 ? (
        <p className="py-10 text-center font-mono text-sm text-muted-foreground">
          Nothing in the crate matches “{query}”.
        </p>
      ) : (
        <div className="relative">
          <div className="pointer-events-none absolute -top-12 right-0 hidden items-center gap-2 sm:flex">
            <button
              type="button"
              onClick={() => nudge(-1)}
              aria-label="Flip back through the crate"
              className={`${styles.nudge} pointer-events-auto`}
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => nudge(1)}
              aria-label="Flip forward through the crate"
              className={`${styles.nudge} pointer-events-auto`}
            >
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
          <ul
            ref={listRef}
            onKeyDown={onListKeyDown}
            className={styles.strip}
            aria-label="Records"
          >
            {visible.map((record) => {
              const current = record.id === currentId;
              const playable = isPlayable(record);
              return (
                <li key={record.id} className={styles.slot}>
                  <button
                    type="button"
                    data-id={record.id}
                    disabled={!playable}
                    aria-current={current ? "true" : undefined}
                    onClick={() => onSelect(record.id)}
                    className={cn(
                      styles.sleeve,
                      current && styles.sleeveCurrent,
                    )}
                    title={
                      playable
                        ? `Put “${record.title}” on the deck`
                        : "No source for this record yet"
                    }
                  >
                    <span
                      className={styles.art}
                      style={sleeveArt(record.id)}
                      aria-hidden="true"
                    />
                    <span className={styles.band}>
                      <span className="line-clamp-2 font-display text-[13px] font-semibold leading-tight">
                        {record.title}
                      </span>
                      <span className="mt-0.5 line-clamp-1 font-mono text-[10px] uppercase tracking-[0.12em] opacity-70">
                        {record.artist}
                      </span>
                    </span>
                    {current ? (
                      <span className={styles.tag}>
                        <span
                          className={cn(
                            "pulse-dot",
                            playing
                              ? "text-emerald-500"
                              : "text-muted-foreground",
                          )}
                          aria-hidden="true"
                        />
                        {playing ? "on the deck" : "cued"}
                      </span>
                    ) : null}
                    {!playable ? (
                      <span className={styles.tag}>no source</span>
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </section>
  );
}
