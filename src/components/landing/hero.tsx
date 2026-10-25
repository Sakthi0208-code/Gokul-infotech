import { OpenChatButton } from "./open-chat-button";

export function Hero() {
  return (
    <section id="top" className="relative isolate overflow-hidden bg-slate-950 pb-24 pt-40 text-white sm:pt-44 lg:pb-32">
      {/* Animated background */}
      <div aria-hidden="true" className="absolute inset-0 -z-10">
        <div className="absolute -left-24 top-10 h-96 w-96 animate-blob rounded-full bg-emerald-500/30 blur-3xl" />
        <div className="absolute right-0 top-40 h-[28rem] w-[28rem] animate-blob rounded-full bg-teal-500/25 blur-3xl [animation-delay:-6s]" />
        <div className="absolute bottom-0 left-1/3 h-80 w-80 animate-blob rounded-full bg-cyan-500/20 blur-3xl [animation-delay:-12s]" />
        <div className="bg-grid absolute inset-0 [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_75%)]" />
      </div>

      <div className="mx-auto grid max-w-7xl items-center gap-16 px-4 sm:px-6 lg:grid-cols-[1.1fr_1fr]">
        <div className="animate-scale-in">
          <p className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3.5 py-1.5 text-xs font-medium text-emerald-100 backdrop-blur">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping-slow rounded-full bg-emerald-400" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
            </span>
            Serving Australia &amp; New Zealand
          </p>

          <h1 className="mt-6 text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-6xl">
            Fresh ideas for{" "}
            <span className="animate-gradient bg-gradient-to-r from-emerald-300 via-teal-200 to-cyan-300 bg-[length:200%_auto] bg-clip-text text-transparent">
              your business
            </span>
          </h1>

          <p className="mt-6 max-w-xl text-lg leading-relaxed text-slate-300">
            Gokul Infocare is a technology company delivering ERP, SAP consulting, IoT, asset tracking, GIS and mobile
            solutions, plus IT and medical recruitment, to organisations across Australia and New Zealand.
          </p>

          <div className="mt-9 flex flex-wrap gap-3">
            <a
              href="#services"
              className="group inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 px-6 py-3.5 text-sm font-semibold text-white shadow-xl shadow-emerald-500/30 transition-all hover:-translate-y-0.5 hover:shadow-emerald-500/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400"
            >
              Explore our services
              <svg aria-hidden="true" viewBox="0 0 20 20" className="h-4 w-4 transition-transform group-hover:translate-x-1" fill="currentColor">
                <path d="M11.3 4.3a1 1 0 0 1 1.4 0l5 5a1 1 0 0 1 0 1.4l-5 5a1 1 0 0 1-1.4-1.4L14.6 11H3a1 1 0 1 1 0-2h11.6l-3.3-3.3a1 1 0 0 1 0-1.4Z" />
              </svg>
            </a>
            <OpenChatButton className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-6 py-3.5 text-sm font-semibold text-white backdrop-blur transition-colors hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
              <span aria-hidden="true">✦</span> Ask our AI assistant
            </OpenChatButton>
          </div>

          <ul className="mt-10 flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-300">
            {["SAP-certified consultants", "Australian data centre", "Government-accredited ICT supplier"].map((t) => (
              <li key={t} className="flex items-center gap-2">
                <svg aria-hidden="true" viewBox="0 0 20 20" className="h-4 w-4 text-emerald-400" fill="currentColor">
                  <path d="M16.7 5.3a1 1 0 0 1 0 1.4l-8 8a1 1 0 0 1-1.4 0l-4-4a1 1 0 1 1 1.4-1.4L8 12.6l7.3-7.3a1 1 0 0 1 1.4 0Z" />
                </svg>
                {t}
              </li>
            ))}
          </ul>
        </div>

        <HeroVisual />
      </div>
    </section>
  );
}

// Decorative dashboard collage: live fleet map, parking bay card and AI chat card.
function HeroVisual() {
  return (
    <div aria-hidden="true" className="relative mx-auto h-[420px] w-full max-w-lg sm:h-[460px]">
      {/* Fleet map card */}
      <div className="absolute inset-x-4 top-8 rounded-3xl border border-white/10 bg-white/[0.06] p-5 shadow-2xl backdrop-blur-xl sm:inset-x-8">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-emerald-200">Fleet tracking</p>
            <p className="mt-0.5 text-lg font-semibold">12 vehicles live</p>
          </div>
          <span className="rounded-full bg-emerald-400/15 px-2.5 py-1 text-xs font-semibold text-emerald-300">● Live</span>
        </div>
        <div className="relative mt-4 h-52 overflow-hidden rounded-2xl bg-slate-900/80">
          <div className="bg-grid absolute inset-0 opacity-70" />
          <svg viewBox="0 0 300 200" className="absolute inset-0 h-full w-full" fill="none">
            <path d="M20 160 C 80 150, 90 90, 150 100 S 240 60, 280 40" stroke="url(#route)" strokeWidth="3" strokeDasharray="6 6" />
            <defs>
              <linearGradient id="route" x1="0" x2="1">
                <stop offset="0" stopColor="#34d399" />
                <stop offset="1" stopColor="#22d3ee" />
              </linearGradient>
            </defs>
          </svg>
          {[
            ["left-[18%] top-[30%]", "0s"],
            ["left-[62%] top-[62%]", "0.8s"],
            ["left-[80%] top-[22%]", "1.6s"],
          ].map(([pos, delay]) => (
            <span key={pos} className={`absolute ${pos} flex h-3 w-3`}>
              <span className="absolute inline-flex h-full w-full animate-ping-slow rounded-full bg-cyan-400" style={{ animationDelay: delay }} />
              <span className="relative inline-flex h-3 w-3 rounded-full bg-cyan-300" />
            </span>
          ))}
          <span className="absolute left-[8%] top-[70%] flex h-7 w-7 animate-drive items-center justify-center rounded-lg bg-emerald-400 text-sm shadow-lg shadow-emerald-400/50">
            🚐
          </span>
        </div>
      </div>

      {/* Parking card */}
      <div className="absolute -right-2 top-0 w-44 animate-float rounded-2xl border border-white/10 bg-slate-900/90 p-3.5 shadow-xl backdrop-blur sm:-right-6">
        <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">Parking sensor</p>
        <p className="mt-1 text-sm font-semibold">Bay 12 · Available</p>
        <div className="mt-2 grid grid-cols-4 gap-1">
          {Array.from({ length: 8 }, (_, i) => (
            <span key={i} className={`h-3 rounded-sm ${[1, 2, 5, 6].includes(i) ? "bg-rose-400/70" : "bg-emerald-400/80"} ${i === 3 ? "animate-pulse" : ""}`} />
          ))}
        </div>
      </div>

      {/* AI assistant card */}
      <div className="absolute -left-2 bottom-2 w-64 animate-float-delayed rounded-2xl border border-white/10 bg-white p-3.5 text-slate-800 shadow-2xl sm:-left-6">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-[10px] font-bold text-white">AI</span>
          <p className="text-xs font-semibold">Support assistant</p>
          <span className="ml-auto text-[10px] font-medium text-emerald-600">online</span>
        </div>
        <p className="mt-2 rounded-xl rounded-tl-sm bg-slate-100 px-3 py-2 text-xs leading-relaxed">
          Try restarting the tracker and check the signal at the depot. Still offline? I&apos;ll alert the support team.
        </p>
      </div>
    </div>
  );
}
