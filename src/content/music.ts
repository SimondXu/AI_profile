import { z } from "zod";

export interface MusicSelection {
  id: string;
  title: string;
  artist: string;
  note?: string;
  externalUrl?: string;
}

const musicSelectionSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  artist: z.string().min(1),
  note: z.string().optional(),
  externalUrl: z
    .string()
    .url()
    .refine((value) => value.startsWith("https://"), {
      message: "externalUrl must be an https:// URL",
    })
    .optional(),
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

const source: ReadonlyArray<MusicSelection> = [];

// Parsed at import so a bad entry fails the build, not a page render.
export const musicSelections: ReadonlyArray<MusicSelection> =
  musicSelectionsSchema.parse(source);
