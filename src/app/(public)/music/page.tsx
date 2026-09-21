import type { Metadata } from "next";
import { Reveal } from "@/components/landing/reveal";
import { Turntable } from "@/components/music/turntable";
import { musicCrate } from "@/content/music";

export const metadata: Metadata = {
  title: "Music",
  description: "The record deck in Simon Xu's studio.",
  alternates: {
    canonical: "/music",
  },
  // Hidden section: keep out of the index until it has content.
  robots: { index: false, follow: false },
};

interface MusicPageProps {
  searchParams: Promise<{ track?: string | string[] }>;
}

export default async function MusicPage({ searchParams }: MusicPageProps) {
  const { track } = await searchParams;
  const initialId = typeof track === "string" ? track : undefined;
  const { name, createdAt, records } = musicCrate;
  const empty = records.length === 0;

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
            {empty
              ? "No records here yet. The deck is wired up, though — it just has nothing on it."
              : `A crate of ${records.length} records Simon keeps coming back to. Pick one, drop the needle. Playback runs through YouTube, loaded only when you press play.`}
          </p>
        </Reveal>
      </header>

      <Reveal delay={160}>
        <Turntable
          crateName={name}
          crateCreatedAt={createdAt}
          records={records}
          initialId={initialId}
        />
      </Reveal>
    </div>
  );
}
