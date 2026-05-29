import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RoomsManager } from "./rooms-manager";

export const metadata = { title: "Konfiguracja — Pokoje" };

export default async function PokojePage() {
  const session = await auth();
  const tenantId = session!.user.tenantId!;

  const rooms = await prisma.roomType.findMany({
    where: { tenantId },
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
        </p>
      </CardHeader>
      <CardContent>
        <RoomsManager initialRooms={initialRooms} />
      </CardContent>
    </Card>
  );
}
