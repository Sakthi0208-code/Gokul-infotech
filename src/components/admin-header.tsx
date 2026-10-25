"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Logo } from "./landing/logo";

export function AdminHeader() {
  const router = useRouter();
  const [leaving, setLeaving] = useState(false);

  async function logout() {
    setLeaving(true);
    try {
      await fetch("/api/admin/logout", { method: "POST" });
    } finally {
      router.replace("/");
      router.refresh();
    }
  }

  return (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-slate-950 text-white">
      <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3 sm:px-6">
        <Link href="/" className="rounded-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-400">
          <Logo dark />
        </Link>
        <span className="hidden rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-300 sm:inline">
          Admin · Assistance dashboard
        </span>
        <button
          type="button"
          onClick={logout}
          disabled={leaving}
          className="ml-auto rounded-full border border-white/20 px-4 py-2 text-sm font-semibold transition-colors hover:bg-white/10 disabled:opacity-60"
        >
          {leaving ? "Signing out…" : "Sign out"}
        </button>
      </div>
    </header>
  );
}
