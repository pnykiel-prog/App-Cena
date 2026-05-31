import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { AuditLogTable, type AuditRow } from "@/components/audit-log-table";
import { UpgradePrompt } from "@/components/panel/feature-gate";
import { canFeature, getLimits } from "@/lib/plan-limits";

export const metadata = { title: "Dziennik zdarzeń" };

const PAGE_SIZE = 100;

export default async function PanelAuditPage() {
  const session = await auth();
  const tenantId = session!.user.tenantId!;

  const subscription = await prisma.subscription.findUnique({
    where: { tenantId },
    select: { plan: true, limitOverrides: true },
  });

  // Bramka: audit log to funkcja Pro+. Nie ukrywamy po cichu — pokazujemy CTA.
  if (!canFeature(subscription, "auditLog")) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--primary)]">
            Dziennik zdarzeń
          </h1>
          <p className="text-sm text-[var(--muted-foreground)] mt-1">
            Historia zmian w Twojej placówce.
          </p>
        </div>
        <UpgradePrompt
          feature="auditLog"
          description="Dziennik zdarzeń (audit log) jest dostępny w planie Pro i wyższych."
        />
      </div>
    );
  }

  // Retencja wg planu — pokazujemy tylko zdarzenia z dozwolonego okresu.
  const months = getLimits(subscription).auditLogMonths;
  const since =
    months === null ? undefined : new Date(Date.now() - months * 30 * 86400_000);

  const logs = await prisma.auditLog.findMany({
    where: {
      tenantId,
      ...(since ? { createdAt: { gte: since } } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: PAGE_SIZE,
  });

  const rows: AuditRow[] = logs.map((l) => ({
    id: l.id,
    createdAt: l.createdAt.toISOString(),
    actorEmail: l.actorEmail,
    actorType: l.actorType,
    action: l.action,
    entity: l.entity,
    summary: l.summary,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--primary)]">
          Dziennik zdarzeń
        </h1>
        <p className="text-sm text-[var(--muted-foreground)] mt-1">
          Historia zmian w Twojej placówce
          {months !== null ? ` (ostatnie ${months} mies.)` : ""}. Ostatnie{" "}
          {PAGE_SIZE} zdarzeń.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Zdarzenia ({rows.length})</CardTitle>
          <CardDescription>
            Kto i kiedy zmienił konfigurację, leady i ustawienia placówki.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AuditLogTable rows={rows} />
        </CardContent>
      </Card>
    </div>
  );
}
