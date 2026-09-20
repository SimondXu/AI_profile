import type { Metadata } from "next";
import { Suspense } from "react";
import LandingPage from "@/components/landing/landing-page";

export const metadata: Metadata = {
  alternates: {
    canonical: "/",
  },
};

/**
 * Home page (/): renders the landing page inside the shared public shell.
 */
export default function Home() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[60vh] items-center justify-center">
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      }
    >
      <LandingPage />
    </Suspense>
  );
}
