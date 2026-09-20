import type { ReactNode } from "react";

interface SectionHeaderProps {
  eyebrow: string;
  title: string;
  action?: ReactNode;
  /** Applied to the H2 so a parent `<section aria-labelledby>` can target it. */
  titleId?: string;
}

/**
 * Shared section title block for the homepage: mono eyebrow, H2 title, and
 * an optional right-aligned action link (shown from `sm:` up).
 */
export function SectionHeader({ eyebrow, title, action, titleId }: SectionHeaderProps) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-2">
      <div className="flex flex-col gap-2">
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">
          {eyebrow}
        </p>
        <h2
          id={titleId}
          className="font-display text-[32px] font-semibold leading-[1.15] tracking-tight text-foreground"
        >
          {title}
        </h2>
      </div>
      {action ? <div className="hidden sm:block">{action}</div> : null}
    </div>
  );
}
