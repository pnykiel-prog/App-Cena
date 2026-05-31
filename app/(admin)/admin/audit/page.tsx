import { prisma } from "@/lib/prisma";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { AuditLogTable, type AuditRow } from "@/components/audit-log-table";

export const metadata = { title: "Super-admin — Audit log" };

const PAGE_SIZE = 100;

export default async function AdminAuditPage() {
  const logs = await prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: PAGE_SIZE,
  });

  // Dociągnij nazwy placówek (bez treści leadów — tylko nazwa do czytelności).
  const tenantIds = [...new Set(logs.map((l) => l.tenantId).filter(Boolean))] as string[];
  const tenants = tenantIds.length
    ? await prisma.tenant.findMany({
        where: { id: { in: tenantIds } },
        select: { id: true, name: true },
      })
    : [];
  const nameById = new Map(tenants.map((t) => [t.id, t.name]));

  const rows: AuditRow[] = logs.map((l) => ({
    id: l.id,
    createdAt: l.createdAt.toISOString(),
    actorEmail: l.actorEmail,
    actorType: l.actorType,
    action: l.action,
    entity: l.entity,
    summary: l.summary,
    tenantName: l.tenantId ? (nameById.get(l.tenantId) ?? "—") : null,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--primary)]">
          Audit log
        </h1>
        <p className="text-sm text-[var(--muted-foreground)] mt-1">
          Dziennik akcji wszystkich placówek i super-adminów (metadane, bez treści
          leadów). Ostatnie {PAGE_SIZE} zdarzeń.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Zdarzenia ({rows.length})</CardTitle>
          <CardDescription>
            Zapis kto/co/kiedy. Super-admin jest procesorem RODO — nie zapisujemy
            danych osobowych mieszkańców.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AuditLogTable rows={rows} showTenant />
        </CardContent>
      </Card>
    </div>
  );
}
