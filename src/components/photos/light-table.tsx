"use client";

import { Camera } from "lucide-react";
import { type PointerEvent, useRef, useState } from "react";
import styles from "./light-table.module.css";

const FRAME_COUNT = 6;
const PRINTS = [
  { rest: "-3deg", fan: "-12deg", shift: "-2.6rem" },
  { rest: "1deg", fan: "0deg", shift: "0" },
  { rest: "4deg", fan: "12deg", shift: "2.6rem" },
] as const;

/**
 * The empty state for /photos: a back-lit table whose glow follows the
 * pointer, a strip of unexposed film, and a stack of blank prints that fans
 * out on hover. The shutter is an easter egg — a flash and a counter, no
 * photo is taken or stored. Everything visible is decorative and hidden from
 * assistive tech; the honest status line is the only text that speaks.
 */
export function LightTable() {
  const tableRef = useRef<HTMLDivElement | null>(null);
  const [shutterCount, setShutterCount] = useState(0);
  const [flashKey, setFlashKey] = useState(0);

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const el = tableRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    el.style.setProperty(
      "--mx",
      `${((event.clientX - rect.left) / rect.width) * 100}%`,
    );
    el.style.setProperty(
      "--my",
      `${((event.clientY - rect.top) / rect.height) * 100}%`,
    );
  };

  const fire = () => {
    setShutterCount((n) => n + 1);
    setFlashKey((k) => k + 1);
  };

  return (
    <div
      ref={tableRef}
      className={`${styles.table} p-6 sm:p-10`}
      onPointerMove={onPointerMove}
    >
      {flashKey > 0 ? (
        <div
          key={flashKey}
          className={styles.flash}
          data-on="true"
          aria-hidden="true"
        />
      ) : null}

      <div className="relative flex flex-col gap-10">
        {/* Status */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            Roll 01 · <span className="text-foreground">0 / 36 exposed</span>
          </p>
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            Table light <span className="text-foreground">on</span>
          </p>
        </div>

        {/* Film strip */}
        <div className="-mx-2" aria-hidden="true">
          <div className={styles.strip}>
            {Array.from({ length: FRAME_COUNT }, (_, i) => (
              <div key={i} className={styles.frame}>
                <span className={styles.frameIndex}>
                  {String(i + 1).padStart(2, "0")}A
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Prints + shutter */}
        <div className="flex flex-col items-start justify-between gap-8 sm:flex-row sm:items-end">
          <div className="flex flex-col items-start gap-8 sm:flex-row sm:items-end sm:gap-6">
            <div
              className="flex w-[17rem] shrink-0 justify-center"
              aria-hidden="true"
            >
              <div className={styles.stack}>
                {PRINTS.map((print, i) => (
                  <div
                    key={i}
                    className={styles.print}
                    style={{
                      ["--rest" as string]: print.rest,
                      ["--fan" as string]: print.fan,
                      ["--shift" as string]: print.shift,
                      zIndex: i,
                    }}
                  >
                    <div className={styles.printImage} />
                    <div className={styles.printCaption} />
                  </div>
                ))}
              </div>
            </div>
            <p className="max-w-[16rem] text-[15px] leading-relaxed text-muted-foreground">
              No photos published yet. The prints are blank on purpose — nothing
              here is a stand-in for a real picture.
            </p>
          </div>

          <div className="flex items-center gap-4">
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              Shutter{" "}
              <span className="tabular-nums text-foreground" aria-live="polite">
                {String(shutterCount).padStart(4, "0")}
              </span>
            </p>
            <button
              type="button"
              onClick={fire}
              className={`${styles.shutter} focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring`}
              aria-label="Fire the shutter (it only counts — no photo is taken)"
            >
              <Camera className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
