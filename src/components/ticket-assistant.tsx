"use client";

import { useRef, useState } from "react";
import { validateTicketText } from "@/lib/validation";
import type { AnalyzeResponse, ApiErrorCode, TicketAnalysis } from "@/types/ticket";
import { AnalysisResult } from "./analysis-result";
import { PriorityBadge } from "./priority-badge";
import { TicketForm } from "./ticket-form";

interface DisplayError {
  title: string;
  message: string;
  hint?: string;
}

interface HistoryItem {
  id: number;
  ticket: string;
  analysis: TicketAnalysis;
  model: string;
  time: string;
}

const MAX_HISTORY = 5;

// Extra recovery advice for each error code returned by /api/analyze.
const HINTS: Partial<Record<ApiErrorCode, string>> = {
  MISSING_API_KEY:
    "Setup step: copy .env.example to .env.local, add your key from Google AI Studio, then restart `npm run dev`.",
  GEMINI_AUTH_ERROR: "Create a new key in Google AI Studio and update GEMINI_API_KEY.",
  MODEL_UNAVAILABLE: "Update GEMINI_MODEL in .env.local and restart the server.",
  GEMINI_RATE_LIMITED: "Free-tier limits reset over time. Waiting about a minute usually helps.",
  RATE_LIMITED: "This app limits requests to protect the free Gemini quota.",
  TIMEOUT: "Shorter tickets usually respond faster.",
  INVALID_MODEL_OUTPUT: "AI output can vary between attempts. Running the analysis again usually works.",
  UNAUTHORIZED: "Go back to the homepage, open the chat assistant and sign in again.",
};

export function TicketAssistant() {
  const [ticket, setTicket] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [validationMessage, setValidationMessage] = useState<string | null>(null);
  const [error, setError] = useState<DisplayError | null>(null);
  const [result, setResult] = useState<{ analysis: TicketAnalysis; model: string } | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const inFlight = useRef(false);
  const nextId = useRef(1);

  async function handleSubmit() {
    if (inFlight.current) return; // block duplicate submissions

    const check = validateTicketText(ticket);
    if (!check.ok) {
      setValidationMessage(check.message);
      return;
    }

    setValidationMessage(null);
    setError(null);
    setIsLoading(true);
    inFlight.current = true;

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticket: check.value }),
      });

      let data: AnalyzeResponse | null = null;
      try {
        data = (await res.json()) as AnalyzeResponse;
      } catch {
        data = null;
      }

      if (!res.ok || !data || "error" in data) {
        const code = data && "error" in data ? data.error.code : undefined;
        setResult(null);
        setError({
          title: code === "MISSING_API_KEY" ? "Gemini is not configured" : "Analysis failed",
          message:
            data && "error" in data
              ? data.error.message
              : `The server returned an unexpected response (HTTP ${res.status}). Please try again.`,
          hint: code ? HINTS[code] : undefined,
        });
        return;
      }

      setResult({ analysis: data.analysis, model: data.model });
      const item: HistoryItem = {
        id: nextId.current++,
        ticket: check.value,
        analysis: data.analysis,
        model: data.model,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setHistory((prev) => [item, ...prev].slice(0, MAX_HISTORY));
    } catch {
      setResult(null);
      setError({
        title: "Could not reach the server",
        message: "Check your internet connection and that the app is still running, then try again.",
      });
    } finally {
      inFlight.current = false;
      setIsLoading(false);
    }
  }

  function handleClear() {
    setTicket("");
    setValidationMessage(null);
    setError(null);
    setResult(null);
  }

  function handleChange(value: string) {
    setTicket(value);
    if (validationMessage) setValidationMessage(null);
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
      <div className="flex flex-col gap-6">
        <section
          aria-labelledby="ticket-heading"
          className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
        >
          <h2 id="ticket-heading" className="mb-4 text-lg font-semibold text-slate-900">
            New ticket
          </h2>
          <TicketForm
            value={ticket}
            onChange={handleChange}
            onSubmit={handleSubmit}
            onClear={handleClear}
            isLoading={isLoading}
            validationMessage={validationMessage}
          />
        </section>

        {history.length > 0 && (
          <section
            aria-labelledby="history-heading"
            className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
          >
            <div className="mb-3 flex items-baseline justify-between gap-2">
              <h2 id="history-heading" className="text-sm font-semibold text-slate-900">
                Recent analyses
              </h2>
              <button
                type="button"
                onClick={() => setHistory([])}
                className="text-xs font-medium text-slate-500 underline-offset-2 hover:text-slate-800 hover:underline"
              >
                Clear history
              </button>
            </div>
            <p className="mb-3 text-xs text-slate-500">
              Kept only in this browser tab. Cleared when you refresh. Nothing is saved on the server.
            </p>
            <ul className="flex flex-col gap-2">
              {history.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    disabled={isLoading}
                    onClick={() => {
                      setTicket(item.ticket);
                      setResult({ analysis: item.analysis, model: item.model });
                      setError(null);
                      setValidationMessage(null);
                    }}
                    className="flex w-full items-center gap-3 rounded-lg border border-slate-200 px-3 py-2 text-left transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 disabled:opacity-50"
                  >
                    <PriorityBadge priority={item.analysis.priority} />
                    <span className="min-w-0 flex-1 truncate text-sm text-slate-700">
                      {item.analysis.category} — {item.analysis.summary}
                    </span>
                    <span className="shrink-0 text-xs tabular-nums text-slate-500">{item.time}</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>

      <section
        aria-label="Analysis results"
        aria-busy={isLoading}
        className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
      >
        {isLoading ? (
          <LoadingState />
        ) : error ? (
          <ErrorState error={error} onRetry={handleSubmit} canRetry={ticket.trim().length > 0} />
        ) : result ? (
          <AnalysisResult analysis={result.analysis} model={result.model} />
        ) : (
          <EmptyState />
        )}
      </section>
    </div>
  );
}

function LoadingState() {
  return (
    <div role="status" aria-live="polite" className="flex flex-col gap-4">
      <p className="text-sm font-medium text-slate-700">Analyzing ticket with Gemini…</p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3" aria-hidden="true">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-16 animate-pulse rounded-lg bg-slate-100" />
        ))}
      </div>
      <div className="flex flex-col gap-2" aria-hidden="true">
        <div className="h-4 w-3/4 animate-pulse rounded bg-slate-100" />
        <div className="h-4 w-full animate-pulse rounded bg-slate-100" />
        <div className="h-4 w-5/6 animate-pulse rounded bg-slate-100" />
        <div className="mt-2 h-28 w-full animate-pulse rounded-lg bg-slate-100" />
      </div>
    </div>
  );
}

function ErrorState({ error, onRetry, canRetry }: { error: DisplayError; onRetry: () => void; canRetry: boolean }) {
  return (
    <div role="alert" className="flex flex-col gap-3 rounded-lg border border-red-200 bg-red-50 p-4">
      <h2 className="text-base font-semibold text-red-800">{error.title}</h2>
      <p className="text-sm leading-relaxed text-red-800">{error.message}</p>
      {error.hint && <p className="text-sm leading-relaxed text-slate-700">{error.hint}</p>}
      {canRetry && (
        <div>
          <button
            type="button"
            onClick={onRetry}
            className="rounded-lg border border-red-300 bg-white px-3 py-1.5 text-sm font-semibold text-red-800 hover:bg-red-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700"
          >
            Try again
          </button>
        </div>
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex h-full min-h-64 flex-col items-center justify-center gap-2 text-center">
      <p className="text-base font-semibold text-slate-900">No analysis yet</p>
      <p className="max-w-sm text-sm leading-relaxed text-slate-600">
        Enter a customer message or pick an example ticket, then select <strong>Analyze Ticket</strong>. The category,
        priority, sentiment, summary and a draft reply will appear here.
      </p>
    </div>
  );
}
