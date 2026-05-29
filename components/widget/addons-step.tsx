"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { formatPLN } from "@/lib/utils";
import type { WidgetAddon, WizardAnswers } from "./types";

const UNIT_LABEL: Record<WidgetAddon["unit"], string> = {
  PER_MONTH: "ryczałt miesięczny",
  PER_DAY: "za dobę",
  PER_HOUR: "za godzinę",
  PER_VISIT: "za zabieg / wizytę",
};

const UNIT_SHORT: Record<WidgetAddon["unit"], string> = {
  PER_MONTH: "mies.",
  PER_DAY: "doba",
  PER_HOUR: "godz.",
  PER_VISIT: "zabieg",
};

const DAYS_PER_MONTH = 30.44;

function monthlyEquivalent(addon: WidgetAddon, count: number): number {
  switch (addon.unit) {
    case "PER_MONTH":
      return addon.unitPrice;
    case "PER_DAY":
      return addon.unitPrice * (count > 0 ? count : DAYS_PER_MONTH);
    case "PER_VISIT":
    case "PER_HOUR":
      return addon.unitPrice * Math.max(0, count);
  }
}

export function AddonsStep({
  addons,
  answers,
  onChange,
  currency,
}: {
  addons: WidgetAddon[];
  answers: WizardAnswers;
  onChange: (a: WizardAnswers) => void;
  currency: string;
}) {
  const isSelected = (code: string) =>
    answers.selectedAddons.some((a) => a.code === code);
  const getCount = (code: string) =>
    answers.selectedAddons.find((a) => a.code === code)?.monthlyCountEstimate ?? 0;

  function toggle(addon: WidgetAddon, on: boolean) {
    if (on) {
      const initial =
        addon.unit === "PER_MONTH" ? 1 : addon.defaultMonthly ?? 1;
      onChange({
        ...answers,
        selectedAddons: [
          ...answers.selectedAddons.filter((a) => a.code !== addon.code),
          { code: addon.code, monthlyCountEstimate: initial },
        ],
      });
    } else {
      onChange({
        ...answers,
        selectedAddons: answers.selectedAddons.filter((a) => a.code !== addon.code),
      });
    }
  }

  function setCount(code: string, value: number) {
    onChange({
      ...answers,
      selectedAddons: answers.selectedAddons.map((a) =>
        a.code === code ? { ...a, monthlyCountEstimate: value } : a,
      ),
    });
  }

  const total = answers.selectedAddons.reduce((sum, sel) => {
    const a = addons.find((x) => x.code === sel.code);
    return a ? sum + monthlyEquivalent(a, sel.monthlyCountEstimate) : sum;
  }, 0);

  return (
    <div className="space-y-6">
      <div>
        <h2
          className="text-xl font-semibold tracking-tight"
          style={{ color: "var(--brand)" }}
        >
          Usługi dodatkowe
        </h2>
        <p className="mt-2 text-sm text-[var(--muted-foreground)]">
          Zaznacz usługi, z których będzie korzystał mieszkaniec. Dla usług rozliczanych
          „za zabieg" lub „za godzinę" podaj szacowaną liczbę w miesiącu.
        </p>
      </div>

      <div
        className="rounded-lg p-4 text-white"
        style={{ backgroundColor: "var(--brand)" }}
      >
        <p className="text-xs uppercase tracking-wider opacity-80">
          Sumaryczny ekwiwalent miesięczny
        </p>
        <p className="mt-1 text-2xl font-bold">{formatPLN(total)}</p>
        <p className="text-xs opacity-80">
          {answers.selectedAddons.length} usług · {currency}
        </p>
      </div>

      <ul className="space-y-3">
        {addons.map((a) => {
          const selected = isSelected(a.code);
          const count = getCount(a.code);
          const equiv = selected ? monthlyEquivalent(a, count) : 0;
          const isMonth = a.unit === "PER_MONTH";
          return (
            <li
              key={a.id}
              className="rounded-lg border border-[var(--border)] bg-white p-4"
              style={
                selected
                  ? {
                      borderColor: "var(--brand)",
                      boxShadow: "0 0 0 1px var(--brand)",
                    }
                  : undefined
              }
            >
              <div className="flex items-start gap-3">
                <Checkbox
                  checked={selected}
                  onCheckedChange={(v) => toggle(a, v === true)}
                  className="mt-1"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="text-sm font-medium">{a.label}</p>
                    <p className="text-xs font-mono text-[var(--muted-foreground)] whitespace-nowrap">
                      {formatPLN(a.unitPrice)} / {UNIT_SHORT[a.unit]}
                    </p>
                  </div>
                  {a.description ? (
                    <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                      {a.description}
                    </p>
                  ) : null}
                  <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                    Rozliczenie: {UNIT_LABEL[a.unit]}
                  </p>

                  {selected && !isMonth && (
                    <div className="mt-3 flex items-center gap-3 max-w-xs">
                      <label
                        htmlFor={`count-${a.code}`}
                        className="text-xs text-[var(--muted-foreground)] whitespace-nowrap"
                      >
                        Szacowana liczba/mies.:
                      </label>
                      <Input
                        id={`count-${a.code}`}
                        type="number"
                        min={0}
                        max={a.unit === "PER_HOUR" ? 200 : 31}
                        value={count}
                        onChange={(e) => setCount(a.code, Number(e.target.value) || 0)}
                        className="h-8 w-20"
                      />
                    </div>
                  )}

                  {selected && (
                    <p
                      className="mt-2 text-xs font-medium"
                      style={{ color: "var(--brand)" }}
                    >
                      Ekwiwalent miesięczny: {formatPLN(equiv)}
                    </p>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
