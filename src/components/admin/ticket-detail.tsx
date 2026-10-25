"use client";

import { useEffect, useRef, useState } from "react";
import { patchJson, postJson } from "@/lib/client-api";
import { STATUS_LABELS, type SupportTicket, type TicketNotification, type TicketStatus } from "@/types/support-ticket";
import { PriorityBadge } from "../priority-badge";
import { StatusPill } from "./ticket-ui";

type EmailOutcome = { sent: boolean; message: string };
type UpdateResponse = { ticket: SupportTicket; email?: EmailOutcome };

export function TicketDetail({
  ticket,
  onUpdated,
  focusNote = false,
}: {
  ticket: SupportTicket;
  onUpdated: (t: SupportTicket) => void;
  focusNote?: boolean;
}) {
  const [note, setNote] = useState(ticket.resolution);
  const [saving, setSaving] = useState<TicketStatus | "note" | "email" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);
  const a = ticket.analysis;
  const noteRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (focusNote) noteRef.current?.focus();
  }, [focusNote]);

  async function save(changes: { status?: TicketStatus; resolution?: string }, label: TicketStatus | "note") {
    setSaving(label);
    setError(null);
    setSavedMsg(null);
    const res = await patchJson<UpdateResponse>(`/api/tickets/${ticket.id}`, changes);
    setSaving(null);
    if (!res.ok) {
      setError(res.message);
      return;
    }
    onUpdated(res.data.ticket);
    const moved = changes.status ? `Ticket moved to ${STATUS_LABELS[changes.status]}.` : "Note saved.";
    setSavedMsg(res.data.email ? `${moved} ${res.data.email.message}` : moved);
  }

  async function resendEmail() {
    setSaving("email");
    setError(null);
    setSavedMsg(null);
    const res = await postJson<UpdateResponse>(`/api/tickets/${ticket.id}/notify`, {});
    setSaving(null);
    if (!res.ok) {
      setError(res.message);
      return;
    }
    onUpdated(res.data.ticket);
    if (res.data.email?.sent) setSavedMsg(res.data.email.message);
    else setError(res.data.email?.message ?? "The email was not sent.");
  }

  return (
    <article className="animate-scale-in p-5 sm:p-6">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="font-mono text-lg font-bold text-slate-900">{ticket.id}</h2>
        <StatusPill status={ticket.status} />
        <span className="ml-auto text-xs text-slate-500">Created {new Date(ticket.createdAt).toLocaleString()}</span>
      </div>

      <p className="mt-3 text-base font-medium leading-relaxed text-slate-900">{a.summary}</p>

      <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Field label="Priority">
          <PriorityBadge priority={a.priority} />
        </Field>
        <Field label="Category">{a.category}</Field>
        <Field label="Sentiment">{a.sentiment}</Field>
        <Field label="Customer">
          <span className="block truncate">{ticket.customer.name || "Anonymous"}</span>
          {ticket.customer.email && (
            <a href={`mailto:${ticket.customer.email}`} className="block truncate text-xs font-normal text-emerald-700 hover:underline">
              {ticket.customer.email}
            </a>
          )}
        </Field>
      </dl>

      <div className="mt-5 space-y-4 text-sm leading-relaxed text-slate-700">
        <Block title="Why this priority">{a.priority_reason}</Block>
        <Block title="Recommended action">{a.recommended_action}</Block>
        {ticket.escalationReason && <Block title="Why the chatbot escalated">{ticket.escalationReason}</Block>}
        <Block title="AI-suggested reply">
          <p className="whitespace-pre-wrap rounded-lg bg-slate-50 p-3">{a.suggested_reply}</p>
        </Block>
        <details className="group rounded-lg border border-slate-200">
          <summary className="cursor-pointer select-none px-3 py-2 text-sm font-semibold text-slate-900">
            Chat transcript ({ticket.transcript.length} messages)
          </summary>
          <ol className="space-y-2 border-t border-slate-200 p-3">
            {ticket.transcript.map((m, i) => (
              <li key={i} className={m.role === "user" ? "text-slate-900" : "text-slate-600"}>
                <span className="font-semibold">{m.role === "user" ? "Customer" : "Assistant"}:</span>{" "}
                <span className="whitespace-pre-wrap">{m.content}</span>
              </li>
            ))}
          </ol>
        </details>
      </div>

      {/* Actions */}
      <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4">
        <div className="flex items-center justify-between gap-2">
          <label htmlFor={`note-${ticket.id}`} className="text-sm font-semibold text-slate-900">
            Resolution note (emailed and shown to the customer)
          </label>
          <button
            type="button"
            onClick={() => setNote(a.suggested_reply)}
            className="text-xs font-semibold text-emerald-700 hover:underline"
          >
            Use AI reply
          </button>
        </div>
        <textarea
          id={`note-${ticket.id}`}
          ref={noteRef}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={4}
          maxLength={2000}
          placeholder="Explain what was done to fix the issue…"
          className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/30"
        />
        <div className="mt-3 flex flex-wrap gap-2">
          {ticket.status === "open" && (
            <ActionButton busy={saving === "in_progress"} onClick={() => save({ status: "in_progress" }, "in_progress")} tone="violet">
              Start working
            </ActionButton>
          )}
          {ticket.status !== "resolved" ? (
            <ActionButton
              busy={saving === "resolved"}
              onClick={() => save({ status: "resolved", resolution: note.trim() }, "resolved")}
              tone="emerald"
            >
              Mark solved
            </ActionButton>
          ) : (
            <ActionButton busy={saving === "open"} onClick={() => save({ status: "open" }, "open")} tone="slate">
              Reopen
            </ActionButton>
          )}
          <ActionButton busy={saving === "note"} onClick={() => save({ resolution: note.trim() }, "note")} tone="outline">
            Save note
          </ActionButton>
        </div>
        {ticket.status === "resolved" && (
          <EmailStatus
            notification={ticket.notification}
            hasEmail={Boolean(ticket.customer.email)}
            busy={saving === "email"}
            onResend={resendEmail}
          />
        )}
        <div aria-live="polite" className="mt-2 text-sm">
          {error && <p className="font-medium text-red-700">{error}</p>}
          {savedMsg && <p className="font-medium text-emerald-700">{savedMsg}</p>}
        </div>
      </div>
    </article>
  );
}

function EmailStatus({
  notification,
  hasEmail,
  busy,
  onResend,
}: {
  notification?: TicketNotification;
  hasEmail: boolean;
  busy: boolean;
  onResend: () => void;
}) {
  const sent = notification?.status === "sent";
  const tone = sent
    ? "border-emerald-200 bg-emerald-50 text-emerald-900"
    : notification?.status === "failed"
      ? "border-red-200 bg-red-50 text-red-900"
      : "border-amber-200 bg-amber-50 text-amber-900";
  return (
    <div className={`mt-3 flex flex-wrap items-center gap-2 rounded-lg border px-3 py-2 text-sm ${tone}`}>
      <span aria-hidden="true">{sent ? "✉️" : "⚠️"}</span>
      <p className="min-w-0 flex-1">
        {notification
          ? `${notification.message} (${new Date(notification.at).toLocaleString()})`
          : "The customer has not been emailed about this resolution."}
      </p>
      {hasEmail && (
        <button
          type="button"
          onClick={onResend}
          disabled={busy}
          className="rounded-full border border-current px-3 py-1 text-xs font-semibold disabled:opacity-60"
        >
          {busy ? "Sending…" : sent ? "Send again" : "Send email"}
        </button>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0 rounded-lg border border-slate-200 p-3">
      <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="mt-1 text-sm font-semibold text-slate-900">{children}</dd>
    </div>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      <div className="mt-1">{children}</div>
    </section>
  );
}

const TONES = {
  emerald: "bg-gradient-to-r from-emerald-500 to-teal-600 text-white",
  violet: "bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white",
  slate: "bg-slate-800 text-white",
  outline: "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50",
};

function ActionButton({
  children,
  onClick,
  busy,
  tone,
}: {
  children: React.ReactNode;
  onClick: () => void;
  busy: boolean;
  tone: keyof typeof TONES;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className={`rounded-full px-4 py-2 text-sm font-semibold shadow-sm transition-transform enabled:hover:-translate-y-0.5 disabled:opacity-60 ${TONES[tone]}`}
    >
      {busy ? "Saving…" : children}
    </button>
  );
}
