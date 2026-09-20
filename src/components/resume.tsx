"use client";

import { Download, ExternalLink } from "lucide-react";
import { useMemo, useState } from "react";
import { getConfig } from "@/lib/config-loader";
import { ResumeDownloadLink } from "@/components/tracking/resume-download-link";

interface ResumeProps {
  embedded?: boolean;
}

export function Resume({ embedded = false }: ResumeProps) {
  const config = getConfig();
  const [previewUnavailable, setPreviewUnavailable] = useState(false);
  const pdfUrl = config.resume.pdfUrl || config.resume.downloadUrl;
  const previewUrl = useMemo(
    () => (pdfUrl ? `${pdfUrl}#toolbar=0&navpanes=0&view=FitH` : ""),
    [pdfUrl],
  );

  return (
    <section className="quiet-embedded-resume" aria-labelledby="embedded-resume-title">
      <header>
        <div>
          <h2 id="embedded-resume-title">Resume</h2>
          {!embedded ? <p>Experience, education, and selected projects.</p> : null}
        </div>
        <div className="quiet-embedded-resume-links">
          <a href={pdfUrl} target="_blank" rel="noopener noreferrer">
            Open PDF <ExternalLink aria-hidden="true" />
          </a>
          <ResumeDownloadLink href={pdfUrl} download="Edison-resume-2026.pdf">
            Download <Download aria-hidden="true" />
          </ResumeDownloadLink>
        </div>
      </header>
      {previewUrl && !previewUnavailable ? (
        <iframe
          src={previewUrl}
          title="Simon Xu resume PDF"
          className="quiet-resume-preview"
          onError={() => setPreviewUnavailable(true)}
        />
      ) : (
        <p className="quiet-embedded-resume-fallback">
          The preview is unavailable. Use the links above to open or download the PDF.
        </p>
      )}
    </section>
  );
}

export default Resume;
