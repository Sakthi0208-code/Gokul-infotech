import type { Priority } from "@/types/ticket";

// Colours were chosen for at least 4.5:1 text contrast. The label is always
// shown as text, so the badge never relies on colour alone.
const STYLES: Record<Priority, string> = {
  Low: "bg-emerald-50 text-emerald-800 ring-emerald-600/30",
  Medium: "bg-amber-50 text-amber-900 ring-amber-600/30",
  High: "bg-orange-50 text-orange-900 ring-orange-600/40",
  Critical: "bg-red-700 text-white ring-red-800",
};

const DOTS: Record<Priority, string> = {
  Low: "bg-emerald-600",
  Medium: "bg-amber-500",
  High: "bg-orange-600",
  Critical: "bg-white",
};

export function PriorityBadge({ priority }: { priority: Priority }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-sm font-semibold ring-1 ring-inset ${STYLES[priority]}`}
    >
      <span aria-hidden="true" className={`h-2 w-2 rounded-full ${DOTS[priority]}`} />
      {priority}
      <span className="sr-only"> priority</span>
    </span>
  );
}
