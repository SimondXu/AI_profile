import Link from "next/link";
import { visibleSections } from "@/content/site-sections";
import { getConfig } from "@/lib/config-loader";

export function SiteFooter() {
  const config = getConfig();
  const sections = visibleSections();

  return (
    <footer className="border-t border-border bg-background text-sm text-muted-foreground">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-5 py-10 sm:px-8 md:flex-row md:items-start md:justify-between">
        <div className="flex flex-col gap-2">
          <p className="font-display text-base font-semibold text-foreground">
            {config.personal.name}
          </p>
          <a
            className="w-fit underline-offset-4 hover:text-foreground hover:underline"
            href={`mailto:${config.personal.email}`}
          >
            {config.personal.email}
          </a>
        </div>

        <ul className="flex flex-wrap gap-x-6 gap-y-2">
          {sections.map((section) => (
            <li key={section.id}>
              <Link
                href={section.href}
                className="underline-offset-4 hover:text-foreground hover:underline"
              >
                {section.label}
              </Link>
            </li>
          ))}
        </ul>

        <div className="flex flex-col gap-2 md:items-end">
          <div className="flex gap-6">
            <a
              className="underline-offset-4 hover:text-foreground hover:underline"
              href={config.social.github}
              target="_blank"
              rel="noopener noreferrer"
            >
              GitHub
            </a>
            <a
              className="underline-offset-4 hover:text-foreground hover:underline"
              href={config.social.linkedin}
              target="_blank"
              rel="noopener noreferrer"
            >
              LinkedIn
            </a>
          </div>
          <p className="text-xs">
            Built with Next.js · press{" "}
            <kbd className="rounded-[6px] border border-border bg-surface px-1.5 py-0.5 font-mono text-[11px] text-foreground">
              ?
            </kbd>{" "}
            for shortcuts
          </p>
        </div>
      </div>
    </footer>
  );
}
