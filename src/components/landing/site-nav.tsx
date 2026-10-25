"use client";

import { useEffect, useState } from "react";
import { NAV_LINKS, OFFICIAL_SITE } from "@/lib/site-content";
import { Logo } from "./logo";

export function SiteNav() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const solid = scrolled || menuOpen;

  return (
    <header className="fixed inset-x-0 top-0 z-40">
      {/* Concept notice: collapses after scrolling */}
      <div
        className={`overflow-hidden bg-emerald-950 text-center text-[11px] text-emerald-100 transition-all duration-300 sm:text-xs ${
          scrolled ? "max-h-0 py-0" : "max-h-16 px-4 py-1.5"
        }`}
      >
        Concept redesign created for a Gokul Infocare job assessment. Official website:{" "}
        <a href={OFFICIAL_SITE} className="font-semibold underline underline-offset-2" target="_blank" rel="noreferrer">
          gokulinfocare.com
        </a>
      </div>

      <div
        className={`transition-all duration-300 ${
          solid ? "bg-white/90 shadow-sm shadow-slate-900/5 backdrop-blur-md" : "bg-transparent"
        }`}
      >
        <nav aria-label="Main" className="mx-auto flex max-w-7xl items-center gap-6 px-4 py-3 sm:px-6">
          <a href="#top" className="rounded-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-500">
            <Logo dark={!solid} />
          </a>

          <ul className="ml-auto hidden items-center gap-1 lg:flex">
            {NAV_LINKS.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  className={`group relative rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                    solid ? "text-slate-700 hover:text-emerald-700" : "text-white/85 hover:text-white"
                  }`}
                >
                  {link.label}
                  <span className="absolute inset-x-3 -bottom-0.5 h-0.5 origin-left scale-x-0 rounded-full bg-emerald-500 transition-transform duration-300 group-hover:scale-x-100" />
                </a>
              </li>
            ))}
          </ul>

          <a
            href="#contact"
            className="ml-auto hidden rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-500/25 transition-transform hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500 sm:inline-flex lg:ml-0"
          >
            Get in touch
          </a>

          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            className={`ml-auto rounded-md p-2 sm:ml-0 lg:hidden ${solid ? "text-slate-800" : "text-white"}`}
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              {menuOpen ? <path d="M6 6l12 12M18 6 6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
            </svg>
          </button>
        </nav>

        {menuOpen && (
          <ul id="mobile-menu" className="animate-pop-in border-t border-slate-200 bg-white px-4 py-3 lg:hidden">
            {NAV_LINKS.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  onClick={() => setMenuOpen(false)}
                  className="block rounded-lg px-3 py-3 text-base font-medium text-slate-800 hover:bg-emerald-50"
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
    </header>
  );
}
