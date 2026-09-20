import type { Metadata } from "next";
import {
  Bricolage_Grotesque,
  IBM_Plex_Sans,
  JetBrains_Mono,
} from "next/font/google";
import { Suspense } from "react";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { PageViewTracker } from "@/components/tracking/page-view-tracker";
import "./globals.css";

const displayFont = Bricolage_Grotesque({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-bricolage",
});

const sansFont = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
  variable: "--font-plex-sans",
});

const monoFont = JetBrains_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-jetbrains",
});

const siteUrl = "https://www.simondxu.com";
const siteTitle = "Simon Xu | Software Engineer, AI/ML";
const siteDescription =
  "Portfolio of Simon Xu, a software engineer building real-time AI training, agent evaluation, and enterprise retrieval systems.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: siteTitle,
    template: "%s | Simon Xu",
  },
  description: siteDescription,
  keywords: [
    "Simon Xu",
    "Software Engineer",
    "Full-stack Developer",
    "AI Engineer",
    "Generative AI",
    "Multi-Agent Systems",
    "LLM Evaluation",
    "RAG",
    "Distributed Systems",
  ],
  authors: [
    {
      name: "Simon Xu",
      url: `${siteUrl}/`,
    },
  ],
  creator: "Simon Xu",
  publisher: "Simon Xu",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "/",
    title: siteTitle,
    description:
      "Production AI experience and projects spanning agent runtimes, evaluation, memory, and enterprise retrieval.",
    siteName: "Simon Xu",
    images: ["/portfolio.png"],
  },
  twitter: {
    card: "summary",
    title: siteTitle,
    description:
      "Production AI experience and projects spanning agent runtimes, evaluation, memory, and enterprise retrieval.",
    creator: "@edisonwhale",
    site: "@edisonwhale",
  },
  icons: {
    icon: [
      {
        url: "/favicon.ico",
        type: "image/x-icon",
      },
    ],
    shortcut: "/favicon.ico",
  },
  manifest: "/manifest.json",
  alternates: {
    canonical: "/",
  },
  category: "technology",
  classification: "Portfolio Website",
};

const personJsonLd = {
  "@context": "https://schema.org",
  "@type": "Person",
  name: "Simon Xu",
  jobTitle: "Software Engineer",
  url: `${siteUrl}/`,
  sameAs: [
    "https://github.com/SimondXu",
    "https://linkedin.com/in/edisonwhale",
  ],
  worksFor: {
    "@type": "Organization",
    name: "Highmark Health",
  },
  alumniOf: {
    "@type": "Organization",
    name: "Georgia Institute of Technology",
  },
  knowsAbout: [
    "Python Development",
    "AI Engineering",
    "Machine Learning",
    "Web Development",
    "Automation",
    "Full Stack Development",
  ],
  description:
    "Software engineer building real-time AI training, agent evaluation, and enterprise retrieval systems.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${displayFont.variable} ${sansFont.variable} ${monoFont.variable}`}
    >
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(personJsonLd) }}
        />
      </head>
      <body className="min-h-screen bg-background font-sans text-foreground antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          disableTransitionOnChange
          enableSystem={false}
          storageKey="portfolio-theme"
        >
          {children}
          <Suspense fallback={null}>
            <PageViewTracker />
          </Suspense>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
