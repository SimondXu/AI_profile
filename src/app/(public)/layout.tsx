import { AskPalette } from "@/components/site/ask-palette";
import { Atmosphere } from "@/components/site/atmosphere";
import { Shortcuts } from "@/components/site/shortcuts";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteNav } from "@/components/site/site-nav";
import { getConfig } from "@/lib/config-loader";

export default function PublicLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex min-h-screen flex-col">
      <Atmosphere />
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[100] focus:rounded-md focus:bg-accent focus:px-4 focus:py-2 focus:text-accent-foreground focus:outline-2 focus:outline-offset-2 focus:outline-ring"
      >
        Skip to content
      </a>
      <SiteNav />
      <main id="main" tabIndex={-1} className="flex flex-1 flex-col outline-none">
        {children}
      </main>
      <SiteFooter />
      <AskPalette questions={getConfig().aiProfile.featuredQuestions} />
      <Shortcuts />
    </div>
  );
}
