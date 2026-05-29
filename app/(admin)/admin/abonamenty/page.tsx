import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatPLN } from "@/lib/utils";
import { CreditCard, TrendingUp } from "lucide-react";

export const metadata = { title: "Super-admin — Abonamenty" };

const PLAN_LABEL: Record<string, string> = {
  TRIAL: "Trial",
  STARTER: "Starter",
  PRO: "PRO",
  ENTERPRISE: "Enterprise",
};

const STATUS_VARIANT: Record<string, "muted" | "success" | "warning" | "danger"> = {
  TRIAL: "warning",
  ACTIVE: "success",
  PAST_DUE: "warning",
  CANCELLED: "danger",
};

const STATUS_LABEL: Record<string, string> = {
  TRIAL: "Trialing",
  ACTIVE: "Aktywna",
  PAST_DUE: "Zaległość",
  CANCELLED: "Anulowana",
};

export default async function AbonamentyPage() {
  const subscriptions = await prisma.subscription.findMany({
    orderBy: [{ status: "asc" }, { plan: "asc" }],
    include: {
      tenant: {
        select: { id: true, name: true, slug: true, status: true },
      },
    },
  });

  // Agregaty per plan
  const byPlan = subscriptions.reduce<
    Record<string, { count: number; activeCount: number; mrr: number }>
  >((acc, s) => {
    const k = s.plan;
    if (!acc[k]) acc[k] = { count: 0, activeCount: 0, mrr: 0 };
    acc[k].count++;
    if (s.status === "ACTIVE") {
      acc[k].activeCount++;
      acc[k].mrr += s.monthlyPrice;
    }
    return acc;
  }, {});

  const mrrTotal = Object.values(byPlan).reduce((s, p) => s + p.mrr, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--primary)]">
          Abonamenty
        </h1>
        <p className="text-sm text-[var(--muted-foreground)] mt-1">
          Globalny przegląd subskrypcji. Edycja per tenant na stronie szczegółów.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-md bg-[var(--secondary)] flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-[var(--primary)]" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider text-[var(--muted-foreground)]">
                  MRR (łącznie)
                </p>
                <p className="text-2xl font-semibold text-[var(--primary)]">
                  {formatPLN(mrrTotal)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {(["TRIAL", "STARTER", "PRO", "ENTERPRISE"] as const).map((p) => {
          const stats = byPlan[p] ?? { count: 0, activeCount: 0, mrr: 0 };
          return (
            <Card key={p}>
              <CardContent className="pt-6">
                <p className="text-xs uppercase tracking-wider text-[var(--muted-foreground)]">
                  Plan {PLAN_LABEL[p]}
                </p>
                <p className="mt-1 text-2xl font-semibold text-[var(--primary)]">
                  {stats.count}
                </p>
                <p className="text-xs text-[var(--muted-foreground)]">
                  {stats.activeCount} aktywnych · {formatPLN(stats.mrr)} MRR
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-[var(--muted-foreground)]" />
            <CardTitle>Wszystkie subskrypcje ({subscriptions.length})</CardTitle>
          </div>
          <CardDescription>
            Klikalne wiersze prowadzą do edycji subskrypcji w karcie tenanta.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {subscriptions.length === 0 ? (
            <p className="text-sm text-[var(--muted-foreground)] text-center py-8">
              Brak subskrypcji.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wider text-[var(--muted-foreground)] border-b border-[var(--border)]">
                    <th className="py-2 pr-3">Tenant</th>
                    <th className="py-2 pr-3">Plan</th>
                    <th className="py-2 pr-3">Status</th>
                    <th className="py-2 pr-3 text-right">MRR</th>
                    <th className="py-2 pr-3 text-right">Trial kończy</th>
                    <th className="py-2 pr-3 text-right">Okres do</th>
                  </tr>
                </thead>
                <tbody>
                  {subscriptions.map((s) => (
                    <tr
                      key={s.id}
                      className="border-b border-[var(--border)] last:border-0"
                    >
                      <td className="py-3 pr-3">
                        <Link
                          href={`/admin/tenanci/${s.tenant.id}`}
                          className="font-medium hover:underline text-[var(--primary)]"
                        >
                          {s.tenant.name}
                        </Link>
                        <p className="text-xs text-[var(--muted-foreground)]">
                          /{s.tenant.slug}
                        </p>
                      </td>
                      <td className="py-3 pr-3">
                        <Badge variant="muted">{PLAN_LABEL[s.plan]}</Badge>
                      </td>
                      <td className="py-3 pr-3">
                        <Badge variant={STATUS_VARIANT[s.status]}>
                          {STATUS_LABEL[s.status]}
                        </Badge>
                      </td>
                      <td className="py-3 pr-3 text-right font-mono">
                        {formatPLN(s.monthlyPrice)}
                      </td>
                      <td className="py-3 pr-3 text-right text-xs text-[var(--muted-foreground)]">
                        {s.trialEndsAt
                          ? new Date(s.trialEndsAt).toLocaleDateString("pl-PL")
                          : "—"}
                      </td>
                      <td className="py-3 pr-3 text-right text-xs text-[var(--muted-foreground)]">
                        {s.currentPeriodEnd
                          ? new Date(s.currentPeriodEnd).toLocaleDateString("pl-PL")
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
