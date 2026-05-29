import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DiscountsManager } from "./discounts-manager";

export const metadata = { title: "Konfiguracja — Rabaty" };

export default async function RabatyPage() {
  const session = await auth();
  const tenantId = session!.user.tenantId!;

  const discounts = await prisma.contractDiscount.findMany({
    where: { tenantId },
    orderBy: [{ minMonths: "asc" }],
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Rabaty za długość umowy</CardTitle>
        <p className="text-sm text-[var(--muted-foreground)]">
          Progi miesięcy → procentowy upust od sumy podstawowej. Stosowany
          najwyższy aktywny próg, którego warunek został spełniony.
        </p>
      </CardHeader>
      <CardContent>
        <DiscountsManager
          initialItems={discounts.map((d) => ({
            id: d.id,
            label: d.label,
            minMonths: d.minMonths,
            discountPct: d.discountPct,
            sortOrder: d.sortOrder,
            isActive: d.isActive,
          }))}
        />
      </CardContent>
    </Card>
  );
}
