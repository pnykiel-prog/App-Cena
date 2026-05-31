"use client";

import { Checkbox } from "@/components/ui/checkbox";
import type { WidgetMedicalModifier, WizardAnswers } from "./types";
import { formatPLN } from "@/lib/utils";
import { useT } from "./i18n";

export function MedicalStep({
  modifiers,
  answers,
  onChange,
  currency,
}: {
  modifiers: WidgetMedicalModifier[];
  answers: WizardAnswers;
  onChange: (a: WizardAnswers) => void;
  currency: string;
}) {
  const t = useT();
  const KIND_LABEL = t.medical.kind;
  // Grupuj po kind
  const groups = modifiers.reduce<Record<string, WidgetMedicalModifier[]>>((acc, m) => {
    (acc[m.kind] ??= []).push(m);
    return acc;
  }, {});

  const selectedCount = Object.values(answers.modifiers).filter(Boolean).length;

  return (
    <div className="space-y-6">
      <div>
        <h2
          className="text-xl font-semibold tracking-tight"
          style={{ color: "var(--brand)" }}
        >
          {t.medical.title}
        </h2>
        <p className="mt-2 text-sm text-[var(--muted-foreground)]">{t.medical.desc}</p>
      </div>

      <div className="rounded-lg bg-[var(--brand-light,#e8eef5)] p-3 text-sm">
        {t.medical.selected(selectedCount)}
        {currency !== "PLN" ? ` (${currency})` : ""}.
      </div>

      <div className="space-y-6">
        {Object.entries(groups).map(([kind, items]) => (
          <div key={kind} className="space-y-2">
            <p className="text-xs uppercase tracking-wider font-semibold text-[var(--muted-foreground)]">
              {KIND_LABEL[kind as WidgetMedicalModifier["kind"]] ?? kind}
            </p>
            <ul className="space-y-2">
              {items.map((m) => {
                const checked = answers.modifiers[m.code] === true;
                return (
                  <li key={m.id}>
                    <label
                      className="flex items-start gap-3 rounded-lg border border-[var(--border)] bg-white p-3 cursor-pointer hover:border-[var(--brand)]/40"
                      style={
                        checked
                          ? {
                              borderColor: "var(--brand)",
                              boxShadow: "0 0 0 1px var(--brand)",
                            }
                          : undefined
                      }
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(v) =>
                          onChange({
                            ...answers,
                            modifiers: {
                              ...answers.modifiers,
                              [m.code]: v === true,
                            },
                          })
                        }
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{m.label}</p>
                        {m.description ? (
                          <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
                            {m.description}
                          </p>
                        ) : null}
                      </div>
                      <span
                        className="text-xs font-mono whitespace-nowrap"
                        style={{ color: "var(--brand)" }}
                      >
                        + {formatPLN(m.monthlySurcharge)} / mies.
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
