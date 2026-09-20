"use client";

import { Moon, SunMedium } from "lucide-react";
import { useTheme } from "next-themes";
import { MouseEvent, useEffect, useMemo, useState } from "react";
import { flushSync } from "react-dom";
import { cn } from "@/lib/utils";

interface ThemeToggleProps {
  className?: string;
}

type ThemeMode = "light" | "dark";

type ViewTransitionDocument = Document & {
  startViewTransition?: (update: () => void) => {
    ready: Promise<void>;
    finished: Promise<void>;
  };
};

const themeMeta: Record<ThemeMode, { label: string; icon: typeof SunMedium }> =
  {
    light: {
      label: "Light",
      icon: SunMedium,
    },
    dark: {
      label: "Dark",
      icon: Moon,
    },
  };

const revealProps = [
  "--theme-reveal-x",
  "--theme-reveal-y",
  "--theme-reveal-r",
] as const;

function applyThemeClass(root: HTMLElement, theme: ThemeMode) {
  // Mirrors what next-themes does in its effect so the View Transition
  // snapshot already shows the new theme when the update callback returns.
  root.classList.remove("light", "dark");
  root.classList.add(theme);
  root.style.colorScheme = theme;
}

export function ThemeToggle({ className }: ThemeToggleProps) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const activeTheme = useMemo<ThemeMode>(() => {
    if (!mounted) {
      return "dark";
    }

    return resolvedTheme === "light" ? "light" : "dark";
  }, [mounted, resolvedTheme]);

  const nextTheme: ThemeMode = activeTheme === "dark" ? "light" : "dark";
  const ActiveIcon = themeMeta[activeTheme].icon;

  const handleToggle = (event: MouseEvent<HTMLButtonElement>) => {
    const doc = document as ViewTransitionDocument;
    const reducedMotion =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (typeof doc.startViewTransition !== "function" || reducedMotion) {
      setTheme(nextTheme);
      return;
    }

    const root = document.documentElement;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    const radius = Math.hypot(
      Math.max(x, window.innerWidth - x),
      Math.max(y, window.innerHeight - y),
    );

    root.style.setProperty("--theme-reveal-x", `${x}px`);
    root.style.setProperty("--theme-reveal-y", `${y}px`);
    root.style.setProperty("--theme-reveal-r", `${radius}px`);
    root.dataset.themeReveal = "";

    const cleanup = () => {
      delete root.dataset.themeReveal;
      revealProps.forEach((prop) => root.style.removeProperty(prop));
    };

    try {
      const transition = doc.startViewTransition(() => {
        flushSync(() => setTheme(nextTheme));
        applyThemeClass(root, nextTheme);
      });
      // `ready` rejects (InvalidStateError) when the tab is hidden or a second
      // transition starts; the theme is already applied, so only avoid the
      // unhandled-rejection noise.
      transition.ready.catch(() => {});
      transition.finished.then(cleanup, cleanup);
    } catch {
      cleanup();
      setTheme(nextTheme);
    }
  };

  return (
    <button
      type="button"
      onClick={handleToggle}
      aria-label={`Switch to ${nextTheme} mode`}
      title={`Switch to ${nextTheme} mode`}
      className={cn(
        "inline-flex h-11 w-11 items-center justify-center rounded-[10px] text-muted-foreground transition-colors hover:bg-surface-subtle hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        className,
      )}
    >
      <ActiveIcon className="h-[18px] w-[18px]" aria-hidden="true" />
    </button>
  );
}
