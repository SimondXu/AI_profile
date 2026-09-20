import { z } from "zod";

export interface PhotoItem {
  id: string;
  src: string;
  alt: string;
  width: number;
  height: number;
  caption?: string;
}

const photoItemSchema = z.object({
  id: z.string().min(1),
  src: z
    .string()
    .refine(
      (value) => value.startsWith("/images/photos/") && !value.includes(".."),
      { message: "src must be a local path under /images/photos/" },
    ),
  alt: z.string().min(1),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  caption: z.string().optional(),
});

export const photosSchema = z
  .array(photoItemSchema)
  .superRefine((items, ctx) => {
    const seen = new Set<string>();
    items.forEach((item, index) => {
      if (seen.has(item.id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Duplicate photo id "${item.id}"`,
          path: [index, "id"],
        });
      }
      seen.add(item.id);
    });
  });

const source: ReadonlyArray<PhotoItem> = [];

// Parsed at import so a bad entry fails the build, not a page render.
export const photos: ReadonlyArray<PhotoItem> = photosSchema.parse(source);
