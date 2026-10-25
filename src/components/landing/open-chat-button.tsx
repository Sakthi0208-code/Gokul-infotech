"use client";

import { OPEN_CHAT_EVENT } from "../chat/chat-widget";

export function OpenChatButton({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <button type="button" onClick={() => window.dispatchEvent(new Event(OPEN_CHAT_EVENT))} className={className}>
      {children}
    </button>
  );
}
