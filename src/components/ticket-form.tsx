"use client";

import { useId } from "react";
import { MAX_TICKET_LENGTH } from "@/lib/validation";
import { SAMPLE_TICKETS } from "@/lib/sample-tickets";

interface TicketFormProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onClear: () => void;
  isLoading: boolean;
  validationMessage: string | null;
}

export function TicketForm({ value, onChange, onSubmit, onClear, isLoading, validationMessage }: TicketFormProps) {
  const textareaId = useId();
  const hintId = useId();
  const errorId = useId();
  const length = value.trim().length;
  const overLimit = length > MAX_TICKET_LENGTH;

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
      className="flex flex-col gap-4"
    >
      <div className="flex flex-col gap-2">
        <label htmlFor={textareaId} className="text-sm font-semibold text-slate-900">
          Customer message
        </label>
        <textarea
          id={textareaId}
          name="ticket"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
              e.preventDefault();
              onSubmit();
            }
          }}
          rows={10}
          placeholder="Paste or type the customer's complaint or technical issue here…"
          aria-invalid={validationMessage ? true : undefined}
          aria-describedby={`${hintId}${validationMessage ? ` ${errorId}` : ""}`}
          disabled={isLoading}
          className="min-h-56 w-full resize-y rounded-lg border border-slate-300 bg-white px-3.5 py-3 text-[15px] leading-relaxed text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/30 disabled:cursor-not-allowed disabled:bg-slate-50 aria-[invalid=true]:border-red-500"
        />
        <div className="flex items-center justify-between gap-3 text-xs">
          <span id={hintId} className="text-slate-500">
            Tip: press Ctrl + Enter to analyze.
          </span>
          <span
            className={`tabular-nums ${overLimit ? "font-semibold text-red-700" : "text-slate-500"}`}
            aria-live="polite"
          >
            {length.toLocaleString()} / {MAX_TICKET_LENGTH.toLocaleString()} characters
          </span>
        </div>
        {validationMessage && (
          <p id={errorId} role="alert" className="text-sm font-medium text-red-700">
            {validationMessage}
          </p>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="submit"
          disabled={isLoading}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-400"
        >
          {isLoading && (
            <span
              aria-hidden="true"
              className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
            />
          )}
          {isLoading ? "Analyzing…" : "Analyze Ticket"}
        </button>
        <button
          type="button"
          onClick={onClear}
          disabled={isLoading || (value.length === 0)}
          className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Clear
        </button>
      </div>

      <fieldset className="flex flex-col gap-2 border-t border-slate-200 pt-4">
        <legend className="mb-2 text-sm font-semibold text-slate-900">Try an example ticket</legend>
        <div className="flex flex-wrap gap-2">
          {SAMPLE_TICKETS.map((sample) => (
            <button
              key={sample.label}
              type="button"
              disabled={isLoading}
              onClick={() => onChange(sample.text)}
              className="rounded-full border border-slate-300 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:border-emerald-400 hover:bg-emerald-50 hover:text-emerald-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {sample.label}
            </button>
          ))}
        </div>
      </fieldset>
    </form>
  );
}
