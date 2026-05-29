import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatPLN } from "@/lib/utils";
import { ArrowRight, Building2, Users, CreditCard, TrendingUp } from "lucide-react";
import Link from "next/link";
import { LeadsTrendChart } from "./leads-trend-chart";

export const metadata = { title: "Super-admin — przegląd" };

const DAYS = 28;
const STATUS_VARIANT: Record<string, "muted" | "success" | "warning" | "danger"> = {
  TRIAL: "warning",
  ACTIVE: "success",
  SUSPENDED: "danger",
  CANCELLED: "muted",
};

export default async function AdminOverviewPage() {
  const since = new Date(Date.now() - DAYS * 86400_000);

  const [tenantCounts, recentTenants, leadsPerDay, totalLeads, totalVisits, mrrAgg] =
    await Promise.all([
      prisma.tenant.groupBy({
        by: ["status"],
        _count: { status: true },
      }),
      prisma.tenant.findMany({
        orderBy: { createdAt: "desc" },
        take: 5,
        include: {
          subscription: { select: { plan: true, status: true, monthlyPrice: true } },
          _count: { select: { quotes: true } },
        },
      }),
      prisma.$queryRaw<Array<{ day: Date; count: bigint }>>`
        SELECT DATE_TRUNC('day', "createdAt") AS day, COUNT(*)::bigint AS count
        FROM "Quote"
        WHERE "createdAt" >= ${since}
        GROUP BY day
        ORDER BY day ASC
      `,
      prisma.quote.count(),
      prisma.visitBooking.count(),
      prisma.subscription.aggregate({
        where: { status: "ACTIVE" },
        _sum: { monthlyPrice: true },
        _count: { id: true },
      }),
    ]);

  const tenantsByStatus = tenantCounts.reduce<Record<string, number>>(
    (acc, c) => {
      acc[c.status] = c._count.status;
      return acc;
    },
    {},
  );
  const totalTenants = Object.values(tenantsByStatus).reduce((a, b) => a + b, 0);
  const mrrTotal = mrrAgg._sum.monthlyPrice ?? 0;

  // Fill gaps in chart
  const chartData: { day: string; count: number }[] = [];
  for (let i = DAYS - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400_000);
    d.setHours(0, 0, 0, 0);
    const key = d.toISOString().slice(0, 10);
    const found = leadsPerDay.find(
      (r) => new Date(r.day).toISOString().slice(0, 10) === key,
    );
    chartData.push({
      day: d.toLocaleDateString("pl-PL", { day: "2-digit", month: "2-digit" }),
      count: found ? Number(found.count) : 0,
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--primary)]">
          Przegląd platformy
        </h1>
        <p className="text-sm text-[var(--muted-foreground)] mt-1">
          Tenanci, leady i przychody powtarzalne — agregat z ostatnich {DAYS} dni.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <KPI
          icon={Building2}
          label="Tenantów"
          value={totalTenants.toString()}
          sub={`${tenantsByStatus.ACTIVE ?? 0} aktywnych`}
        />
        <KPI
          icon={Users}
          label="Leady (wszystkie)"
          value={totalLeads.toString()}
          sub="od początku"
        />
        <KPI
          icon={TrendingUp}
          label="Wizyty"
          value={totalVisits.toString()}
          sub="umówione"
        />
        <KPI
          icon={CreditCard}
          label="MRR"
          value={formatPLN(mrrTotal)}
          sub={`${mrrAgg._count.id} subskrypcji`}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Leady na platformie (ostatnie {DAYS} dni)</CardTitle>
          <CardDescription>
            Suma nowych wycen ze wszystkich tenantów dziennie
          </CardDescription>
        </CardHeader>
        <CardContent>
          <LeadsTrendChart data={chartData} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Najnowsi tenanci</CardTitle>
              <CardDescription>5 ostatnio dołączonych placówek</CardDescription>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link href="/admin/tenanci">
                Wszyscy
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <ul className="divide-y divide-[var(--border)]">
            {recentTenants.map((t) => (
              <li key={t.id} className="py-3 flex items-center justify-between">
                <div>
                  <Link
                    href={`/admin/tenanci/${t.id}`}
                    className="font-medium text-sm hover:underline"
                  >
                    {t.name}
                  </Link>
                  <p className="text-xs text-[var(--muted-foreground)]">
                    /{t.slug} · {t.city ?? "—"} ·{" "}
                    {new Date(t.createdAt).toLocaleDateString("pl-PL")}
                  </p>
                </div>
                <div className="flex items-center gap-2 text-right">
                  <span className="text-xs text-[var(--muted-foreground)]">
                    {t._count.quotes} leadów
                  </span>
                  <Badge variant={STATUS_VARIANT[t.status] ?? "muted"}>
                    {t.status}
                  </Badge>
                  {t.subscription ? (
                    <Badge variant="muted">{t.subscription.plan}</Badge>
                  ) : null}
                </div>
              </li>
            ))}
            {recentTenants.length === 0 ? (
              <li className="py-4 text-sm text-[var(--muted-foreground)] text-center">
                Brak tenantów.
              </li>
            ) : null}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

function KPI({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-md bg-[var(--secondary)] flex items-center justify-center">
            <Icon className="h-5 w-5 text-[var(--primary)]" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-wider text-[var(--muted-foreground)]">
              {label}
            </p>
            <p className="text-2xl font-semibold text-[var(--primary)]">
              {value}
            </p>
            {sub ? (
              <p className="text-xs text-[var(--muted-foreground)]">{sub}</p>
            ) : null}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
