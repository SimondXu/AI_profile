import type { Metadata } from "next";
import Image from "next/image";
import { Reveal } from "@/components/landing/reveal";
import { ScrollReveal } from "@/components/motion/scroll-reveal";
import { LightTable } from "@/components/photos/light-table";
import { photos } from "@/content/photos";

export const metadata: Metadata = {
  title: "Photos",
  description: "The light table in Simon Xu's studio.",
  alternates: {
    canonical: "/photos",
  },
  // Hidden section: keep out of the index until it has content.
  robots: { index: false, follow: false },
};

export default function PhotosPage() {
  return (
    <div className="mx-auto w-full max-w-6xl px-5 py-12 sm:px-8 lg:py-16">
      <header className="mb-10 flex flex-col gap-3">
        <Reveal>
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">
            Studio · Photos
          </p>
        </Reveal>
        <Reveal delay={60}>
          <h1 className="font-display text-[40px] font-semibold leading-[1.1] tracking-tight text-foreground sm:text-[48px]">
            The light table
          </h1>
        </Reveal>
        <Reveal delay={120}>
          <p className="max-w-2xl text-base leading-7 text-muted-foreground">
            {photos.length === 0
              ? "No photos published yet. The table is lit; the roll hasn't been developed."
              : "Photographs by Simon."}
          </p>
        </Reveal>
      </header>

      {photos.length === 0 ? (
        <Reveal delay={160}>
          <LightTable />
        </Reveal>
      ) : (
        <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {photos.map((photo, i) => (
            <ScrollReveal as="li" key={photo.id} delay={(i % 3) * 60}>
              <figure className="group overflow-hidden rounded-[18px] border border-border bg-surface">
                <Image
                  src={photo.src}
                  alt={photo.alt}
                  width={photo.width}
                  height={photo.height}
                  className="h-auto w-full transition-transform duration-500 group-hover:scale-[1.02] motion-reduce:group-hover:scale-100"
                />
                {photo.caption ? (
                  <figcaption className="px-4 py-3 text-sm text-muted-foreground">
                    {photo.caption}
                  </figcaption>
                ) : null}
              </figure>
            </ScrollReveal>
          ))}
        </ul>
      )}
    </div>
  );
}
