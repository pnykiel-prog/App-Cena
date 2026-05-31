import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LeadsTable } from "./leads-table";
import { ExportButton } from "./export-button";
import { canFeature } from "@/lib/plan-limits";

export const metadata = { title: "Leady" };

export default async function LeadyPage() {
  const session = await auth();
  const tenantId = session!.user.tenantId!;

  const [quotes, subscription] = await Promise.all([
    prisma.quote.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
      take: 100,
      include: { roomType: true },
    }),
    prisma.subscription.findUnique({
      where: { tenantId },
      select: { plan: true, limitOverrides: true },
    }),
  ]);
  const canExport = canFeature(subscription, "exportCsv");

  const data = quotes.map((q) => ({
    id: q.id,
    createdAt: q.createdAt.toISOString(),
    contactName: q.contactName,
    status: q.status,
    barthelScore: q.barthelScore,
    roomLabel: q.roomType?.label ?? null,
    contractMonths: q.contractMonths,
    estimateMin: q.estimateMin,
    estimateMax: q.estimateMax,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--primary)]">
            Leady
          </h1>
          <p className="text-sm text-[var(--muted-foreground)] mt-1">
            Wyceny wygenerowane przez widget. Kliknij wiersz, aby zobaczyć szczegóły.
          </p>
        </div>
        <ExportButton enabled={canExport} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Wszystkie wyceny ({quotes.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {quotes.length === 0 ? (
            <div className="rounded-lg border border-dashed border-[var(--border)] p-8 text-center text-sm text-[var(--muted-foreground)]">
              Brak leadów do wyświetlenia.
            </div>
          ) : (
            <LeadsTable leads={data} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
