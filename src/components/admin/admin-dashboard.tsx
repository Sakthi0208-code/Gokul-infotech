"use client";

import { useState } from "react";
import { TicketAssistant } from "../ticket-assistant";
import { TicketsBoard } from "./tickets-board";

const TABS = [
  { id: "tickets", label: "Support tickets" },
  { id: "triage", label: "Triage tool" },
] as const;

type Tab = (typeof TABS)[number]["id"];

export function AdminDashboard() {
  const [tab, setTab] = useState<Tab>("tickets");

  return (
    <div>
      <div role="tablist" aria-label="Dashboard sections" className="mb-6 inline-flex rounded-full border border-slate-200 bg-white p-1 shadow-sm">
        {TABS.map((t) => (
          <button
            key={t.id}
            id={`tab-${t.id}`}
            role="tab"
            type="button"
            aria-selected={tab === t.id}
            aria-controls={`panel-${t.id}`}
            onClick={() => setTab(t.id)}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition-all ${
              tab === t.id ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Both panels stay mounted so switching tabs keeps their state. */}
      <div id="panel-tickets" role="tabpanel" aria-labelledby="tab-tickets" hidden={tab !== "tickets"}>
        <TicketsBoard />
      </div>
      <div id="panel-triage" role="tabpanel" aria-labelledby="tab-triage" hidden={tab !== "triage"}>
        <TicketAssistant />
      </div>
    </div>
  );
}
