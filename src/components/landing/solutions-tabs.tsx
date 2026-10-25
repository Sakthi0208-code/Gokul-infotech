"use client";

import { useId, useState } from "react";
import { SOLUTIONS, type SolutionId } from "@/lib/site-content";

export function SolutionsTabs() {
  const [active, setActive] = useState<SolutionId>(SOLUTIONS[0].id);
  const baseId = useId();
  const solution = SOLUTIONS.find((s) => s.id === active) ?? SOLUTIONS[0];

  function onKeyDown(e: React.KeyboardEvent, index: number) {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    const next = (index + (e.key === "ArrowRight" ? 1 : -1) + SOLUTIONS.length) % SOLUTIONS.length;
    setActive(SOLUTIONS[next].id);
    document.getElementById(`${baseId}-tab-${SOLUTIONS[next].id}`)?.focus();
  }

  return (
    <div>
      <div role="tablist" aria-label="Solutions" className="inline-flex flex-wrap gap-1 rounded-full border border-slate-200 bg-white p-1 shadow-sm">
        {SOLUTIONS.map((s, i) => {
          const selected = s.id === active;
          return (
            <button
              key={s.id}
              id={`${baseId}-tab-${s.id}`}
              role="tab"
              type="button"
              aria-selected={selected}
              aria-controls={`${baseId}-panel`}
              tabIndex={selected ? 0 : -1}
              onClick={() => setActive(s.id)}
              onKeyDown={(e) => onKeyDown(e, i)}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition-all duration-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 ${
                selected
                  ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-600/30"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {s.tab}
            </button>
          );
        })}
      </div>

      <div
        key={solution.id}
        id={`${baseId}-panel`}
        role="tabpanel"
        aria-labelledby={`${baseId}-tab-${solution.id}`}
        className="mt-8 grid animate-scale-in items-center gap-10 text-left rounded-3xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-900/5 sm:p-10 lg:grid-cols-2"
      >
        <div>
          <h3 className="text-2xl font-bold tracking-tight text-slate-900">{solution.title}</h3>
          <p className="mt-3 leading-relaxed text-slate-600">{solution.text}</p>
          <ul className="mt-6 grid gap-3 sm:grid-cols-2">
            {solution.points.map((p, i) => (
              <li
                key={p}
                className="flex animate-pop-in items-start gap-2.5 text-sm text-slate-700"
                style={{ animationDelay: `${120 + i * 80}ms` }}
              >
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                  <svg aria-hidden="true" viewBox="0 0 20 20" className="h-3 w-3" fill="currentColor">
                    <path d="M16.7 5.3a1 1 0 0 1 0 1.4l-8 8a1 1 0 0 1-1.4 0l-4-4a1 1 0 1 1 1.4-1.4L8 12.6l7.3-7.3a1 1 0 0 1 1.4 0Z" />
                  </svg>
                </span>
                {p}
              </li>
            ))}
          </ul>
        </div>
        <SolutionVisual id={solution.id} />
      </div>
    </div>
  );
}

function SolutionVisual({ id }: { id: SolutionId }) {
  if (id === "parking") {
    const occupied = [0, 2, 3, 6, 9, 10, 13];
    return (
      <div aria-hidden="true" className="rounded-2xl bg-slate-900 p-6">
        <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Level 1 · Live availability</p>
        <div className="mt-4 grid grid-cols-4 gap-3">
          {Array.from({ length: 16 }, (_, i) => (
            <div
              key={i}
              className={`flex h-14 items-center justify-center rounded-lg border text-xs font-semibold ${
                occupied.includes(i)
                  ? "border-rose-400/40 bg-rose-500/20 text-rose-200"
                  : "border-emerald-400/40 bg-emerald-500/15 text-emerald-200"
              } ${i === 5 || i === 10 ? "animate-pulse" : ""}`}
            >
              {occupied.includes(i) ? "🚗" : i + 1}
            </div>
          ))}
        </div>
        <p className="mt-4 text-sm text-slate-300">
          <span className="font-semibold text-emerald-300">9 bays free</span> · updated in real time
        </p>
      </div>
    );
  }

  if (id === "fleet") {
    return (
      <div aria-hidden="true" className="relative h-72 overflow-hidden rounded-2xl bg-slate-900">
        <div className="bg-grid absolute inset-0" />
        <svg viewBox="0 0 400 280" className="absolute inset-0 h-full w-full" fill="none">
          <path d="M30 230 C 120 220, 120 120, 200 140 S 330 80, 370 40" stroke="#34d399" strokeWidth="3" strokeDasharray="8 8" opacity="0.8" />
        </svg>
        <span className="absolute left-[10%] top-[72%] flex h-9 w-9 animate-drive items-center justify-center rounded-xl bg-emerald-400 text-lg shadow-lg shadow-emerald-400/50">
          🚐
        </span>
        <div className="absolute right-4 top-4 w-48 rounded-xl border border-white/10 bg-white/10 p-3 text-xs text-slate-200 backdrop-blur">
          <p className="font-semibold text-white">Van 07 · Trip 3</p>
          <dl className="mt-2 space-y-1">
            {[
              ["Driver", "ID 4521"],
              ["Speed", "58 km/h"],
              ["Fuel this trip", "6.2 L"],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between">
                <dt className="text-slate-400">{k}</dt>
                <dd>{v}</dd>
              </div>
            ))}
          </dl>
        </div>
        <p className="absolute bottom-4 left-4 rounded-full bg-amber-400/90 px-3 py-1 text-xs font-semibold text-amber-950">
          Service due in 300 km
        </p>
      </div>
    );
  }

  return (
    <div aria-hidden="true" className="grid gap-3 rounded-2xl bg-slate-900 p-4 sm:grid-cols-[1.2fr_1fr]">
      <div className="relative h-56 overflow-hidden rounded-xl bg-gradient-to-br from-teal-900 to-slate-800">
        <div className="bg-grid absolute inset-0" />
        {[
          ["left-[20%] top-[25%]", "bg-emerald-400"],
          ["left-[55%] top-[45%]", "bg-cyan-400"],
          ["left-[35%] top-[70%]", "bg-amber-400"],
          ["left-[75%] top-[20%]", "bg-emerald-400"],
        ].map(([pos, color], i) => (
          <span key={pos} className={`absolute ${pos} flex h-4 w-4`}>
            <span className={`absolute h-full w-full animate-ping-slow rounded-full ${color}`} style={{ animationDelay: `${i * 0.5}s` }} />
            <span className={`relative h-4 w-4 rounded-full border-2 border-white ${color}`} />
          </span>
        ))}
      </div>
      <div className="space-y-2 text-xs text-slate-300">
        <p className="font-semibold uppercase tracking-wider text-slate-400">ERP records</p>
        {[
          ["Asset #A-102", "Depot North"],
          ["Work order 881", "Site 14"],
          ["Invoice 2290", "Branch East"],
          ["Asset #A-219", "Depot South"],
        ].map(([a, b]) => (
          <div key={a} className="flex justify-between rounded-lg bg-white/5 px-3 py-2">
            <span className="text-white">{a}</span>
            <span>{b}</span>
          </div>
        ))}
        <p className="pt-1 text-emerald-300">Export → CSV · XLSX · PDF</p>
      </div>
    </div>
  );
}
