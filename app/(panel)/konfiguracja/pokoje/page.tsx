import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RoomsManager } from "./rooms-manager";

export const metadata = { title: "Konfiguracja — Pokoje" };

export default async function PokojePage({
  searchParams,
}: {
  searchParams: Promise<{ location?: string }>;
}) {
  const session = await auth();
  const tenantId = session!.user.tenantId!;
  const { location } = await searchParams;

  // Lokalizacje tenanta (jeśli ma wykupioną funkcję multi-location i jakieś dodał).
  const locations = await prisma.location.findMany({
    where: { tenantId },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    select: { id: true, name: true },
  });

  // Wybrana lokalizacja: z query albo pierwsza (gdy istnieją). Bez lokalizacji =
  // tryb jednolokalizacyjny (locationId = null).
  const selectedLocationId =
    locations.length > 0 ? (location ?? locations[0].id) : null;

  const rooms = await prisma.roomType.findMany({
    where: { tenantId, locationId: selectedLocationId },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    include: { _count: { select: { quotes: true } } },
  });

  const initialRooms = rooms.map((r) => ({
    id: r.id,
    capacity: r.capacity,
    label: r.label,
    description: r.description,
    basePrice: r.basePrice,
    available: r.available,
    sortOrder: r.sortOrder,
    isActive: r.isActive,
    quotesCount: r._count.quotes,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pokoje</CardTitle>
        <p className="text-sm text-[var(--muted-foreground)]">
          Typy pokoi oferowane przez placówkę. Cena bazowa obejmuje pobyt, wyżywienie
          i podstawową opiekę 24/7.
          {locations.length > 0
            ? " Pokoje są przypisane do wybranej lokalizacji."
            : ""}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {locations.length > 0 && (
          <div className="flex flex-wrap gap-2 border-b border-[var(--border)] pb-3">
            {locations.map((l) => {
              const active = l.id === selectedLocationId;
              return (
                <Link
                  key={l.id}
                  href={`/konfiguracja/pokoje?location=${l.id}`}
                  className={
                    "rounded-md px-3 py-1.5 text-sm font-medium transition-colors " +
                    (active
                      ? "bg-[var(--primary)] text-white"
                      : "text-[var(--muted-foreground)] hover:bg-[var(--secondary)]")
                  }
                >
                  {l.name}
                </Link>
              );
            })}
          </div>
        )}
        <RoomsManager initialRooms={initialRooms} locationId={selectedLocationId} />
      </CardContent>
    </Card>
  );
}
