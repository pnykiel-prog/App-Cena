import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Minus } from "lucide-react";
import { formatPLN } from "@/lib/utils";
import {
  PLAN_LIMITS,
  PLAN_LABEL,
  PLAN_PRICE,
  PLAN_ORDER,
  type Plan,
  type FeatureFlags,
  type PlanLimits,
} from "@/lib/plan-limits";

export const metadata = { title: "Super-admin — Plany" };

// Plany pokazywane w matrycy (bez TRIAL — to czasowy dostęp, nie plan handlowy).
const PLANS: Plan[] = PLAN_ORDER.filter((p) => p !== "TRIAL");

type LimitRow = {
  label: string;
  get: (l: PlanLimits) => number | null;
  suffix?: string;
};

const LIMIT_ROWS: LimitRow[] = [
  { label: "Wyceny / okres", get: (l) => l.monthlyQuoteLimit },
  { label: "Typy pokoi", get: (l) => l.maxRoomTypes },
  { label: "Usługi dodatkowe", get: (l) => l.maxAddonServices },
  { label: "Użytkownicy panelu", get: (l) => l.panelUsers },
  { label: "Domeny osadzenia", get: (l) => l.embedDomains },
  { label: "Retencja leadów", get: (l) => l.leadRetentionDays, suffix: " dni" },
  { label: "Audit log", get: (l) => l.auditLogMonths, suffix: " mies." },
];

type FeatureRow = { label: string; key: keyof FeatureFlags };

const FEATURE_ROWS: FeatureRow[] = [
  { label: "Analityka / lejek", key: "analyticsFunnel" },
  { label: "Eksport CSV/XLSX", key: "exportCsv" },
  { label: "Ukrycie „Powered by”", key: "hideBranding" },
  { label: "Wielu odbiorców e-mail", key: "emailMultipleRecipients" },
  { label: "Kalendarz Google", key: "calendarGoogle" },
  { label: "Kalendarz Outlook/iCal", key: "calendarOutlook" },
  { label: "Slack / Teams", key: "slackTeamsIntegration" },
  { label: "Powiadomienia SMS", key: "smsNotifications" },
  { label: "Webhook po leadzie", key: "webhookOnLead" },
  { label: "Własne pytania medyczne", key: "customQuestions" },
  { label: "Custom domena widgetu", key: "customDomain" },
  { label: "Wielojęzyczność", key: "multiLanguage" },
  { label: "REST API + klucze", key: "restApi" },
  { label: "SSO Google/Microsoft", key: "sso" },
  { label: "Audit log w panelu", key: "auditLog" },
  { label: "Wiele lokalizacji", key: "multiLocation" },
  { label: "Zapier / Make", key: "zapierMake" },
];

function fmtLimit(v: number | null, suffix = ""): string {
  return v === null ? "bez limitu" : `${v}${suffix}`;
}

export default function PlanyPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--primary)]">
          Plany abonamentowe
        </h1>
        <p className="text-sm text-[var(--muted-foreground)] mt-1">
          Matryca limitów i funkcji (read-only). Definicje pochodzą z{" "}
          <code className="text-xs bg-[var(--muted)] px-1 py-0.5 rounded">
            lib/plan-limits.ts
          </code>
          . Przypisanie planu i wyjątki per placówka ustawiasz na karcie tenanta.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Porównanie planów</CardTitle>
          <CardDescription>
            Trial (14 dni) daje dostęp na poziomie Pro. Limit wycen jest miękki —
            po przekroczeniu lead nadal jest zapisywany (flaga overLimit).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)]">
                  <th className="py-3 pr-3 text-left text-xs uppercase tracking-wider text-[var(--muted-foreground)]">
                    Funkcja / limit
                  </th>
                  {PLANS.map((p) => (
                    <th key={p} className="py-3 px-3 text-center">
                      <div className="font-semibold text-[var(--primary)]">
                        {PLAN_LABEL[p]}
                      </div>
                      <div className="text-xs font-normal text-[var(--muted-foreground)]">
                        {PLAN_PRICE[p] > 0
                          ? `${formatPLN(PLAN_PRICE[p])}/mies.`
                          : "wycena indyw."}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <SectionRow title="Limity" span={PLANS.length + 1} />
                {LIMIT_ROWS.map((row) => (
                  <tr
                    key={row.label}
                    className="border-b border-[var(--border)] last:border-0"
                  >
                    <td className="py-2.5 pr-3 text-[var(--foreground)]">
                      {row.label}
                    </td>
                    {PLANS.map((p) => (
                      <td
                        key={p}
                        className="py-2.5 px-3 text-center text-[var(--muted-foreground)]"
                      >
                        {fmtLimit(row.get(PLAN_LIMITS[p]), row.suffix)}
                      </td>
                    ))}
                  </tr>
                ))}

                <SectionRow title="Funkcje" span={PLANS.length + 1} />
                {FEATURE_ROWS.map((row) => (
                  <tr
                    key={row.key}
                    className="border-b border-[var(--border)] last:border-0"
                  >
                    <td className="py-2.5 pr-3 text-[var(--foreground)]">
                      {row.label}
                    </td>
                    {PLANS.map((p) => (
                      <td key={p} className="py-2.5 px-3 text-center">
                        {PLAN_LIMITS[p].features[row.key] ? (
                          <Check className="mx-auto h-4 w-4 text-emerald-600" />
                        ) : (
                          <Minus className="mx-auto h-4 w-4 text-[var(--border)]" />
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <p className="text-xs text-[var(--muted-foreground)]">
        <Badge variant="muted">i</Badge> Aby zmienić limity globalnie — edytuj{" "}
        <code className="bg-[var(--muted)] px-1 py-0.5 rounded">
          lib/plan-limits.ts
        </code>{" "}
        i wdróż. Aby zmienić limit dla jednej placówki — użyj „Nadpisań limitów” na
        karcie tenanta.
      </p>
    </div>
  );
}

function SectionRow({ title, span }: { title: string; span: number }) {
  return (
    <tr className="bg-[var(--muted)]/50">
      <td
        colSpan={span}
        className="py-2 pr-3 text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]"
      >
        {title}
      </td>
    </tr>
  );
}
