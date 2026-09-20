import type { Metadata } from "next";
import { musicSelections } from "@/content/music";

export const metadata: Metadata = {
  title: "Music",
  description: "Records Simon Xu keeps coming back to.",
  alternates: {
    canonical: "/music",
  },
  // Hidden section: keep out of the index until it has content.
  robots: { index: false, follow: false },
};

export default function MusicPage() {
  return (
    <div className="mx-auto w-full max-w-6xl px-5 py-16 sm:px-8">
      <header className="mb-10">
        <h1 className="font-display text-4xl font-semibold tracking-tight text-foreground">
          Music
        </h1>
      </header>

      {musicSelections.length === 0 ? (
        <p className="text-muted-foreground">No records here yet.</p>
      ) : (
        <ul className="divide-y divide-border">
          {musicSelections.map((selection) => (
            <li key={selection.id} className="py-4">
              <p className="font-medium text-foreground">{selection.title}</p>
              <p className="text-sm text-muted-foreground">
                {selection.artist}
              </p>
              {selection.note ? (
                <p className="mt-1 text-sm text-muted-foreground">
                  {selection.note}
                </p>
              ) : null}
              {selection.externalUrl ? (
                <a
                  className="mt-1 inline-block text-sm text-accent underline-offset-4 hover:underline"
                  href={selection.externalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Listen
                </a>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
