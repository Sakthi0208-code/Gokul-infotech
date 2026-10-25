"use client";

import { useId, useState } from "react";
import { postJson } from "@/lib/client-api";
import type { ChatMessage } from "@/types/chat";
import type { PublicTicketStatus } from "@/types/support-ticket";
import { PriorityBadge } from "../priority-badge";

interface TicketPanelProps {
  messages: ChatMessage[];
  escalationReason?: string;
  onCreated: (ticket: PublicTicketStatus) => void;
  onBack: () => void;
}

// Collects optional contact details, then asks the server to create a ticket.
export function TicketPanel({ messages, escalationReason, onCreated, onBack }: TicketPanelProps) {
  const nameId = useId();
  const emailId = useId();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<PublicTicketStatus | null>(null);
  const [copied, setCopied] = useState(false);

  async function create() {
    if (loading) return;
    setLoading(true);
    setError(null);
    const res = await postJson<{ ticket: PublicTicketStatus }>("/api/tickets", {
      messages,
      contact: { name: name.trim(), email: email.trim() },
      escalation_reason: escalationReason,
    });
    setLoading(false);
    if (!res.ok) {
      setError(res.message);
      return;
    }
    setCreated(res.data.ticket);
    onCreated(res.data.ticket);
  }

  if (created) {
    return (
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="flex-1 overflow-y-auto px-5 py-6">
          <div className="animate-scale-in text-center">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 text-white shadow-lg shadow-emerald-500/30">
              <svg aria-hidden="true" viewBox="0 0 20 20" className="h-7 w-7" fill="currentColor">
                <path d="M16.7 5.3a1 1 0 0 1 0 1.4l-8 8a1 1 0 0 1-1.4 0l-4-4a1 1 0 1 1 1.4-1.4L8 12.6l7.3-7.3a1 1 0 0 1 1.4 0Z" />
              </svg>
            </span>
            <p className="mt-4 text-base font-semibold text-slate-900">Support ticket created</p>
            <p className="mt-1 text-sm text-slate-600">
              Our support team will review it.{" "}
              {email.trim() ? "We'll email you the resolution." : "Check back here for the resolution."}
            </p>

            <div className="mx-auto mt-5 max-w-xs rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Your ticket number</p>
              <p className="mt-1 font-mono text-2xl font-bold tracking-wider text-slate-900">{created.id}</p>
              <div className="mt-3 flex flex-wrap justify-center gap-2 text-xs">
                <PriorityBadge priority={created.priority} />
                <span className="rounded-full bg-white px-2.5 py-1 font-medium text-slate-700 ring-1 ring-slate-200">{created.category}</span>
              </div>
              <button
                type="button"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(created.id);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  } catch {
                    setCopied(false);
                  }
                }}
                className="mt-3 text-xs font-semibold text-emerald-700 hover:underline"
              >
                {copied ? "Copied!" : "Copy ticket number"}
              </button>
            </div>

            <p className="mt-5 text-sm text-slate-600">
              To check progress later, type <span className="font-mono font-semibold text-slate-900">status {created.id}</span>{" "}
              in this chat.
            </p>
          </div>
        </div>
        <div className="border-t border-slate-200 p-3">
          <button
            type="button"
            onClick={onBack}
            className="w-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-600 px-4 py-2.5 text-sm font-semibold text-white"
          >
            Back to chat
          </button>
        </div>
      </div>
    );
  }

  return (
    <form
      className="flex min-h-0 flex-1 flex-col"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        void create();
      }}
    >
      <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
        <div className="animate-pop-in">
          <p className="text-sm font-semibold text-slate-900">Raise a support ticket</p>
          <p className="mt-1 text-sm leading-relaxed text-slate-600">
            The AI will summarise this conversation, set a priority and send it to our support team&apos;s dashboard. Add your
            email and we&apos;ll send you the resolution as soon as it&apos;s fixed (optional).
          </p>
        </div>
        <div className="space-y-1">
          <label htmlFor={nameId} className="text-sm font-medium text-slate-800">
            Your name
          </label>
          <input
            id={nameId}
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={100}
            autoComplete="name"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/30"
          />
        </div>
        <div className="space-y-1">
          <label htmlFor={emailId} className="text-sm font-medium text-slate-800">
            Your email
          </label>
          <input
            id={emailId}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            maxLength={200}
            autoComplete="email"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/30"
          />
        </div>
        {error && (
          <p role="alert" className="rounded-md border border-red-200 bg-red-50 p-2 text-sm text-red-800">
            {error}
          </p>
        )}
      </div>
      <div className="flex gap-2 border-t border-slate-200 p-3">
        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-emerald-500 to-teal-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          {loading && <span aria-hidden="true" className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />}
          {loading ? "Creating ticket…" : "Create support ticket"}
        </button>
        <button
          type="button"
          onClick={onBack}
          disabled={loading}
          className="ml-auto rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 disabled:opacity-50"
        >
          Back to chat
        </button>
      </div>
    </form>
  );
}
