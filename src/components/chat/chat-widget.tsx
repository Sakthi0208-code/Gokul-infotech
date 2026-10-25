"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CHAT_TOPICS, INITIAL_TOPIC_COUNT, type ChatTopic } from "@/lib/chat-topics";
import { getJson, postJson } from "@/lib/client-api";
import { MAX_CHAT_MESSAGE_LENGTH, MAX_CHAT_MESSAGES } from "@/lib/validation";
import type { ChatMessage, ChatReply, ChatSuccessResponse } from "@/types/chat";
import { STATUS_LABELS, type PublicTicketStatus } from "@/types/support-ticket";
import { TicketPanel } from "./ticket-panel";

export const OPEN_CHAT_EVENT = "support-chat:open";

interface UiMessage {
  id: number;
  role: "user" | "assistant";
  content: string;
  reply?: ChatReply; // only for AI replies
  local?: boolean; // shown in the chat but never sent to the AI (e.g. admin login)
}

type Mode = "chat" | "admin-code" | "ticket";

const NOT_FIXED_MESSAGE = "I tried that, but the problem is still happening.";
const ADMIN_TRIGGER = /^\/?admin(\s+(login|access|dashboard))?$/i;
// "status GI-7K3M9Q", "check GI-7K3M9Q" or just "GI-7K3M9Q"
const STATUS_TRIGGER = /^(?:(?:status|check|ticket)\s+)?(GI-[A-Z0-9]{6})$/i;

function describeTicket(t: PublicTicketStatus): string {
  const head = `Ticket ${t.id} (${t.category}, ${t.priority} priority): ${STATUS_LABELS[t.status]}.`;
  if (t.status === "resolved") return `${head}\n\nResolution from our support team:\n${t.resolution}`;
  if (t.status === "in_progress") return `${head} Our support team is working on it.`;
  return `${head} It is waiting for our support team to pick it up.`;
}


// What we send back to the API for an assistant turn: its message plus steps.
function toApiContent(m: UiMessage): string {
  if (m.role === "user" || !m.reply) return m.content;
  const steps = m.reply.steps.map((s, i) => `${i + 1}. ${s}`).join("\n");
  return steps ? `${m.reply.message}\n${steps}` : m.reply.message;
}

// Builds the AI conversation: skips local-only messages, keeps the most recent
// turns, and makes sure it starts with a customer message.
function toApiHistory(messages: UiMessage[]): ChatMessage[] {
  const history = messages.filter((m) => !m.local).map((m) => ({ role: m.role, content: toApiContent(m) }));
  while (history.length > MAX_CHAT_MESSAGES) history.shift();
  while (history.length > 0 && history[0].role !== "user") history.shift();
  return history;
}

export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("chat");
  const [messages, setMessages] = useState<UiMessage[]>([]);
  const [input, setInput] = useState("");
  const [code, setCode] = useState("");
  const [codeError, setCodeError] = useState<string | null>(null);
  const [unlocking, setUnlocking] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [resolved, setResolved] = useState(false);
  const [ticketId, setTicketId] = useState<string | null>(null);
  const [showAllTopics, setShowAllTopics] = useState(false);
  const [topicsOpen, setTopicsOpen] = useState(false);
  const nextId = useRef(1);
  const inFlight = useRef(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const codeRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);

  const addLocal = useCallback((role: UiMessage["role"], content: string) => {
    setMessages((prev) => [...prev, { id: nextId.current++, role, content, local: true }]);
  }, []);

  const startAdminLogin = useCallback(
    (prompt: string) => {
      addLocal("assistant", prompt);
      setMode("admin-code");
      setCode("");
      setCodeError(null);
    },
    [addLocal],
  );

  // Open from other buttons on the page, or in admin-login mode after a
  // redirect from /admin (/?admin=login).
  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener(OPEN_CHAT_EVENT, handler);

    const params = new URLSearchParams(window.location.search);
    if (params.get("admin") === "login") {
      params.delete("admin");
      const query = params.toString();
      window.history.replaceState(null, "", `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`);
      // Defer state updates until after the first paint.
      const t = setTimeout(() => {
        setOpen(true);
        startAdminLogin("The assistance dashboard is for admins only. Please enter your admin access code below.");
      }, 0);
      return () => {
        clearTimeout(t);
        window.removeEventListener(OPEN_CHAT_EVENT, handler);
      };
    }
    return () => window.removeEventListener(OPEN_CHAT_EVENT, handler);
  }, [startAdminLogin]);

  useEffect(() => {
    if (!open) return;
    if (mode === "chat") inputRef.current?.focus();
    if (mode === "admin-code") codeRef.current?.focus();
  }, [open, mode]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading, error, mode]);

  const close = useCallback(() => {
    setOpen(false);
    setTimeout(() => toggleRef.current?.focus(), 0);
  }, []);

  const requestReply = useCallback(async (history: UiMessage[]) => {
    if (inFlight.current) return;
    inFlight.current = true;
    setLoading(true);
    setError(null);

    const res = await postJson<ChatSuccessResponse>("/api/chat", { messages: toApiHistory(history) });
    inFlight.current = false;
    setLoading(false);

    if (!res.ok) {
      setError(res.message);
      return;
    }
    setMessages((prev) => [
      ...prev,
      { id: nextId.current++, role: "assistant", content: res.data.reply.message, reply: res.data.reply },
    ]);
  }, []);

  function send(text: string) {
    const content = text.trim();
    if (!content || inFlight.current) return;
    if (content.length > MAX_CHAT_MESSAGE_LENGTH) {
      setError(`Please keep messages under ${MAX_CHAT_MESSAGE_LENGTH.toLocaleString()} characters.`);
      return;
    }
    setInput("");
    setError(null);

    // Ticket status lookups are answered from our own records, not the AI.
    const statusMatch = content.match(STATUS_TRIGGER);
    if (statusMatch) {
      addLocal("user", content);
      void checkStatus(statusMatch[1].toUpperCase());
      return;
    }

    // "admin" starts the secure login flow. It is never sent to the AI.
    if (ADMIN_TRIGGER.test(content)) {
      addLocal("user", content);
      startAdminLogin("Admin access: enter your access code below. It is checked securely on our server and never sent to the AI.");
      return;
    }

    const next = [...messages, { id: nextId.current++, role: "user" as const, content }];
    setMessages(next);
    setResolved(false);
    void requestReply(next);
  }

  async function checkStatus(id: string) {
    inFlight.current = true;
    setLoading(true);
    const res = await getJson<{ ticket: PublicTicketStatus }>(`/api/tickets/${encodeURIComponent(id)}`);
    inFlight.current = false;
    setLoading(false);
    addLocal("assistant", res.ok ? describeTicket(res.data.ticket) : res.message);
  }

  function onTicketCreated(ticket: PublicTicketStatus) {
    setTicketId(ticket.id);
    addLocal(
      "assistant",
      `I've created support ticket ${ticket.id} (${ticket.priority} priority). Our support team will pick it up from their dashboard. Type "status ${ticket.id}" any time to check progress.`,
    );
  }

  async function unlock() {
    if (unlocking) return;
    if (!code.trim()) {
      setCodeError("Please enter the access code.");
      return;
    }
    setUnlocking(true);
    setCodeError(null);
    const res = await postJson<{ ok: true; redirectTo: string }>("/api/admin/login", { code });
    setUnlocking(false);
    setCode("");
    if (!res.ok) {
      setCodeError(res.message);
      codeRef.current?.focus();
      return;
    }
    addLocal("assistant", "Access granted. Opening the assistance dashboard…");
    setMode("chat");
    setTimeout(() => window.location.assign(res.data.redirectTo || "/admin"), 700);
  }

  function cancelAdmin() {
    setMode("chat");
    setCode("");
    setCodeError(null);
    addLocal("assistant", "Admin login cancelled. How can I help you today?");
  }

  function markFixed() {
    setResolved(true);
    setMessages((prev) => [
      ...prev,
      { id: nextId.current++, role: "user", content: "That fixed it, thanks!" },
      {
        id: nextId.current++,
        role: "assistant",
        content: "Great, I'm glad that's sorted! If anything else comes up, just send another message.",
      },
    ]);
  }

  function markNotFixed() {
    setFailedAttempts((n) => n + 1);
    send(NOT_FIXED_MESSAGE);
  }

  function newChat() {
    setMessages([]);
    setInput("");
    setError(null);
    setFailedAttempts(0);
    setResolved(false);
    setTicketId(null);
    setMode("chat");
    setCode("");
    setCodeError(null);
  }

  const aiMessages = messages.filter((m) => !m.local);
  const lastAi = aiMessages.at(-1);
  const lastAssistant = [...aiMessages].reverse().find((m) => m.role === "assistant");
  const lastIsAssistant = lastAi?.role === "assistant" && messages.at(-1) === lastAi;
  const hasCustomerMessage = aiMessages.some((m) => m.role === "user");
  const suggestEscalation =
    mode === "chat" && !resolved && !ticketId && lastIsAssistant && (lastAssistant?.reply?.status === "escalate" || failedAttempts >= 2);
  const askIfFixed =
    mode === "chat" && !resolved && !suggestEscalation && lastIsAssistant && lastAssistant?.reply?.status === "troubleshooting";

  return (
    <>
      {!open && (
        <button
          ref={toggleRef}
          type="button"
          onClick={() => setOpen(true)}
          aria-expanded={open}
          aria-controls="support-chat"
          className="group fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-full bg-gradient-to-r from-emerald-500 to-teal-600 py-3 pl-3 pr-5 text-sm font-semibold text-white shadow-2xl shadow-emerald-600/40 transition-transform hover:-translate-y-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600"
        >
          <span className="relative flex h-9 w-9 items-center justify-center rounded-full bg-white/20">
            <span aria-hidden="true" className="absolute inset-0 animate-ping-slow rounded-full bg-white/40" />
            <svg aria-hidden="true" viewBox="0 0 24 24" className="relative h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h8M8 14h5m-9 6 2.5-3H18a3 3 0 0 0 3-3V7a3 3 0 0 0-3-3H6a3 3 0 0 0-3 3v7a3 3 0 0 0 1 2.2V20Z" />
            </svg>
          </span>
          Need help?
        </button>
      )}

      {open && (
        <div
          id="support-chat"
          role="dialog"
          aria-label="AI support assistant"
          onKeyDown={(e) => {
            if (e.key === "Escape") close();
          }}
          className="fixed inset-0 z-50 flex origin-bottom-right animate-scale-in flex-col overflow-hidden bg-white sm:inset-auto sm:bottom-5 sm:right-5 sm:h-[min(660px,calc(100vh-2.5rem))] sm:w-[410px] sm:rounded-3xl sm:border sm:border-slate-200 sm:shadow-2xl sm:shadow-slate-900/20"
        >
          {/* Header */}
          <div className="relative overflow-hidden bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-700 px-4 py-4 text-white">
            <div aria-hidden="true" className="absolute -right-10 -top-10 h-32 w-32 animate-blob rounded-full bg-white/10 blur-2xl" />
            <div className="relative flex items-center gap-3">
              <span aria-hidden="true" className="relative flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-sm font-bold">
                AI
                <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-teal-600 bg-emerald-300" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">Gokul Infocare Assistant</p>
                <p className="text-xs text-emerald-50/90">Powered by Gemini · a human can take over</p>
              </div>
              {messages.length > 0 && (
                <button
                  type="button"
                  onClick={newChat}
                  disabled={loading || unlocking}
                  className="rounded-md px-2 py-1 text-xs font-medium text-white/90 hover:bg-white/15 disabled:opacity-50"
                >
                  New chat
                </button>
              )}
              <button
                type="button"
                onClick={close}
                aria-label="Close chat"
                className="rounded-md p-1 text-white/90 hover:bg-white/15 focus-visible:outline-2 focus-visible:outline-white"
              >
                <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" d="M6 6l12 12M18 6 6 18" />
                </svg>
              </button>
            </div>
          </div>

          {mode === "ticket" ? (
            <TicketPanel
              messages={toApiHistory(messages)}
              escalationReason={lastAssistant?.reply?.escalation_reason || undefined}
              onCreated={onTicketCreated}
              onBack={() => setMode("chat")}
            />
          ) : (
            <>
              {/* Messages */}
              <div ref={listRef} aria-live="polite" className="flex-1 space-y-3 overflow-y-auto bg-gradient-to-b from-slate-50 to-white px-4 py-4">
                <Bubble role="assistant">
                  <p>
                    Hi! 👋 I&apos;m the Gokul Infocare AI assistant. Tell me what&apos;s going wrong and I&apos;ll suggest steps to
                    fix it. If I can&apos;t, I&apos;ll raise a support ticket for our team.
                  </p>
                </Bubble>

                {messages.length === 0 && (
                  <div className="pt-1">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Common issues</p>
                    <TopicGrid
                      topics={showAllTopics ? CHAT_TOPICS : CHAT_TOPICS.slice(0, INITIAL_TOPIC_COUNT)}
                      onPick={(t) => send(t.message)}
                    />
                    <button
                      type="button"
                      onClick={() => setShowAllTopics((v) => !v)}
                      aria-expanded={showAllTopics}
                      className="mt-2 text-xs font-semibold text-emerald-700 hover:underline"
                    >
                      {showAllTopics ? "Show fewer" : `More issues (${CHAT_TOPICS.length - INITIAL_TOPIC_COUNT})`}
                    </button>
                    <p className="mt-2 text-xs text-slate-500">Or describe your problem in your own words below.</p>
                  </div>
                )}

                {messages.map((m) => (
                  <Bubble key={m.id} role={m.role}>
                    <p className="whitespace-pre-wrap">{m.content}</p>
                    {m.reply && m.reply.steps.length > 0 && (
                      <ol className="mt-2 space-y-1.5">
                        {m.reply.steps.map((step, i) => (
                          <li key={i} className="flex gap-2">
                            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-[11px] font-bold text-emerald-800">
                              {i + 1}
                            </span>
                            <span>{step}</span>
                          </li>
                        ))}
                      </ol>
                    )}
                  </Bubble>
                ))}

                {loading && (
                  <div role="status" aria-label="Assistant is typing" className="flex w-fit animate-pop-in items-center gap-1 rounded-2xl rounded-bl-sm border border-slate-200 bg-white px-4 py-3">
                    {[0, 1, 2].map((i) => (
                      <span key={i} aria-hidden="true" className="h-2 w-2 animate-bounce rounded-full bg-emerald-500" style={{ animationDelay: `${i * 150}ms` }} />
                    ))}
                  </div>
                )}

                {error && (
                  <div role="alert" className="animate-pop-in rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                    <p>{error}</p>
                    {lastAi?.role === "user" && (
                      <button
                        type="button"
                        onClick={() => void requestReply(messages)}
                        className="mt-2 rounded-md border border-red-300 bg-white px-2.5 py-1 text-xs font-semibold text-red-800 hover:bg-red-100"
                      >
                        Try again
                      </button>
                    )}
                  </div>
                )}

                {askIfFixed && !loading && (
                  <div className="animate-pop-in rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                    <p className="text-sm font-medium text-slate-800">Did this solve your problem?</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={markFixed}
                        className="rounded-full bg-gradient-to-r from-emerald-500 to-teal-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm transition-transform hover:-translate-y-0.5"
                      >
                        Yes, it&apos;s fixed
                      </button>
                      <button
                        type="button"
                        onClick={markNotFixed}
                        className="rounded-full border border-slate-300 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        No, still not working
                      </button>
                    </div>
                  </div>
                )}

                {suggestEscalation && !loading && (
                  <div className="animate-pop-in rounded-xl border border-amber-300 bg-gradient-to-br from-amber-50 to-orange-50 p-3">
                    <p className="text-sm font-semibold text-amber-900">Our support team can take it from here.</p>
                    {lastAssistant?.reply?.escalation_reason && (
                      <p className="mt-1 text-xs text-amber-900">{lastAssistant.reply.escalation_reason}</p>
                    )}
                    <button
                      type="button"
                      onClick={() => setMode("ticket")}
                      className="mt-2 rounded-full bg-gradient-to-r from-emerald-500 to-teal-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm transition-transform hover:-translate-y-0.5"
                    >
                      Create support ticket
                    </button>
                  </div>
                )}
              </div>

              {/* Composer */}
              {mode === "admin-code" ? (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    void unlock();
                  }}
                  className="animate-pop-in border-t border-slate-200 bg-slate-900 p-3 text-white"
                >
                  <label htmlFor="admin-code" className="flex items-center gap-1.5 text-xs font-semibold text-emerald-200">
                    <svg aria-hidden="true" viewBox="0 0 20 20" className="h-3.5 w-3.5" fill="currentColor">
                      <path d="M10 1a4 4 0 0 0-4 4v3H5a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2h-1V5a4 4 0 0 0-4-4Zm-2 7V5a2 2 0 1 1 4 0v3H8Z" />
                    </svg>
                    Admin access code
                  </label>
                  <div className="mt-2 flex gap-2">
                    <input
                      id="admin-code"
                      ref={codeRef}
                      type="password"
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      autoComplete="off"
                      maxLength={200}
                      aria-invalid={codeError ? true : undefined}
                      aria-describedby={codeError ? "admin-code-error" : undefined}
                      className="min-w-0 flex-1 rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm tracking-widest text-white placeholder:text-white/40 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/40"
                      placeholder="••••••••"
                    />
                    <button
                      type="submit"
                      disabled={unlocking}
                      className="rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 px-4 py-2 text-sm font-semibold disabled:opacity-60"
                    >
                      {unlocking ? "Checking…" : "Unlock"}
                    </button>
                  </div>
                  {codeError && (
                    <p id="admin-code-error" role="alert" className="mt-2 text-xs font-medium text-rose-300">
                      {codeError}
                    </p>
                  )}
                  <button type="button" onClick={cancelAdmin} disabled={unlocking} className="mt-2 text-xs text-white/70 underline-offset-2 hover:underline">
                    Cancel
                  </button>
                </form>
              ) : (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    send(input);
                  }}
                  className="relative border-t border-slate-200 bg-white p-3"
                >
                  {topicsOpen && (
                    <div
                      id="chat-topics"
                      className="absolute inset-x-3 bottom-full mb-2 max-h-72 animate-pop-in overflow-y-auto rounded-2xl border border-slate-200 bg-white p-3 shadow-xl"
                    >
                      <div className="mb-2 flex items-center justify-between">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Common issues</p>
                        <button type="button" onClick={() => setTopicsOpen(false)} className="text-xs text-slate-500 hover:text-slate-900">
                          Close
                        </button>
                      </div>
                      <TopicGrid
                        topics={CHAT_TOPICS}
                        onPick={(t) => {
                          setTopicsOpen(false);
                          send(t.message);
                        }}
                      />
                    </div>
                  )}
                  <div className="flex items-end gap-2 rounded-2xl border border-slate-300 bg-white p-1.5 pl-3 transition-shadow focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500/25">
                    <button
                      type="button"
                      onClick={() => setTopicsOpen((v) => !v)}
                      aria-expanded={topicsOpen}
                      aria-controls="chat-topics"
                      aria-label="Common issues"
                      title="Common issues"
                      className={`-ml-1.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-colors ${
                        topicsOpen ? "bg-emerald-100 text-emerald-800" : "text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                      }`}
                    >
                      <svg aria-hidden="true" viewBox="0 0 20 20" className="h-5 w-5" fill="currentColor">
                        <path d="M3 4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V4Zm8 0a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1h-4a1 1 0 0 1-1-1V4Zm-8 8a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-4Zm8 0a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1h-4a1 1 0 0 1-1-1v-4Z" />
                      </svg>
                    </button>
                    <label htmlFor="chat-input" className="sr-only">
                      Describe your problem
                    </label>
                    <textarea
                      id="chat-input"
                      ref={inputRef}
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          send(input);
                        }
                      }}
                      rows={1}
                      maxLength={MAX_CHAT_MESSAGE_LENGTH}
                      placeholder="Describe your problem…"
                      className="max-h-32 min-h-9 flex-1 resize-none bg-transparent py-1.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
                    />
                    <button
                      type="submit"
                      disabled={loading || input.trim().length === 0}
                      aria-label="Send"
                      className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white transition-transform enabled:hover:scale-105 disabled:cursor-not-allowed disabled:from-slate-300 disabled:to-slate-300"
                    >
                      <svg aria-hidden="true" viewBox="0 0 20 20" className="h-4 w-4" fill="currentColor">
                        <path d="M3.1 2.3a.75.75 0 0 0-1 .9l1.9 6.1H11a.75.75 0 0 1 0 1.5H4l-1.9 6.1a.75.75 0 0 0 1 .9l15-7.25a.75.75 0 0 0 0-1.35L3.1 2.3Z" />
                      </svg>
                    </button>
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-2 text-xs text-slate-500">
                    <span>AI can make mistakes.</span>
                    {hasCustomerMessage && !ticketId && (
                      <button
                        type="button"
                        onClick={() => setMode("ticket")}
                        disabled={loading}
                        className="font-medium text-emerald-800 underline-offset-2 hover:underline disabled:opacity-50"
                      >
                        Contact a human
                      </button>
                    )}
                  </div>
                </form>
              )}
            </>
          )}
        </div>
      )}
    </>
  );
}

function TopicGrid({ topics, onPick }: { topics: ChatTopic[]; onPick: (t: ChatTopic) => void }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {topics.map((t, i) => (
        <button
          key={t.label}
          type="button"
          onClick={() => onPick(t)}
          style={{ animationDelay: `${Math.min(i, 11) * 40}ms` }}
          className="flex animate-pop-in items-center gap-2 rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-left text-xs font-medium text-slate-800 shadow-sm transition-all hover:-translate-y-0.5 hover:border-emerald-400 hover:bg-emerald-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600"
        >
          <span aria-hidden="true" className="text-base">
            {t.icon}
          </span>
          <span>{t.label}</span>
        </button>
      ))}
    </div>
  );
}

function Bubble({ role, children }: { role: "user" | "assistant"; children: React.ReactNode }) {
  const isUser = role === "user";
  return (
    <div className={`flex animate-pop-in ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed shadow-sm ${
          isUser
            ? "rounded-br-sm bg-gradient-to-br from-emerald-500 to-teal-600 text-white"
            : "rounded-bl-sm border border-slate-200 bg-white text-slate-800"
        }`}
      >
        <span className="sr-only">{isUser ? "You said: " : "Assistant said: "}</span>
        {children}
      </div>
    </div>
  );
}
