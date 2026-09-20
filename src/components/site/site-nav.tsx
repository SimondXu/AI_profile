"use client";

import { Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { visibleSections } from "@/content/site-sections";
import { cn } from "@/lib/utils";

const sections = visibleSections();

function isActive(pathname: string, href: string) {
  if (href === "/") {
    return pathname === "/";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

const linkClass =
  "inline-flex min-h-11 items-center rounded-[10px] text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring aria-[current=page]:font-medium aria-[current=page]:text-foreground";

export function SiteNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Close on route change.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };

    // The panel is hidden by CSS from md up; drop the scroll lock too.
    const desktop = window.matchMedia("(min-width: 768px)");
    const handleDesktop = (event: MediaQueryListEvent) => {
      if (event.matches) {
        setOpen(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    desktop.addEventListener("change", handleDesktop);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
      desktop.removeEventListener("change", handleDesktop);
    };
  }, [open]);

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link
          href="/"
          className="inline-flex min-h-11 items-center rounded-[10px] font-display text-base font-semibold tracking-tight text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          Simon Xu
        </Link>

        <nav
          className="hidden items-center gap-1 md:flex"
          aria-label="Primary navigation"
        >
          {sections
            .filter((section) => section.id !== "home")
            .map((section) => {
              const active = isActive(pathname, section.href);
              return (
                <Link
                  key={section.id}
                  href={section.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    linkClass,
                    "px-3 aria-[current=page]:underline aria-[current=page]:decoration-accent aria-[current=page]:decoration-2 aria-[current=page]:underline-offset-8",
                  )}
                >
                  {section.label}
                </Link>
              );
            })}
          <ThemeToggle className="ml-1" />
        </nav>

        <div className="flex items-center gap-1 md:hidden">
          <ThemeToggle />
          <button
            ref={buttonRef}
            type="button"
            aria-expanded={open}
            aria-controls={menuId}
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((value) => !value)}
            className="inline-flex h-11 w-11 items-center justify-center rounded-[10px] text-foreground transition-colors hover:bg-surface-subtle focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            {open ? (
              <X className="h-5 w-5" aria-hidden="true" />
            ) : (
              <Menu className="h-5 w-5" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      {open ? (
        <nav
          id={menuId}
          aria-label="Primary navigation"
          className="border-t border-border bg-background md:hidden"
        >
          <ul className="mx-auto flex w-full max-w-6xl flex-col px-4 py-2 sm:px-6">
            {sections.map((section) => {
              const active = isActive(pathname, section.href);
              return (
                <li key={section.id}>
                  <Link
                    href={section.href}
                    aria-current={active ? "page" : undefined}
                    onClick={() => setOpen(false)}
                    className={cn(
                      linkClass,
                      "w-full px-3 py-2 text-base aria-[current=page]:bg-accent-soft",
                    )}
                  >
                    {section.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      ) : null}
    </header>
  );
}
