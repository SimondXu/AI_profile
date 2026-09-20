"use client";

import { ChevronDown } from "lucide-react";
import { useId, useState } from "react";
import { cn } from "@/lib/utils";

interface PdfPreviewProps {
  pdfUrl: string;
  title: string;
}

/**
 * Collapsed by default: the native resume content is the primary view, the
 * PDF is one click away. The iframe only mounts once opened, so the page
 * never pays for the viewer unless asked.
 */
export function PdfPreview({ pdfUrl, title }: PdfPreviewProps) {
  const [open, setOpen] = useState(false);
  const [failed, setFailed] = useState(false);
  const panelId = useId();
  const previewUrl = `${pdfUrl}#toolbar=0&navpanes=0&view=FitH`;

  return (
    <div className="print:hidden">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls={panelId}
        className="inline-flex min-h-11 w-full items-center justify-between rounded-[10px] border border-border bg-surface px-4 text-sm font-medium text-foreground transition-colors hover:border-input focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        {open ? "Hide PDF preview" : "Preview the PDF"}
        <ChevronDown
          className={cn("h-4 w-4 transition-transform", open && "rotate-180")}
          aria-hidden="true"
        />
      </button>
      {open ? (
        <div
          id={panelId}
          className="mt-3 overflow-hidden rounded-[14px] border border-border bg-surface"
        >
          {failed ? (
            <p className="p-4 text-sm text-muted-foreground">
              The inline preview is unavailable here — use Download or Open PDF.
            </p>
          ) : (
            <iframe
              src={previewUrl}
              title={title}
              className="block aspect-[8.5/11] w-full"
              onError={() => setFailed(true)}
            />
          )}
        </div>
      ) : null}
    </div>
  );
}
