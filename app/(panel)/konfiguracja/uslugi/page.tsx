import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AddonsManager } from "./addons-manager";

export const metadata = { title: "Konfiguracja — Usługi dodatkowe" };

export default async function UslugiPage() {
  const session = await auth();
  const tenantId = session!.user.tenantId!;

  const addons = await prisma.addonService.findMany({
    where: { tenantId },
    orderBy: [{ sortOrder: "asc" }],
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Usługi dodatkowe (à la carte)</CardTitle>
        <p className="text-sm text-[var(--muted-foreground)]">
          Usługi rozliczane miesięcznie, za zabieg, za godzinę lub za dobę.
          Użytkownik widgetu podaje szacowaną liczbę w miesiącu.
        </p>
      </CardHeader>
      <CardContent>
        <AddonsManager
          initialItems={addons.map((a) => ({
            id: a.id,
            code: a.code,
            label: a.label,
            description: a.description,
            unit: a.unit,
            unitPrice: a.unitPrice,
            defaultMonthly: a.defaultMonthly,
            sortOrder: a.sortOrder,
            isActive: a.isActive,
          }))}
        />
      </CardContent>
    </Card>
  );
}
