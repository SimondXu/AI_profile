import type { Metadata } from "next";
import { Suspense } from "react";
import Chat from "@/components/chat/chat";

export const metadata: Metadata = {
  title: "Ask",
  description:
    "Ask questions about Simon Xu's experience, projects, and skills, answered from his resume and public profile.",
  alternates: {
    canonical: "/chat",
  },
};

/**
 * Ask page (/chat). Supports `?q=<encoded_query>` for an initial message;
 * the query is read client-side inside <Chat/>, hence the Suspense boundary.
 */
export default function ChatPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[60vh] items-center justify-center">
          <p className="text-sm text-muted-foreground">Loading chat...</p>
        </div>
      }
    >
      <Chat />
    </Suspense>
  );
}
