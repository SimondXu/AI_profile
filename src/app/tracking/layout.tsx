import type { Metadata } from "next";
import "./tracking.css";

export const metadata: Metadata = {
  title: "Private analytics",
  robots: { index: false, follow: false },
  // Private surface: do not inherit the public canonical from the root layout.
  alternates: { canonical: null },
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function TrackingLayout({ children }: { children: React.ReactNode }) {
  return <div className="tracking-root">{children}</div>;
}
