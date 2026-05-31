import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UpgradePrompt } from "@/components/panel/feature-gate";
import { canFeature } from "@/lib/plan-limits";
import { LocationsManager } from "./locations-manager";

export const metadata = { title: "Lokalizacje" };

export default async function LokalizacjePage() {
  const session = await auth();
  const tenantId = session!.user.tenantId!;

  const subscription = await prisma.subscription.findUnique({
    where: { tenantId },
    select: { plan: true, limitOverrides: true },
  });

  if (!canFeature(subscription, "multiLocation")) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--primary)]">
            Lokalizacje
          </h1>
          <p className="text-sm text-[var(--muted-foreground)] mt-1">
            Wiele budynków, każdy z własnym widgetem, pokojami i leadami.
          </p>
        </div>
        <UpgradePrompt
          feature="multiLocation"
          description="Obsługa wielu lokalizacji jest dostępna w planie Enterprise."
        />
      </div>
    );
  }

  const locations = await prisma.location.findMany({
    where: { tenantId },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      name: true,
      slug: true,
      city: true,
      address: true,
      isActive: true,
      _count: { select: { rooms: true, quotes: true } },
    },
  });

  const base = process.env.NEXT_PUBLIC_WIDGET_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--primary)]">
          Lokalizacje
        </h1>
        <p className="text-sm text-[var(--muted-foreground)] mt-1">
          Każda lokalizacja ma własny widget (/w/slug), własne pokoje i osobne
          leady. Progi opieki, modyfikatory, usługi i rabaty są wspólne dla całej
          placówki. Pokoje przypiszesz w zakładce Konfiguracja → Pokoje.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Twoje lokalizacje ({locations.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <LocationsManager
            widgetBase={base}
            initialItems={locations.map((l) => ({
              id: l.id,
              name: l.name,
              slug: l.slug,
              city: l.city,
              address: l.address,
              isActive: l.isActive,
              rooms: l._count.rooms,
              quotes: l._count.quotes,
            }))}
          />
        </CardContent>
      </Card>
    </div>
  );
}
