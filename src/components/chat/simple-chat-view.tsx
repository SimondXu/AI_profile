'use client';

import { isToolOrDynamicToolUIPart } from 'ai';
import { UIMessage } from '@ai-sdk/react';
import ChatMessageContent from './chat-message-content';
import ToolRenderer from './tool-renderer';
import MessageLoading from '@/components/ui/chat/message-loading';

interface SimplifiedChatViewProps {
  message: UIMessage;
  isLoading: boolean;
}

export function SimplifiedChatView({
  message,
  isLoading,
}: SimplifiedChatViewProps) {
  if (message.role !== 'assistant') return null;

  // Extract tool invocations that are in "output-available" state
  const toolInvocations =
    message.parts
      ?.filter(
        (part) =>
          isToolOrDynamicToolUIPart(part) &&
          part.state === 'output-available'
      ) || [];

  // Extract text content from parts
  const textContent = message.parts
    ?.filter((part) => part.type === 'text')
    .map((part) => part.type === 'text' ? part.text : '')
    .join(' ') || '';

  // Check if we have meaningful text content (more than just confirmations)
  const hasTextContent = textContent.trim().length > 0;
  const hasTools = toolInvocations.length > 0;

  // Show text content if we have meaningful content, even with tools present
  const showTextContent = hasTextContent;

  return (
    <div className="w-full max-w-prose">
      {/* Tool invocation result - displayed at the top */}
      {hasTools && (
        <div className="mb-4 w-full">
          <ToolRenderer
            toolInvocations={toolInvocations}
            messageId={message.id || 'current-msg'}
          />
        </div>
      )}

      {/* Text content - only show if meaningful and not redundant with tools */}
      {showTextContent && (
        <div className="w-full text-foreground">
          <ChatMessageContent message={message} />
        </div>
      )}

      {/* A subtle indicator while this message is still streaming */}
      {isLoading && (
        <div className="mt-2 flex items-center gap-2 text-muted-foreground">
          <MessageLoading />
        </div>
      )}
    </div>
  );
}
