import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ModifiersManager } from "./modifiers-manager";

export const metadata = { title: "Konfiguracja — Modyfikatory medyczne" };

export default async function MedyczynePage() {
  const session = await auth();
  const tenantId = session!.user.tenantId!;

  const modifiers = await prisma.medicalModifier.findMany({
    where: { tenantId },
    orderBy: [{ kind: "asc" }, { sortOrder: "asc" }],
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Modyfikatory medyczne</CardTitle>
        <p className="text-sm text-[var(--muted-foreground)]">
          Czynniki kosztotwórcze: schorzenia, zaburzenia poznawcze, mobilność.
          Każdy modyfikator dodaje miesięczną dopłatę jeśli zaznaczony w widgecie.
        </p>
      </CardHeader>
      <CardContent>
        <ModifiersManager
          initialItems={modifiers.map((m) => ({
            id: m.id,
            code: m.code,
            label: m.label,
            kind: m.kind,
            description: m.description,
            monthlySurcharge: m.monthlySurcharge,
            isToggle: m.isToggle,
            sortOrder: m.sortOrder,
            isActive: m.isActive,
          }))}
        />
      </CardContent>
    </Card>
  );
}
