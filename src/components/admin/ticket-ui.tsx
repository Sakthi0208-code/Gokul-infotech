import { STATUS_LABELS, type TicketStatus } from "@/types/support-ticket";

const STATUS_STYLES: Record<TicketStatus, string> = {
  open: "bg-sky-50 text-sky-800 ring-sky-600/30",
  in_progress: "bg-violet-50 text-violet-800 ring-violet-600/30",
  resolved: "bg-emerald-50 text-emerald-800 ring-emerald-600/30",
};

export function StatusPill({ status }: { status: TicketStatus }) {
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${STATUS_STYLES[status]}`}>
      {STATUS_LABELS[status]}
    </span>
  );
}

export function timeAgo(iso: string, now: number): string {
  if (!now) return "";
  const s = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000));
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  return `${Math.floor(s / 86400)} d ago`;
}
