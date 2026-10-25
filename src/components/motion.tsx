"use client";

import { useEffect, useRef, useState } from "react";

// "unknown" until the browser has checked the element's position.
// Content is visible in that state, so the page still works if JavaScript
// fails; only elements confirmed to be off-screen are hidden and animated in.
type ViewState = "unknown" | "hidden" | "visible";

function useInView<T extends Element>(threshold = 0.15) {
  const ref = useRef<T>(null);
  const [state, setState] = useState<ViewState>("unknown");

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setState("visible");
          observer.disconnect();
        } else {
          setState((s) => (s === "unknown" ? "hidden" : s));
        }
      },
      { threshold },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);

  return { ref, state };
}

/** Fades and slides its children up the first time they scroll into view. */
export function Reveal({
  children,
  delay = 0,
  className = "",
  as: Tag = "div",
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
  as?: "div" | "li" | "section";
}) {
  const { ref, state } = useInView<HTMLDivElement>();
  return (
    <Tag
      ref={ref as React.Ref<never>}
      data-reveal={state}
      className={`reveal ${className}`}
      style={{ "--reveal-delay": `${delay}ms` } as React.CSSProperties}
    >
      {children}
    </Tag>
  );
}

/**
 * Shows `value`, and counts up to it from 0 when it scrolls into view.
 * Without JavaScript, or with reduced motion, the final value is shown.
 */
export function CountUp({ value, suffix = "", duration = 1400 }: { value: number; suffix?: string; duration?: number }) {
  const { ref, state } = useInView<HTMLSpanElement>(0.5);
  const [display, setDisplay] = useState<number | null>(null);

  useEffect(() => {
    if (state !== "visible") return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(t >= 1 ? null : Math.round(eased * value));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [state, value, duration]);

  return (
    <span ref={ref} aria-label={`${value}${suffix}`}>
      <span aria-hidden="true">
        {state === "hidden" ? 0 : (display ?? value)}
        {suffix}
      </span>
    </span>
  );
}
