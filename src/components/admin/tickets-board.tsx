"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getJson, patchJson } from "@/lib/client-api";
import { STATUS_LABELS, TICKET_STATUSES, type SupportTicket, type TicketStatus } from "@/types/support-ticket";
import { PRIORITIES, type Priority } from "@/types/ticket";
import { PriorityBadge } from "../priority-badge";
import { TicketDetail } from "./ticket-detail";
import { timeAgo } from "./ticket-ui";

const REFRESH_MS = 20_000;

const COLUMNS: Record<TicketStatus, { hint: string; accent: string; dot: string; empty: string }> = {
  open: {
    hint: "Raised by the chatbot, waiting for the team",
    accent: "from-sky-500 to-cyan-500",
    dot: "bg-sky-500",
    empty: "No new tickets. 🎉",
  },
  in_progress: {
    hint: "Someone is working on it",
    accent: "from-violet-500 to-fuchsia-500",
    dot: "bg-violet-500",
    empty: "Drag a ticket here or press Start.",
  },
  resolved: {
    hint: "Customer has the resolution",
    accent: "from-emerald-500 to-teal-500",
    dot: "bg-emerald-500",
    empty: "Solved tickets appear here.",
  },
};

export function TicketsBoard() {
  const [tickets, setTickets] = useState<SupportTicket[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  // Set when tickets load (reading the clock during prerendering is not allowed).
  const [now, setNow] = useState(0);
  const [query, setQuery] = useState("");
  const [priority, setPriority] = useState<"all" | Priority>("all");
  const [openId, setOpenId] = useState<string | null>(null);
  const [focusNote, setFocusNote] = useState(false);
  const [dragOver, setDragOver] = useState<TicketStatus | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setRefreshing(true);
    const res = await getJson<{ tickets: SupportTicket[] }>("/api/tickets");
    setRefreshing(false);
    setNow(Date.now());
    if (!res.ok) {
      setError(res.message);
      return;
    }
    setError(null);
    setTickets(res.data.tickets);
  }, []);

  useEffect(() => {
    const first = setTimeout(() => void load(), 0);
    const timer = setInterval(() => void load(), REFRESH_MS);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
    };
  }, [load]);

  const all = useMemo(() => tickets ?? [], [tickets]);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return all.filter(
      (t) =>
        (priority === "all" || t.analysis.priority === priority) &&
        (!q ||
          t.id.toLowerCase().includes(q) ||
          t.analysis.summary.toLowerCase().includes(q) ||
          t.analysis.category.toLowerCase().includes(q) ||
          (t.customer.name ?? "").toLowerCase().includes(q) ||
          (t.customer.email ?? "").toLowerCase().includes(q)),
    );
  }, [all, query, priority]);

  const counts = useMemo(
    () => ({
      open: all.filter((t) => t.status === "open").length,
      in_progress: all.filter((t) => t.status === "in_progress").length,
      resolved: all.filter((t) => t.status === "resolved").length,
      urgent: all.filter((t) => t.status !== "resolved" && (t.analysis.priority === "Critical" || t.analysis.priority === "High")).length,
    }),
    [all],
  );

  const opened = all.find((t) => t.id === openId) ?? null;

  function replaceTicket(updated: SupportTicket) {
    setTickets((prev) => prev?.map((t) => (t.id === updated.id ? updated : t)) ?? prev);
  }

  function openTicket(id: string, withNote = false) {
    setFocusNote(withNote);
    setOpenId(id);
  }

  // Move a ticket between New and In progress. Solving always goes through
  // the details panel, because a resolution note is required.
  async function move(ticket: SupportTicket, to: TicketStatus) {
    if (ticket.status === to) return;
    if (to === "resolved") {
      setNotice(`Add a resolution note to mark ${ticket.id} as solved.`);
      openTicket(ticket.id, true);
      return;
    }
    setBusyId(ticket.id);
    setNotice(null);
    const res = await patchJson<{ ticket: SupportTicket }>(`/api/tickets/${ticket.id}`, { status: to });
    setBusyId(null);
    if (!res.ok) {
      setError(res.message);
      return;
    }
    replaceTicket(res.data.ticket);
    setNotice(`${ticket.id} moved to ${STATUS_LABELS[to]}.`);
  }

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: "New", value: counts.open, tone: "from-sky-500 to-cyan-500" },
          { label: "In progress", value: counts.in_progress, tone: "from-violet-500 to-fuchsia-500" },
          { label: "Solved", value: counts.resolved, tone: "from-emerald-500 to-teal-500" },
          { label: "Urgent (High / Critical)", value: counts.urgent, tone: "from-orange-500 to-red-500" },
        ].map((c, i) => (
          <div key={c.label} className="animate-pop-in rounded-2xl border border-slate-200 bg-white p-4 shadow-sm" style={{ animationDelay: `${i * 70}ms` }}>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{c.label}</p>
            <p className={`mt-1 bg-gradient-to-r ${c.tone} bg-clip-text text-3xl font-extrabold text-transparent`}>{tickets ? c.value : "–"}</p>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
        <label className="relative min-w-56 flex-1">
          <span className="sr-only">Search tickets</span>
          <svg aria-hidden="true" viewBox="0 0 20 20" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" fill="currentColor">
            <path d="M8.5 3a5.5 5.5 0 1 0 3.4 9.8l3.6 3.6a1 1 0 0 0 1.4-1.4l-3.6-3.6A5.5 5.5 0 0 0 8.5 3Zm-3.5 5.5a3.5 3.5 0 1 1 7 0 3.5 3.5 0 0 1-7 0Z" />
          </svg>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by ticket number, issue, category or customer…"
            className="w-full rounded-full border border-slate-300 py-2 pl-9 pr-3 text-sm focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/30"
          />
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          Priority
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value as "all" | Priority)}
            className="rounded-full border border-slate-300 bg-white px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none"
          >
            <option value="all">All</option>
            {[...PRIORITIES].reverse().map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          onClick={() => void load()}
          disabled={refreshing}
          className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
        >
          {refreshing ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      <div aria-live="polite">
        {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
        {notice && !error && <p className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">{notice}</p>}
      </div>

      {/* Board */}
      <div className="grid gap-4 lg:grid-cols-3">
        {TICKET_STATUSES.map((status) => {
          const col = COLUMNS[status];
          const items = filtered.filter((t) => t.status === status);
          return (
            <section
              key={status}
              aria-labelledby={`col-${status}`}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(status);
              }}
              onDragLeave={() => setDragOver((s) => (s === status ? null : s))}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(null);
                const t = all.find((x) => x.id === e.dataTransfer.getData("text/plain"));
                if (t) void move(t, status);
              }}
              className={`flex min-h-64 flex-col rounded-2xl border bg-slate-100/70 transition-colors ${
                dragOver === status ? "border-emerald-400 bg-emerald-50" : "border-slate-200"
              }`}
            >
              <div className="relative overflow-hidden rounded-t-2xl bg-white px-4 py-3">
                <span aria-hidden="true" className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${col.accent}`} />
                <div className="flex items-center gap-2">
                  <span aria-hidden="true" className={`h-2.5 w-2.5 rounded-full ${col.dot}`} />
                  <h2 id={`col-${status}`} className="text-sm font-bold text-slate-900">
                    {STATUS_LABELS[status]}
                  </h2>
                  <span className="ml-auto rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">{items.length}</span>
                </div>
                <p className="mt-0.5 text-xs text-slate-500">{col.hint}</p>
              </div>

              <ul className="flex max-h-[620px] flex-1 flex-col gap-3 overflow-y-auto p-3">
                {tickets === null && !error ? (
                  [0, 1].map((i) => <li key={i} className="h-28 animate-pulse rounded-xl bg-white/80" />)
                ) : items.length === 0 ? (
                  <li className="rounded-xl border-2 border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">{col.empty}</li>
                ) : (
                  items.map((t, i) => (
                    <li
                      key={t.id}
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData("text/plain", t.id);
                        e.dataTransfer.effectAllowed = "move";
                      }}
                      className="group animate-pop-in cursor-grab rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md active:cursor-grabbing"
                      style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}
                    >
                      <button type="button" onClick={() => openTicket(t.id)} className="block w-full text-left focus-visible:outline-none">
                        <div className="flex items-center gap-2">
                          <PriorityBadge priority={t.analysis.priority} />
                          <span className="font-mono text-xs font-semibold text-slate-500">{t.id}</span>
                          {t.notification?.status === "sent" && (
                            <span title="Customer emailed" className="ml-auto text-xs" aria-label="Customer emailed">
                              ✉️
                            </span>
                          )}
                        </div>
                        <p className="mt-2 line-clamp-3 text-sm font-medium text-slate-900 group-hover:text-emerald-800">{t.analysis.summary}</p>
                        <p className="mt-1.5 text-xs text-slate-500">
                          {t.analysis.category} · {t.customer.name || "Anonymous"} · {timeAgo(t.createdAt, now)}
                        </p>
                      </button>
                      <div className="mt-3 flex gap-2 border-t border-slate-100 pt-2.5">
                        {status === "open" && (
                          <CardAction busy={busyId === t.id} onClick={() => void move(t, "in_progress")}>
                            Start ▸
                          </CardAction>
                        )}
                        {status === "in_progress" && (
                          <CardAction busy={false} onClick={() => openTicket(t.id, true)}>
                            Solve ✓
                          </CardAction>
                        )}
                        {status === "resolved" && (
                          <CardAction busy={busyId === t.id} onClick={() => void move(t, "open")}>
                            Reopen
                          </CardAction>
                        )}
                        <button
                          type="button"
                          onClick={() => openTicket(t.id)}
                          className="ml-auto text-xs font-semibold text-slate-500 hover:text-slate-900"
                        >
                          Details
                        </button>
                      </div>
                    </li>
                  ))
                )}
              </ul>
            </section>
          );
        })}
      </div>
      <p className="text-xs text-slate-500">Tip: drag cards between columns. Moving a ticket to Solved asks for a resolution note, which is emailed to the customer.</p>

      {opened && (
        <TicketDrawer onClose={() => setOpenId(null)}>
          <TicketDetail key={opened.id} ticket={opened} onUpdated={replaceTicket} focusNote={focusNote} />
        </TicketDrawer>
      )}
    </div>
  );
}

function CardAction({ children, onClick, busy }: { children: React.ReactNode; onClick: () => void; busy: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white transition-transform hover:-translate-y-0.5 disabled:opacity-60"
    >
      {busy ? "Saving…" : children}
    </button>
  );
}

function TicketDrawer({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Keep focus where the content put it (e.g. the resolution note); otherwise focus Close.
    if (!panelRef.current?.contains(document.activeElement)) closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button type="button" aria-label="Close ticket details" onClick={onClose} className="absolute inset-0 animate-pop-in bg-slate-950/40 backdrop-blur-sm" />
      <div ref={panelRef} role="dialog" aria-modal="true" aria-label="Ticket details" className="relative h-full w-full max-w-2xl animate-scale-in overflow-y-auto bg-white shadow-2xl">
        <div className="sticky top-0 z-10 flex justify-end border-b border-slate-100 bg-white/90 px-4 py-2 backdrop-blur">
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className="rounded-full px-3 py-1.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-900"
          >
            Close ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
