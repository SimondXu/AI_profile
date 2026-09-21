"use client";

import Image from "next/image";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { sleeveArt } from "./sleeve-art";

interface SleeveImageProps {
  id: string;
  artwork?: string;
  /** Responsive hint for next/image; defaults to the crate sleeve width. */
  sizes?: string;
  priority?: boolean;
  className?: string;
}

/**
 * Album artwork for a record, filling its parent. Falls back to the
 * procedural sleeve art when no artwork is on file or the image fails to
 * load, so a dead CDN link never leaves a blank sleeve.
 */
export function SleeveImage({
  id,
  artwork,
  sizes = "140px",
  priority = false,
  className,
}: SleeveImageProps) {
  const [failed, setFailed] = useState(false);

  if (!artwork || failed) {
    return (
      <span
        className={cn("block h-full w-full", className)}
        style={sleeveArt(id)}
      />
    );
  }

  return (
    <Image
      src={artwork}
      alt=""
      fill
      sizes={sizes}
      priority={priority}
      className={cn("object-cover", className)}
      onError={() => setFailed(true)}
    />
  );
}
