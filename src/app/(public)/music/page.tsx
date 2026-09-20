import type { Metadata } from "next";
import { Turntable } from "@/components/music/turntable";
import { Reveal } from "@/components/landing/reveal";
import { ScrollReveal } from "@/components/motion/scroll-reveal";
import { SectionHeader } from "@/components/landing/section-header";
import { musicSelections, type MusicSelection } from "@/content/music";

export const metadata: Metadata = {
  title: "Music",
  description: "The record deck in Simon Xu's studio.",
  alternates: {
    canonical: "/music",
  },
  // Hidden section: keep out of the index until it has content.
  robots: { index: false, follow: false },
};

function hasAudio(
  selection: MusicSelection,
): selection is MusicSelection & { audioSrc: string } {
  return typeof selection.audioSrc === "string";
}

const EMPTY_SLEEVES = ["A", "B", "C"] as const;

export default function MusicPage() {
  const tracks = musicSelections.filter(hasAudio);

  return (
    <div className="mx-auto w-full max-w-6xl px-5 py-12 sm:px-8 lg:py-16">
      <header className="mb-10 flex flex-col gap-3">
        <Reveal>
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">
            Studio · Music
          </p>
        </Reveal>
        <Reveal delay={60}>
          <h1 className="font-display text-[40px] font-semibold leading-[1.1] tracking-tight text-foreground sm:text-[48px]">
            The deck
          </h1>
        </Reveal>
        <Reveal delay={120}>
          <p className="max-w-2xl text-base leading-7 text-muted-foreground">
            {musicSelections.length === 0
              ? "No records here yet. The deck is wired up, though — it just has nothing on it."
              : "Records Simon keeps coming back to."}
          </p>
        </Reveal>
      </header>

      <Reveal delay={160}>
        <Turntable tracks={tracks} />
      </Reveal>

      <ScrollReveal
        as="section"
        className="mt-20 flex flex-col gap-8 border-t border-border pt-16"
      >
        <SectionHeader eyebrow="Selections" title="On the shelf" />

        {musicSelections.length === 0 ? (
          <div className="flex flex-col gap-6">
            <ul
              className="grid grid-cols-3 gap-5 sm:max-w-md"
              aria-hidden="true"
            >
              {EMPTY_SLEEVES.map((sleeve, i) => (
                <li
                  key={sleeve}
                  className="group relative aspect-square hover:z-10"
                  style={{ transform: `rotate(${(i - 1) * 1.5}deg)` }}
                >
                  {/* Record, behind the sleeve; pulls up out of it on hover. */}
                  <div className="absolute inset-[6%] rounded-full bg-material-vinyl shadow-[0_0_0_1px_rgba(255,255,255,0.16),0_6px_16px_-8px_rgba(0,0,0,0.6)] transition-transform duration-300 ease-out group-hover:-translate-y-[38%] motion-reduce:group-hover:translate-y-0">
                    <div className="absolute inset-[38%] rounded-full bg-accent" />
                    <div className="absolute inset-0 rounded-full [background:repeating-radial-gradient(circle,transparent_0_2px,rgba(255,255,255,0.08)_2px_3px)]" />
                  </div>
                  {/* Sleeve */}
                  <div className="absolute inset-0 rounded-[8px] border border-border bg-material-paper shadow-[0_1px_2px_rgba(0,0,0,0.08),0_12px_24px_-16px_rgba(0,0,0,0.5)]">
                    <div className="absolute inset-y-0 left-0 w-[7%] rounded-l-[8px] bg-black/[0.06]" />
                    <span className="absolute bottom-2 left-4 font-mono text-[10px] uppercase tracking-[0.2em] text-material-vinyl/50">
                      {sleeve}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
            <p className="max-w-prose text-[15px] leading-relaxed text-muted-foreground">
              No records here yet. Sleeves are cut; the shelf fills in when
              there is something worth pressing.
            </p>
          </div>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {musicSelections.map((selection, i) => (
              <ScrollReveal as="li" key={selection.id} delay={i * 60}>
                <article className="flex h-full flex-col gap-3 rounded-[18px] border border-border bg-surface p-5">
                  <div className="flex items-center gap-4">
                    <div className="relative h-14 w-14 shrink-0 rounded-full bg-material-vinyl">
                      <div className="absolute inset-[36%] rounded-full bg-accent" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="truncate font-display text-lg font-semibold text-foreground">
                        {selection.title}
                      </h3>
                      <p className="truncate text-sm text-muted-foreground">
                        {selection.artist}
                      </p>
                    </div>
                  </div>
                  {selection.note ? (
                    <p className="text-[15px] leading-relaxed text-foreground/85">
                      {selection.note}
                    </p>
                  ) : null}
                  {selection.externalUrl ? (
                    <a
                      className="mt-auto inline-flex text-sm font-medium text-accent underline-offset-4 hover:underline"
                      href={selection.externalUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Listen elsewhere →
                    </a>
                  ) : null}
                </article>
              </ScrollReveal>
            ))}
          </ul>
        )}
      </ScrollReveal>
    </div>
  );
}
