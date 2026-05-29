"use client";

import { useEffect, useRef } from "react";

/**
 * Wewnątrz iframe widgetu — mierzy wysokość strony i raportuje do okna
 * rodzica via postMessage. Pozwala embed.js dynamicznie skalować iframe.
 * Dodatkowo wysyła scroll-to-top przy zmianie ścieżki (np. zmiana kroku).
 */
export function ResizeReporter({ stepKey }: { stepKey?: string }) {
  const lastHeight = useRef<number>(0);

  useEffect(() => {
    if (typeof window === "undefined" || window.parent === window) return;

    function send(height: number) {
      if (Math.abs(height - lastHeight.current) < 8) return;
      lastHeight.current = height;
      window.parent.postMessage(
        { type: "carequote-resize", height },
        "*",
      );
    }

    function measure() {
      const html = document.documentElement;
      const body = document.body;
      const h = Math.max(
        body.scrollHeight,
        body.offsetHeight,
        html.scrollHeight,
        html.offsetHeight,
      );
      send(h);
    }

    measure();

    const ro = new ResizeObserver(() => {
      measure();
    });
    ro.observe(document.documentElement);

    // Reagujemy też na window resize (np. obrót urządzenia).
    const onWinResize = () => measure();
    window.addEventListener("resize", onWinResize);

    return () => {
      ro.disconnect();
      window.removeEventListener("resize", onWinResize);
    };
  }, []);

  // Scroll-to-top przy zmianie kroku — komfort UX gdy iframe jest długi
  // i krok zmienia całą zawartość.
  useEffect(() => {
    if (typeof window === "undefined" || window.parent === window) return;
    if (!stepKey) return;
    window.parent.postMessage({ type: "carequote-scroll-top" }, "*");
  }, [stepKey]);

  return null;
}
