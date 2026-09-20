import type { Metadata } from "next";
import Image from "next/image";
import { photos } from "@/content/photos";

export const metadata: Metadata = {
  title: "Photos",
  description: "Photographs by Simon Xu.",
  alternates: {
    canonical: "/photos",
  },
  // Hidden section: keep out of the index until it has content.
  robots: { index: false, follow: false },
};

export default function PhotosPage() {
  return (
    <div className="mx-auto w-full max-w-6xl px-5 py-16 sm:px-8">
      <header className="mb-10">
        <h1 className="font-display text-4xl font-semibold tracking-tight text-foreground">
          Photos
        </h1>
      </header>

      {photos.length === 0 ? (
        <p className="text-muted-foreground">No photos published yet.</p>
      ) : (
        <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {photos.map((photo) => (
            <li key={photo.id}>
              <figure>
                <Image
                  src={photo.src}
                  alt={photo.alt}
                  width={photo.width}
                  height={photo.height}
                  className="h-auto w-full rounded-[18px] border border-border"
                />
                {photo.caption ? (
                  <figcaption className="mt-2 text-sm text-muted-foreground">
                    {photo.caption}
                  </figcaption>
                ) : null}
              </figure>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
