import type { Metadata } from "next";
import LandingPage from "@/components/landing/landing-page";

export const metadata: Metadata = {
  alternates: {
    canonical: "/",
  },
};

/**
 * Home page (/): renders the landing page inside the shared public shell.
 *
 * No Suspense boundary here: LandingPage is a synchronous server component
 * (no data fetching, no useSearchParams), so wrapping it only added a
 * "Loading..." fallback that streaming SSR flushes first and then never
 * swaps out for clients that don't run the hydration script (JS-disabled,
 * some crawlers/screen readers) — the whole page was stuck on that fallback.
 */
export default function Home() {
  return <LandingPage />;
}
