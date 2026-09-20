"use client";

import { Download, ExternalLink } from "lucide-react";
import { useMemo, useState } from "react";
import { getConfig } from "@/lib/config-loader";
import { ResumeDownloadLink } from "@/components/tracking/resume-download-link";

interface ResumeProps {
  /**
   * true: render only the PDF preview frame (with its text fallback), for a
   * host page that already renders its own header, description, meta chips,
   * and primary download button (see `/resume`).
   * false (default): render the full self-contained card — header, intro
   * copy, Open PDF / Download links, and the preview frame — for contexts
   * with no surrounding chrome, such as the chat "getResume" tool result.
   */
  embedded?: boolean;
}

function PdfPreviewFrame({
  previewUrl,
  previewUnavailable,
  onPreviewError,
}: {
  previewUrl: string;
  previewUnavailable: boolean;
  onPreviewError: () => void;
}) {
  return (
    <div className="overflow-hidden rounded-[18px] border border-border bg-surface print:block">
      {previewUrl && !previewUnavailable ? (
        <iframe
          src={previewUrl}
          title="Simon Xu resume PDF"
          className="block aspect-[8.5/11] w-full min-h-[70dvh] sm:min-h-0"
          onError={onPreviewError}
        />
      ) : (
        <p className="p-6 text-sm text-muted-foreground">
          The preview is unavailable. Use the links above to open or download the PDF.
        </p>
      )}
    </div>
  );
}

export function Resume({ embedded = false }: ResumeProps) {
  const config = getConfig();
  const [previewUnavailable, setPreviewUnavailable] = useState(false);
  const pdfUrl = config.resume.pdfUrl || config.resume.downloadUrl;
  const previewUrl = useMemo(
    () => (pdfUrl ? `${pdfUrl}#toolbar=0&navpanes=0&view=FitH` : ""),
    [pdfUrl],
  );

  if (embedded) {
    return (
      <PdfPreviewFrame
        previewUrl={previewUrl}
        previewUnavailable={previewUnavailable}
        onPreviewError={() => setPreviewUnavailable(true)}
      />
    );
  }

  return (
    <section
      className="flex flex-col gap-4 rounded-[18px] border border-border bg-surface p-5"
      aria-labelledby="embedded-resume-title"
    >
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="embedded-resume-title" className="font-display text-lg font-semibold text-foreground">
            Resume
          </h2>
          <p className="text-sm text-muted-foreground">
            Experience, education, and selected projects.
          </p>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <a
            href={pdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-accent underline-offset-4 hover:underline"
          >
            Open PDF <ExternalLink aria-hidden="true" className="h-3.5 w-3.5" />
          </a>
          <ResumeDownloadLink
            href={pdfUrl}
            download="Edison-resume-2026.pdf"
            className="inline-flex h-9 items-center gap-1.5 rounded-[10px] bg-accent px-3 text-accent-foreground transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            Download <Download aria-hidden="true" className="h-3.5 w-3.5" />
          </ResumeDownloadLink>
        </div>
      </header>
      <PdfPreviewFrame
        previewUrl={previewUrl}
        previewUnavailable={previewUnavailable}
        onPreviewError={() => setPreviewUnavailable(true)}
      />
    </section>
  );
}

export default Resume;
