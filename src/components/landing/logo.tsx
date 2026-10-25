// Text wordmark. The real Gokul Infocare logo image is not used in this concept.
export function Logo({ dark = false }: { dark?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <span
        aria-hidden="true"
        className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 via-emerald-500 to-teal-600 text-base font-black text-white shadow-lg shadow-emerald-500/30"
      >
        G
      </span>
      <span className="leading-tight">
        <span className={`block text-base font-bold tracking-tight ${dark ? "text-white" : "text-slate-900"}`}>
          Gokul Infocare
        </span>
        <span className={`block text-[11px] font-medium ${dark ? "text-emerald-200" : "text-emerald-700"}`}>
          Fresh ideas for your business
        </span>
      </span>
    </span>
  );
}
