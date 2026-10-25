import {
  ACCREDITATIONS,
  CLIENTS,
  CONTACT_EMAIL,
  CONTACT_PHONE,
  OFFICIAL_CONTACT_PAGE,
  OFFICIAL_SITE,
  SERVICES,
  STATS,
} from "@/lib/site-content";
import { CountUp, Reveal } from "../motion";
import { Logo } from "./logo";
import { OpenChatButton } from "./open-chat-button";
import { SolutionsTabs } from "./solutions-tabs";

function SectionHeading({ eyebrow, title, text, light = false }: { eyebrow: string; title: string; text?: string; light?: boolean }) {
  return (
    <Reveal className="mx-auto max-w-2xl text-center">
      <p className={`text-sm font-semibold uppercase tracking-[0.18em] ${light ? "text-emerald-300" : "text-emerald-700"}`}>{eyebrow}</p>
      <h2 className={`mt-3 text-3xl font-bold tracking-tight sm:text-4xl ${light ? "text-white" : "text-slate-900"}`}>{title}</h2>
      {text && <p className={`mt-4 text-lg leading-relaxed ${light ? "text-slate-300" : "text-slate-600"}`}>{text}</p>}
    </Reveal>
  );
}

const Check = ({ className = "h-4 w-4" }: { className?: string }) => (
  <svg aria-hidden="true" viewBox="0 0 20 20" className={className} fill="currentColor">
    <path d="M16.7 5.3a1 1 0 0 1 0 1.4l-8 8a1 1 0 0 1-1.4 0l-4-4a1 1 0 1 1 1.4-1.4L8 12.6l7.3-7.3a1 1 0 0 1 1.4 0Z" />
  </svg>
);

export function Stats() {
  return (
    <section aria-label="Key facts" className="relative z-10 -mt-12 px-4 sm:px-6">
      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-px overflow-hidden rounded-3xl border border-slate-200 bg-slate-200 shadow-2xl shadow-slate-900/10 lg:grid-cols-4">
        {STATS.map((s, i) => (
          <Reveal key={s.label} delay={i * 100} className="bg-white px-6 py-8 text-center">
            <p className="bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-4xl font-extrabold tracking-tight text-transparent sm:text-5xl">
              <CountUp value={s.value} suffix={s.suffix} />
            </p>
            <p className="mt-2 text-sm leading-snug text-slate-600">{s.label}</p>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

export function Services() {
  return (
    <section id="services" className="scroll-mt-20 py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <SectionHeading
          eyebrow="What we do"
          title="Services built around your business"
          text="From enterprise systems to connected devices and the people who run them."
        />
        <ul className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {SERVICES.map((s, i) => (
            <Reveal as="li" key={s.title} delay={(i % 4) * 90}>
              <div className="group relative h-full rounded-2xl bg-gradient-to-br from-slate-200 to-slate-100 p-px transition-all duration-300 hover:-translate-y-1.5 hover:from-emerald-400 hover:to-teal-500 hover:shadow-xl hover:shadow-emerald-500/15">
                <div className="h-full rounded-[15px] bg-white p-6">
                  <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-50 to-teal-50 text-emerald-700 transition-all duration-300 group-hover:rotate-6 group-hover:scale-110 group-hover:from-emerald-500 group-hover:to-teal-600 group-hover:text-white">
                    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d={s.icon} />
                    </svg>
                  </span>
                  <h3 className="mt-5 text-lg font-semibold text-slate-900">{s.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">{s.text}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  );
}

export function Solutions() {
  return (
    <section id="solutions" className="scroll-mt-20 bg-gradient-to-b from-slate-50 to-emerald-50/40 py-24">
      <div className="mx-auto max-w-6xl px-4 text-center sm:px-6">
        <SectionHeading
          eyebrow="Solutions"
          title="Smart solutions, ready to deploy"
          text="IoT and GIS products that turn locations, vehicles and parking bays into live business data."
        />
        <Reveal className="mt-12 text-left">
          <div className="text-center">
            <SolutionsTabs />
          </div>
        </Reveal>
      </div>
    </section>
  );
}

export function AiSupport() {
  const steps = [
    { title: "Describe the issue", text: "Customers explain the problem in their own words, any time of day." },
    { title: "Instant step-by-step fixes", text: "The AI suggests safe troubleshooting steps and asks questions when details are missing." },
    { title: "Smart hand-over", text: "If it can't be fixed, the AI sets a priority and prepares an email for the support team with the full conversation." },
  ];
  const demo = [
    { me: true, text: "Our vehicle tracker stopped updating this morning." },
    { me: false, text: "Sorry about that! Let's check: 1. Is the device powered? 2. Is there mobile signal at the depot? 3. Restart it and wait 5 minutes." },
    { me: true, text: "Still offline." },
    { me: false, text: "I've prepared a High-priority support email for our team with everything you told me." },
  ];

  return (
    <section id="ai-support" className="relative isolate scroll-mt-20 overflow-hidden bg-slate-950 py-24 text-white">
      <div aria-hidden="true" className="absolute inset-0 -z-10">
        <div className="absolute -right-20 top-0 h-96 w-96 animate-blob rounded-full bg-emerald-500/20 blur-3xl" />
        <div className="absolute -left-20 bottom-0 h-96 w-96 animate-blob rounded-full bg-cyan-500/15 blur-3xl [animation-delay:-8s]" />
      </div>
      <div className="mx-auto grid max-w-7xl items-center gap-14 px-4 sm:px-6 lg:grid-cols-2">
        <div>
          <Reveal>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-300">New · AI-powered support</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">Support that never sleeps</h2>
            <p className="mt-4 text-lg leading-relaxed text-slate-300">
              Our Google Gemini assistant solves common problems instantly and hands complex issues to a human with a ready-made
              summary.
            </p>
          </Reveal>
          <ol className="mt-10 space-y-6">
            {steps.map((s, i) => (
              <Reveal as="li" key={s.title} delay={i * 120} className="flex gap-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 font-bold text-slate-950">
                  {i + 1}
                </span>
                <div>
                  <h3 className="font-semibold">{s.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-slate-400">{s.text}</p>
                </div>
              </Reveal>
            ))}
          </ol>
          <Reveal delay={400}>
            <OpenChatButton className="mt-10 inline-flex items-center gap-2 rounded-full bg-white px-6 py-3.5 text-sm font-semibold text-slate-900 shadow-xl transition-transform hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
              Try the assistant now →
            </OpenChatButton>
          </Reveal>
        </div>

        <Reveal delay={150}>
          <div aria-hidden="true" className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 shadow-2xl backdrop-blur">
            <div className="flex items-center gap-3 border-b border-white/10 pb-4">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 text-xs font-bold text-slate-950">AI</span>
              <div>
                <p className="text-sm font-semibold">Gokul Infocare Assistant</p>
                <p className="text-xs text-emerald-300">● Online</p>
              </div>
            </div>
            <div className="mt-4 space-y-3">
              {demo.map((m, i) => (
                <Reveal key={i} delay={300 + i * 450} className={`flex ${m.me ? "justify-end" : "justify-start"}`}>
                  <p
                    className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                      m.me ? "rounded-br-sm bg-gradient-to-r from-emerald-500 to-teal-500 text-white" : "rounded-bl-sm bg-white/10 text-slate-100"
                    }`}
                  >
                    {m.text}
                  </p>
                </Reveal>
              ))}
              <Reveal delay={2200}>
                <div className="flex items-center gap-2 rounded-xl border border-amber-300/30 bg-amber-300/10 px-3 py-2 text-xs text-amber-100">
                  <span>✉</span> [High] Technical Issue: Tracker not reporting location
                </div>
              </Reveal>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

export function About() {
  return (
    <section id="about" className="scroll-mt-20 py-24">
      <div className="mx-auto grid max-w-7xl items-center gap-14 px-4 sm:px-6 lg:grid-cols-2">
        <Reveal>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-700">About us</p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Trusted by government and enterprise
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-slate-600">
            Gokul Infocare is a technology company offering services and solutions to customers in Australia and New Zealand.
            Our consultants have delivered for public sector and enterprise clients and have received awards and appreciation
            for their work.
          </p>
        </Reveal>
        <ul className="space-y-4">
          {ACCREDITATIONS.map((a, i) => (
            <Reveal as="li" key={a} delay={i * 120}>
              <div className="flex items-start gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-lg">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white">
                  <svg aria-hidden="true" viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 3 4 6v6c0 4.5 3.4 8.3 8 9 4.6-.7 8-4.5 8-9V6l-8-3Z" />
                    <path d="m9 12 2 2 4-4" />
                  </svg>
                </span>
                <p className="pt-1 font-medium text-slate-800">{a}</p>
              </div>
            </Reveal>
          ))}
        </ul>
      </div>

      <div className="mx-auto mt-20 max-w-7xl px-4 sm:px-6">
        <Reveal>
          <p className="text-center text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
            Our consultants have delivered for
          </p>
        </Reveal>
        <div className="relative mt-6 overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_12%,black_88%,transparent)]">
          <ul className="flex w-max animate-marquee gap-4 hover:[animation-play-state:paused]">
            {[...CLIENTS, ...CLIENTS, ...CLIENTS, ...CLIENTS].map((c, i) => (
              <li
                key={`${c}-${i}`}
                aria-hidden={i >= CLIENTS.length ? true : undefined}
                className="whitespace-nowrap rounded-full border border-slate-200 bg-white px-6 py-3 text-base font-semibold text-slate-700 shadow-sm"
              >
                {c}
              </li>
            ))}
          </ul>
        </div>
        <p className="mt-4 text-center text-xs text-slate-500">Organisation names are trademarks of their respective owners, shown for information only.</p>
      </div>
    </section>
  );
}

export function Recruitment() {
  const cards = [
    { title: "IT recruitment", text: "IT professionals for your projects and teams.", icon: "💻" },
    { title: "Medical recruitment", text: "Medical professionals for healthcare organisations.", icon: "🩺" },
  ];
  return (
    <section id="recruitment" className="scroll-mt-20 bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-700 py-24 text-white">
      <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-[1fr_1.2fr]">
        <Reveal>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-100">Recruitment</p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">The right people for IT and healthcare</h2>
          <p className="mt-4 text-lg leading-relaxed text-emerald-50">
            A Queensland State Government approved recruitment provider in IT and medical, and a registered labour hire
            provider.
          </p>
          <a
            href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent("Recruitment enquiry")}`}
            className="mt-8 inline-flex rounded-full bg-white px-6 py-3.5 text-sm font-semibold text-teal-800 shadow-xl transition-transform hover:-translate-y-0.5"
          >
            Talk to our recruitment team
          </a>
        </Reveal>
        <div className="grid gap-5 sm:grid-cols-2">
          {cards.map((c, i) => (
            <Reveal key={c.title} delay={i * 150}>
              <div className="h-full rounded-3xl border border-white/20 bg-white/10 p-7 backdrop-blur transition-transform duration-300 hover:-translate-y-1.5">
                <span aria-hidden="true" className="text-4xl">{c.icon}</span>
                <h3 className="mt-4 text-xl font-semibold">{c.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-emerald-50">{c.text}</p>
                <p className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-medium">
                  <Check className="h-3.5 w-3.5" /> QLD Government approved
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

export function Contact() {
  return (
    <section id="contact" className="scroll-mt-20 py-24">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <Reveal>
          <div className="relative isolate overflow-hidden rounded-[2rem] bg-slate-950 px-6 py-14 text-center text-white shadow-2xl sm:px-12">
            <div aria-hidden="true" className="absolute inset-0 -z-10">
              <div className="absolute -left-10 -top-10 h-72 w-72 animate-blob rounded-full bg-emerald-500/30 blur-3xl" />
              <div className="absolute -bottom-10 -right-10 h-72 w-72 animate-blob rounded-full bg-cyan-500/25 blur-3xl [animation-delay:-9s]" />
            </div>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Let&apos;s build what&apos;s next</h2>
            <p className="mx-auto mt-4 max-w-xl text-lg text-slate-300">
              Talk to us about ERP, SAP, IoT, GIS, mobile apps or recruitment. Or ask our AI assistant right now.
            </p>
            <div className="mt-9 flex flex-wrap justify-center gap-3">
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 px-6 py-3.5 text-sm font-semibold shadow-xl shadow-emerald-500/30 transition-transform hover:-translate-y-0.5"
              >
                ✉ {CONTACT_EMAIL}
              </a>
              <a
                href={`tel:${CONTACT_PHONE.replace(/\s/g, "")}`}
                className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-6 py-3.5 text-sm font-semibold transition-colors hover:bg-white/10"
              >
                ☎ {CONTACT_PHONE}
              </a>
              <OpenChatButton className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-6 py-3.5 text-sm font-semibold transition-colors hover:bg-white/10">
                ✦ Chat with AI
              </OpenChatButton>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

export function Footer() {
  return (
    <footer className="bg-slate-950 text-slate-400">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <Logo dark />
          <p className="mt-4 max-w-sm text-sm leading-relaxed">
            Technology services and solutions for organisations across Australia and New Zealand.
          </p>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-white">Services</h3>
          <ul className="mt-4 space-y-2 text-sm">
            {SERVICES.slice(0, 6).map((s) => (
              <li key={s.title}>
                <a href="#services" className="transition-colors hover:text-emerald-300">
                  {s.title}
                </a>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-white">Contact</h3>
          <ul className="mt-4 space-y-2 text-sm">
            <li>
              <a href={`mailto:${CONTACT_EMAIL}`} className="hover:text-emerald-300">{CONTACT_EMAIL}</a>
            </li>
            <li>
              <a href={`tel:${CONTACT_PHONE.replace(/\s/g, "")}`} className="hover:text-emerald-300">{CONTACT_PHONE}</a>
            </li>
            <li>
              <a href={OFFICIAL_CONTACT_PAGE} target="_blank" rel="noreferrer" className="hover:text-emerald-300">
                Official contact page ↗
              </a>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10">
        <p className="mx-auto max-w-7xl px-4 py-6 text-xs leading-relaxed sm:px-6">
          Concept redesign created for a job assessment. It is not the official Gokul Infocare website. Content is based on{" "}
          <a href={OFFICIAL_SITE} target="_blank" rel="noreferrer" className="underline underline-offset-2 hover:text-emerald-300">
            gokulinfocare.com
          </a>
          . AI answers can be wrong, and nothing is sent automatically.
        </p>
      </div>
    </footer>
  );
}
