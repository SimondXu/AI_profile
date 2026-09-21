import { z } from "zod";
import crateData from "./music-crate.json";

/** Where a record's audio comes from. */
export type MusicSource =
  { kind: "file"; src: string } | { kind: "youtube"; videoId: string };

export interface MusicSelection {
  id: string;
  title: string;
  artist: string;
  album?: string;
  note?: string;
  externalUrl?: string;
  /** Playable source; entries without one are listed but can't go on the deck. */
  source?: MusicSource;
}

/** The crate itself: real metadata of the playlist these records came from. */
export interface MusicCrate {
  name: string;
  /** ISO date the playlist was created. */
  createdAt: string;
  records: ReadonlyArray<MusicSelection>;
}

const musicSourceSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("file"),
    src: z
      .string()
      .refine((value) => value.startsWith("/audio/") && !value.includes(".."), {
        message: "file src must be a local path under /audio/",
      }),
  }),
  z.object({
    kind: z.literal("youtube"),
    videoId: z
      .string()
      .regex(/^[A-Za-z0-9_-]{11}$/, "videoId must be an 11-char YouTube id"),
  }),
]);

const musicSelectionSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  artist: z.string().min(1),
  album: z.string().optional(),
  note: z.string().optional(),
  externalUrl: z
    .string()
    .url()
    .refine((value) => value.startsWith("https://"), {
      message: "externalUrl must be an https:// URL",
    })
    .optional(),
  source: musicSourceSchema.optional(),
});

export const musicSelectionsSchema = z
  .array(musicSelectionSchema)
  .superRefine((items, ctx) => {
    const seen = new Set<string>();
    items.forEach((item, index) => {
      if (seen.has(item.id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Duplicate music selection id "${item.id}"`,
          path: [index, "id"],
        });
      }
      seen.add(item.id);
    });
  });

const musicCrateSchema = z.object({
  name: z.string().min(1),
  createdAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  records: musicSelectionsSchema,
});

// Parsed at import so a bad entry fails the build, not a page render.
export const musicCrate: MusicCrate = musicCrateSchema.parse(crateData);

export const musicSelections: ReadonlyArray<MusicSelection> =
  musicCrate.records;

export function isPlayable(
  selection: MusicSelection,
): selection is MusicSelection & { source: MusicSource } {
  return selection.source !== undefined;
}
