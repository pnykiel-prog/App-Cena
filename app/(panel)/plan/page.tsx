import { auth } from "@/lib/auth";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Check, Minus } from "lucide-react";
import { formatPLN } from "@/lib/utils";
import { getPlanUsage } from "@/lib/plan-usage";
import {
  PLAN_LIMITS,
  PLAN_LABEL,
  PLAN_PRICE,
  PLAN_ORDER,
  type Plan,
  type FeatureFlags,
} from "@/lib/plan-limits";

export const metadata = { title: "Plan" };

const PLANS: Plan[] = PLAN_ORDER.filter((p) => p !== "TRIAL");

const FEATURE_ROWS: { label: string; key: keyof FeatureFlags }[] = [
  { label: "Analityka / lejek", key: "analyticsFunnel" },
  { label: "Eksport CSV/XLSX", key: "exportCsv" },
  { label: "Ukrycie „Powered by”", key: "hideBranding" },
  { label: "Wielu odbiorców e-mail", key: "emailMultipleRecipients" },
  { label: "Integracja z kalendarzem", key: "calendarGoogle" },
  { label: "Wielojęzyczność", key: "multiLanguage" },
  { label: "Webhook po leadzie", key: "webhookOnLead" },
  { label: "REST API + klucze", key: "restApi" },
  { label: "Wiele lokalizacji", key: "multiLocation" },
];

function fmt(v: number | null, suffix = ""): string {
  return v === null ? "bez limitu" : `${v}${suffix}`;
}

export default async function PlanPage() {
  const session = await auth();
  const tenantId = session!.user.tenantId!;
  const usage = await getPlanUsage(tenantId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--primary)]">
          Twój plan
        </h1>
        <p className="text-sm text-[var(--muted-foreground)] mt-1">
          Bieżące wykorzystanie limitów i porównanie planów.
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                Plan {PLAN_LABEL[usage.plan]}
                <Badge variant={usage.status === "ACTIVE" ? "success" : "warning"}>
                  {usage.status}
                </Badge>
              </CardTitle>
              <CardDescription>
                {usage.trialEndsAt
                  ? `Trial do ${new Date(usage.trialEndsAt).toLocaleDateString("pl-PL")}.`
                  : "Aktywna subskrypcja."}
              </CardDescription>
            </div>
            <Button asChild variant="accent">
              <a href="mailto:office@bonamcuram.com?subject=CareQuote%20-%20zmiana%20planu">
                Zmień plan
              </a>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {usage.rows.map((row) => {
            const pct =
              row.limit === null
                ? null
                : Math.min(100, Math.round((row.used / row.limit) * 100));
            const warn = pct !== null && pct >= 80;
            return (
              <div key={row.key} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[var(--foreground)]">{row.label}</span>
                  <span
                    className={
                      warn
                        ? "font-medium text-amber-600"
                        : "text-[var(--muted-foreground)]"
                    }
                  >
                    {row.used} / {row.limit === null ? "∞" : row.limit}
                  </span>
                </div>
                {pct !== null && <Progress value={pct} />}
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Porównanie planów</CardTitle>
          <CardDescription>
            Limit wycen jest miękki — po przekroczeniu lead nadal jest zapisywany.
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
                      <div
                        className={
                          p === usage.plan
                            ? "font-semibold text-[var(--accent)]"
                            : "font-semibold text-[var(--primary)]"
                        }
                      >
                        {PLAN_LABEL[p]}
                        {p === usage.plan ? " ✓" : ""}
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
                <tr className="border-b border-[var(--border)]">
                  <td className="py-2.5 pr-3">Wyceny / okres</td>
                  {PLANS.map((p) => (
                    <td key={p} className="py-2.5 px-3 text-center text-[var(--muted-foreground)]">
                      {fmt(PLAN_LIMITS[p].monthlyQuoteLimit)}
                    </td>
                  ))}
                </tr>
                <tr className="border-b border-[var(--border)]">
                  <td className="py-2.5 pr-3">Typy pokoi</td>
                  {PLANS.map((p) => (
                    <td key={p} className="py-2.5 px-3 text-center text-[var(--muted-foreground)]">
                      {fmt(PLAN_LIMITS[p].maxRoomTypes)}
                    </td>
                  ))}
                </tr>
                <tr className="border-b border-[var(--border)]">
                  <td className="py-2.5 pr-3">Użytkownicy panelu</td>
                  {PLANS.map((p) => (
                    <td key={p} className="py-2.5 px-3 text-center text-[var(--muted-foreground)]">
                      {fmt(PLAN_LIMITS[p].panelUsers)}
                    </td>
                  ))}
                </tr>
                {FEATURE_ROWS.map((row) => (
                  <tr key={row.key} className="border-b border-[var(--border)] last:border-0">
                    <td className="py-2.5 pr-3">{row.label}</td>
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
    </div>
  );
}
