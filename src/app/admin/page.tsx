import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminHeader } from "@/components/admin-header";
import { AdminGate } from "@/components/admin/admin-gate";
import { TicketsBoard } from "@/components/admin/tickets-board";

export const metadata: Metadata = {
  title: "Assistance Dashboard · Gokul Infocare (concept)",
  description: "Admin-only support tickets with AI triage.",
  robots: { index: false, follow: false },
};

// Three locks protect the dashboard:
// 1. src/proxy.ts redirects requests without a valid session before the page runs.
// 2. <AdminGate> checks the signed session again on the server before rendering.
// 3. Every admin API route (ticket list, update, email) checks the session.
// The only way to get a session is the access code typed into the chatbot.
export default function AdminPage() {
  return (
    <Suspense fallback={<CheckingAccess />}>
      <AdminGate>
        <div className="flex min-h-full flex-col bg-slate-50">
          <AdminHeader />

          <section className="relative isolate overflow-hidden bg-slate-950 pb-16 pt-10 text-white">
            <div aria-hidden="true" className="absolute inset-0 -z-10">
              <div className="absolute -left-20 top-0 h-72 w-72 animate-blob rounded-full bg-emerald-500/25 blur-3xl" />
              <div className="absolute right-0 top-10 h-72 w-72 animate-blob rounded-full bg-cyan-500/20 blur-3xl [animation-delay:-7s]" />
            </div>
            <div className="mx-auto max-w-6xl animate-scale-in px-4 sm:px-6">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-300">Assistance dashboard</p>
              <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Support tickets</h1>
              <p className="mt-3 max-w-2xl leading-relaxed text-slate-300">
                Tickets raised by the chatbot arrive here already analysed by AI: category, priority, summary, recommended
                action and a draft reply. Move them from New to Solved, and the customer is emailed your resolution note.
              </p>
            </div>
          </section>

          <main className="relative z-10 mx-auto -mt-8 w-full max-w-6xl flex-1 px-4 pb-16 sm:px-6">
            <TicketsBoard />
          </main>

          <footer className="border-t border-slate-200 bg-white">
            <p className="mx-auto max-w-6xl px-4 py-4 text-xs text-slate-500 sm:px-6">
              Concept project for a job assessment. AI suggestions can be wrong. Customers are only emailed when you resolve
              a ticket.
            </p>
          </footer>
        </div>
      </AdminGate>
    </Suspense>
  );
}

function CheckingAccess() {
  return (
    <div className="flex min-h-full flex-1 items-center justify-center bg-slate-950 text-slate-300">
      <p className="flex items-center gap-3 text-sm">
        <span aria-hidden="true" className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-400/30 border-t-emerald-400" />
        Checking admin access…
      </p>
    </div>
  );
}
