import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TiersManager } from "./tiers-manager";

export const metadata = { title: "Konfiguracja — Opieka (Barthel)" };

export default async function OpiekaPage() {
  const session = await auth();
  const tenantId = session!.user.tenantId!;

  const tiers = await prisma.careTier.findMany({
    where: { tenantId },
    orderBy: [{ minBarthel: "asc" }, { sortOrder: "asc" }],
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Progi opieki (skala Barthela)</CardTitle>
        <p className="text-sm text-[var(--muted-foreground)]">
          Schodkowe dopłaty miesięczne zależnie od wyniku w skali Barthela
          (0–100 pkt). Zakresy nie mogą się pokrywać.
        </p>
      </CardHeader>
      <CardContent>
        <TiersManager
          initialTiers={tiers.map((t) => ({
            id: t.id,
            label: t.label,
            minBarthel: t.minBarthel,
            maxBarthel: t.maxBarthel,
            monthlySurcharge: t.monthlySurcharge,
            sortOrder: t.sortOrder,
            isActive: t.isActive,
          }))}
        />
      </CardContent>
    </Card>
  );
}
