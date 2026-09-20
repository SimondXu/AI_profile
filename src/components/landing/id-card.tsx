"use client";

import Image from "next/image";
import { useState } from "react";
import { cn } from "@/lib/utils";

export interface IdCardFact {
  label: string;
  value: string;
}

interface IdCardProps {
  name: string;
  title: string;
  handle: string;
  avatarSrc: string;
  facts: IdCardFact[];
  availability?: string | null;
  focus?: string[];
  /** Real lines for the back of the card (fun facts, beliefs). */
  backLines: string[];
}

/**
 * A paper "studio pass". Front: identity and facts. Back: fun facts. Flips
 * on hover (fine pointers) and on click/Enter; the hidden face is inert for
 * assistive tech. Both faces are in the server HTML.
 */
export function IdCard({
  name,
  title,
  handle,
  avatarSrc,
  facts,
  availability,
  focus = [],
  backLines,
}: IdCardProps) {
  const [flipped, setFlipped] = useState(false);
  const canFlip = backLines.length > 0;

  return (
    <div
      className="group relative mx-auto w-full max-w-sm lg:mx-0"
      style={{ perspective: "1200px" }}
    >
      <div
        className={cn(
          "relative rotate-[-1.5deg] transition-transform duration-500 [transform-style:preserve-3d] motion-reduce:transition-none",
          canFlip && "group-hover:[transform:rotate(0deg)_rotateY(180deg)]",
          flipped && "[transform:rotate(0deg)_rotateY(180deg)]",
        )}
      >
        {/* Front */}
        <div
          className="relative rounded-[18px] bg-material-paper p-5 text-material-vinyl shadow-[0_1px_2px_rgba(0,0,0,0.12),0_18px_40px_-20px_rgba(0,0,0,0.45)] [backface-visibility:hidden]"
          aria-hidden={flipped ? "true" : undefined}
        >
          <div className="flex items-center gap-4">
            <Image
              src={avatarSrc}
              alt=""
              width={56}
              height={56}
              className="h-14 w-14 rounded-[10px] border border-black/10 object-cover"
            />
            <div className="min-w-0">
              <p className="truncate font-display text-lg font-semibold leading-tight">{name}</p>
              <p className="truncate text-sm text-material-vinyl/70">{title}</p>
            </div>
          </div>

          <dl className="mt-5 flex flex-col gap-3 border-t border-black/10 pt-4 text-sm">
            {availability ? (
              <div>
                <dt className="font-mono text-[11px] uppercase tracking-[0.18em] text-material-vinyl/60">
                  Status
                </dt>
                <dd className="mt-1 flex items-center gap-2">
                  <span className="pulse-dot text-emerald-600" aria-hidden="true" />
                  <span>{availability}</span>
                </dd>
              </div>
            ) : null}
            {facts.map((fact) => (
              <div key={fact.label}>
                <dt className="font-mono text-[11px] uppercase tracking-[0.18em] text-material-vinyl/60">
                  {fact.label}
                </dt>
                <dd className="mt-1 whitespace-pre-line">{fact.value}</dd>
              </div>
            ))}
            {focus.length ? (
              <div>
                <dt className="font-mono text-[11px] uppercase tracking-[0.18em] text-material-vinyl/60">
                  Focus
                </dt>
                <dd className="mt-1.5 flex flex-wrap gap-1.5">
                  {focus.map((area) => (
                    <span
                      key={area}
                      className="rounded-[6px] border border-black/10 bg-white/50 px-2 py-0.5 text-[12px]"
                    >
                      {area}
                    </span>
                  ))}
                </dd>
              </div>
            ) : null}
          </dl>

          <div className="mt-4 flex items-center justify-between border-t border-black/10 pt-3 font-mono text-[10px] uppercase tracking-[0.2em] text-material-vinyl/50">
            <span>studio pass · {handle}</span>
            {canFlip ? <span aria-hidden="true">flip ↻</span> : null}
          </div>
        </div>

        {/* Back */}
        {canFlip ? (
          <div
            className="absolute inset-0 flex flex-col rounded-[18px] bg-material-vinyl p-5 text-[#efede6] shadow-[0_1px_2px_rgba(0,0,0,0.2),0_18px_40px_-20px_rgba(0,0,0,0.6)] [backface-visibility:hidden] [transform:rotateY(180deg)]"
            aria-hidden={flipped ? undefined : "true"}
          >
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-white/50">
              Off the record
            </p>
            <ul className="mt-4 flex flex-1 flex-col gap-3 text-sm leading-snug">
              {backLines.map((line, index) => (
                <li key={line} className="flex gap-3">
                  <span className="font-mono text-[11px] text-[#8fa7ff]">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span>{line}</span>
                </li>
              ))}
            </ul>
            <p className="mt-4 border-t border-white/10 pt-3 font-mono text-[10px] uppercase tracking-[0.2em] text-white/40">
              ask the AI for the rest
            </p>
          </div>
        ) : null}
      </div>

      {canFlip ? (
        <button
          type="button"
          onClick={() => setFlipped((value) => !value)}
          aria-pressed={flipped}
          className="absolute inset-0 rounded-[18px] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
        >
          <span className="sr-only">{flipped ? "Show the front of the card" : "Flip the card for fun facts"}</span>
        </button>
      ) : null}
    </div>
  );
}
