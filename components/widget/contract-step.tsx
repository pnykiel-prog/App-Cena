"use client";

import { useMemo } from "react";
import { Check } from "lucide-react";
import type { WidgetDiscount, WizardAnswers } from "./types";

const OPTIONS = [
  { months: 6, label: "Krócej / na próbę", sub: "do 6 miesięcy" },
  { months: 12, label: "Rok", sub: "12 miesięcy" },
  { months: 18, label: "Półtora roku", sub: "18 miesięcy" },
  { months: 24, label: "Dwa lata", sub: "24 miesiące" },
  { months: 36, label: "Dłużej niż 2 lata", sub: "powyżej 24 miesięcy" },
];

export function ContractStep({
  discounts,
  answers,
  onChange,
}: {
  discounts: WidgetDiscount[];
  answers: WizardAnswers;
  onChange: (a: WizardAnswers) => void;
}) {
  const sortedDiscounts = useMemo(
    () => [...discounts].sort((a, b) => b.minMonths - a.minMonths),
    [discounts],
  );

  function discountForMonths(m: number): number {
    const d = sortedDiscounts.find((x) => m >= x.minMonths);
    return d?.discountPct ?? 0;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2
          className="text-xl font-semibold tracking-tight"
          style={{ color: "var(--brand)" }}
        >
          Planowana długość pobytu
        </h2>
        <p className="mt-2 text-sm text-[var(--muted-foreground)]">
          Dłuższe umowy mają niższą cenę miesięczną. To tylko wstępna deklaracja —
          nie zobowiązuje do podpisania umowy w tym momencie.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {OPTIONS.map((opt) => {
          const active = answers.contractMonths === opt.months;
          const pct = discountForMonths(opt.months);
          return (
            <button
              key={opt.months}
              type="button"
              onClick={() => onChange({ ...answers, contractMonths: opt.months })}
              className="text-left rounded-xl border-2 p-4 transition-all bg-white relative"
              style={{
                borderColor: active ? "var(--brand)" : "var(--border)",
                boxShadow: active ? "0 4px 14px rgba(30,58,95,0.15)" : undefined,
              }}
            >
              {active && (
                <span
                  className="absolute top-3 right-3 flex h-6 w-6 items-center justify-center rounded-full text-white"
                  style={{ backgroundColor: "var(--brand)" }}
                >
                  <Check className="h-3.5 w-3.5" />
                </span>
              )}
              <p className="font-semibold text-base" style={{ color: "var(--brand)" }}>
                {opt.label}
              </p>
              <p className="mt-1 text-xs text-[var(--muted-foreground)]">{opt.sub}</p>
              {pct > 0 ? (
                <p
                  className="mt-3 text-xs font-semibold"
                  style={{ color: "var(--brand-accent)" }}
                >
                  Rabat −{(pct * 100).toFixed(0)}%
                </p>
              ) : (
                <p className="mt-3 text-xs text-[var(--muted-foreground)]">Bez rabatu</p>
              )}
            </button>
          );
        })}
      </div>

      {sortedDiscounts.length > 0 && (
        <div className="rounded-lg bg-[var(--brand-light,#e8eef5)] p-3 text-xs text-[var(--muted-foreground)]">
          <p className="font-medium" style={{ color: "var(--brand)" }}>
            Progi rabatów placówki:
          </p>
          <ul className="mt-1 space-y-0.5">
            {[...sortedDiscounts].reverse().map((d) => (
              <li key={d.id}>
                Od {d.minMonths} mies. — {(d.discountPct * 100).toFixed(0)}% taniej ({d.label})
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
