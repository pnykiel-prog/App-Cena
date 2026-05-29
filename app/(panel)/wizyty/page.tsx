import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const metadata = { title: "Wizyty" };

const STATUS_VARIANT: Record<string, "muted" | "warning" | "success" | "danger"> = {
  REQUESTED: "warning",
  CONFIRMED: "success",
  COMPLETED: "muted",
  CANCELLED: "danger",
  NO_SHOW: "danger",
};

const STATUS_LABEL: Record<string, string> = {
  REQUESTED: "Zgłoszona",
  CONFIRMED: "Potwierdzona",
  COMPLETED: "Odbyta",
  CANCELLED: "Anulowana",
  NO_SHOW: "Niestawienie",
};

export default async function WizytyPage() {
  const session = await auth();
  const tenantId = session!.user.tenantId!;

  const visits = await prisma.visitBooking.findMany({
    where: { tenantId },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--primary)]">
          Wizyty
        </h1>
        <p className="text-sm text-[var(--muted-foreground)] mt-1">
          Zgłoszenia rodzin chcących odwiedzić placówkę po otrzymaniu wyceny.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Wszystkie ({visits.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {visits.length === 0 ? (
            <div className="rounded-lg border border-dashed border-[var(--border)] p-8 text-center text-sm text-[var(--muted-foreground)]">
              Brak zgłoszeń wizyt.
            </div>
          ) : (
            <ul className="divide-y divide-[var(--border)]">
              {visits.map((v) => (
                <li key={v.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-sm font-medium">{v.contactName}</p>
                    <p className="text-xs text-[var(--muted-foreground)]">
                      {v.contactPhone} · {v.contactEmail ?? "brak e-maila"} ·{" "}
                      {new Date(v.createdAt).toLocaleString("pl-PL")}
                    </p>
                  </div>
                  <Badge variant={STATUS_VARIANT[v.status] ?? "muted"}>
                    {STATUS_LABEL[v.status] ?? v.status}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
