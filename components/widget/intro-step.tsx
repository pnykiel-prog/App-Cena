"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { WidgetTenant, WizardAnswers } from "./types";

export function IntroStep({
  tenant,
  answers,
  onChange,
}: {
  tenant: WidgetTenant;
  answers: WizardAnswers;
  onChange: (a: WizardAnswers) => void;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h2
          className="text-2xl font-semibold tracking-tight"
          style={{ color: "var(--brand)" }}
        >
          Witaj w wycenie {tenant.name}
        </h2>
        <p className="mt-2 text-sm text-[var(--muted-foreground)]">
          Odpowiedz na kilka pytań o stanie zdrowia i preferencjach przyszłego
          mieszkańca. W 5 minut otrzymasz <strong>anonimową wycenę widełkową</strong>{" "}
          pobytu. Nie zbieramy danych osobowych do momentu wyświetlenia wyniku.
        </p>
      </div>

      <div className="rounded-lg bg-[var(--brand-light,#e8eef5)] p-4 text-sm">
        <p className="font-medium" style={{ color: "var(--brand)" }}>
          Jak to działa
        </p>
        <ol className="mt-2 space-y-1 text-[var(--muted-foreground)] list-decimal list-inside">
          <li>Ocena samodzielności (skala Barthela, 10 pytań)</li>
          <li>Stan zdrowia i opieka specjalistyczna</li>
          <li>Wybór pokoju i dodatkowych usług</li>
          <li>Długość planowanej umowy → rabat</li>
          <li>Wycena „od–do" z rozbiciem pozycji</li>
        </ol>
      </div>

      <div className="space-y-4 pt-2">
        <p className="text-sm font-medium text-[var(--foreground)]">
          Opcjonalnie — krótkie info o seniorze (pomaga personalizować PDF):
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="seniorFirstName">Imię (opcjonalnie)</Label>
            <Input
              id="seniorFirstName"
              placeholder="np. Janina"
              value={answers.seniorFirstName ?? ""}
              onChange={(e) =>
                onChange({ ...answers, seniorFirstName: e.target.value })
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="seniorAge">Wiek (opcjonalnie)</Label>
            <Input
              id="seniorAge"
              type="number"
              min={40}
              max={120}
              placeholder="np. 82"
              value={answers.seniorAge ?? ""}
              onChange={(e) =>
                onChange({
                  ...answers,
                  seniorAge: e.target.value ? Number(e.target.value) : undefined,
                })
              }
            />
          </div>
        </div>
      </div>
    </div>
  );
}
