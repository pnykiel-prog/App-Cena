"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { WidgetTenant, WizardAnswers } from "./types";
import { useT } from "./i18n";

export function IntroStep({
  tenant,
  answers,
  onChange,
}: {
  tenant: WidgetTenant;
  answers: WizardAnswers;
  onChange: (a: WizardAnswers) => void;
}) {
  const t = useT();
  return (
    <div className="space-y-6">
      <div>
        <h2
          className="text-2xl font-semibold tracking-tight"
          style={{ color: "var(--brand)" }}
        >
          {t.intro.welcome(tenant.name)}
        </h2>
        <p className="mt-2 text-sm text-[var(--muted-foreground)]">{t.intro.lead}</p>
      </div>

      <div className="rounded-lg bg-[var(--brand-light,#e8eef5)] p-4 text-sm">
        <p className="font-medium" style={{ color: "var(--brand)" }}>
          {t.intro.howItWorks}
        </p>
        <ol className="mt-2 space-y-1 text-[var(--muted-foreground)] list-decimal list-inside">
          <li>{t.intro.s1}</li>
          <li>{t.intro.s2}</li>
          <li>{t.intro.s3}</li>
          <li>{t.intro.s4}</li>
          <li>{t.intro.s5}</li>
        </ol>
      </div>

      <div className="space-y-4 pt-2">
        <p className="text-sm font-medium text-[var(--foreground)]">
          {t.intro.seniorOptional}
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="seniorFirstName">{t.intro.firstName}</Label>
            <Input
              id="seniorFirstName"
              placeholder={t.intro.firstNamePlaceholder}
              value={answers.seniorFirstName ?? ""}
              onChange={(e) =>
                onChange({ ...answers, seniorFirstName: e.target.value })
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="seniorAge">{t.intro.age}</Label>
            <Input
              id="seniorAge"
              type="number"
              min={40}
              max={120}
              placeholder={t.intro.agePlaceholder}
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
