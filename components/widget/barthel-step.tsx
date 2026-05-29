"use client";

import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import type { BarthelItem } from "@/lib/barthel";
import { barthelInterpretation } from "@/lib/barthel";
import type { WizardAnswers } from "./types";

export function BarthelStep({
  items,
  answers,
  onChange,
  currentScore,
}: {
  items: BarthelItem[];
  answers: WizardAnswers;
  onChange: (a: WizardAnswers) => void;
  currentScore: number;
}) {
  const interp = barthelInterpretation(currentScore);
  const answered = Object.keys(answers.barthelAnswers).length;

  return (
    <div className="space-y-6">
      <div>
        <h2
          className="text-xl font-semibold tracking-tight"
          style={{ color: "var(--brand)" }}
        >
          Skala Barthela — ocena samodzielności
        </h2>
        <p className="mt-2 text-sm text-[var(--muted-foreground)]">
          Wybierz odpowiedź najlepiej opisującą obecny stan przyszłego mieszkańca
          dla każdej z 10 czynności codziennych. Wynik 0–100 punktów.
        </p>
      </div>

      <div className="rounded-lg border border-[var(--border)] bg-white p-4 flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-wider text-[var(--muted-foreground)]">
            Aktualny wynik
          </p>
          <p className="text-2xl font-semibold" style={{ color: "var(--brand)" }}>
            {currentScore} <span className="text-sm text-[var(--muted-foreground)]">/ 100</span>
          </p>
        </div>
        <div className="text-right">
          <Badge variant="muted">
            {answered} / {items.length} odpowiedzi
          </Badge>
          {answered === items.length && (
            <p className="mt-2 text-xs text-[var(--muted-foreground)]">{interp.label}</p>
          )}
        </div>
      </div>

      <ol className="space-y-4">
        {items.map((item, idx) => {
          const value = answers.barthelAnswers[item.code];
          return (
            <li
              key={item.code}
              className="rounded-lg border border-[var(--border)] bg-white p-4"
            >
              <div className="flex items-start gap-3">
                <span
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
                  style={{ backgroundColor: "var(--brand)" }}
                >
                  {idx + 1}
                </span>
                <div className="flex-1 space-y-3">
                  <p className="text-sm font-medium">{item.label}</p>
                  {item.description ? (
                    <p className="text-xs text-[var(--muted-foreground)]">
                      {item.description}
                    </p>
                  ) : null}
                  <RadioGroup
                    value={value !== undefined ? String(value) : ""}
                    onValueChange={(v) =>
                      onChange({
                        ...answers,
                        barthelAnswers: {
                          ...answers.barthelAnswers,
                          [item.code]: Number(v),
                        },
                      })
                    }
                  >
                    {item.options.map((opt) => (
                      <label
                        key={opt.value}
                        className="flex items-center gap-3 p-2 rounded-md hover:bg-[var(--secondary)] cursor-pointer"
                      >
                        <RadioGroupItem
                          value={String(opt.value)}
                          id={`${item.code}-${opt.value}`}
                        />
                        <span className="flex-1 text-sm">{opt.label}</span>
                        <span className="text-xs font-mono text-[var(--muted-foreground)]">
                          {opt.value} pkt
                        </span>
                      </label>
                    ))}
                  </RadioGroup>
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
