"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireTenantSession } from "@/lib/tenant-actions";
import { actionError, actionOk, type ActionResult } from "@/lib/action-result";
import { isWithinLimit } from "@/lib/plan-limits";
import { logAction, tenantActor } from "@/lib/audit";

const schema = z.object({
  capacity: z.enum(["SINGLE", "DOUBLE", "TRIPLE"]),
  label: z.string().min(2, "Min. 2 znaki").max(120),
  description: z.string().max(500).nullish(),
  basePrice: z.number().min(0).max(100_000),
  available: z.number().int().min(0).max(999),
  sortOrder: z.number().int().min(0).max(999),
  isActive: z.boolean(),
  // Lokalizacja pokoju (Enterprise). null = tryb jednolokalizacyjny.
  locationId: z.string().nullish(),
});

// Weryfikuje, że lokalizacja należy do tenanta (lub jest pusta).
async function resolveLocationId(
  tenantId: string,
  locationId: string | null | undefined,
): Promise<string | null> {
  if (!locationId) return null;
  const loc = await prisma.location.findFirst({
    where: { id: locationId, tenantId },
    select: { id: true },
  });
  return loc?.id ?? null;
}

export async function upsertRoomType(
  id: string | null,
  data: unknown,
): Promise<ActionResult> {
  const { tenantId, userId, email } = await requireTenantSession();
  const parsed = schema.safeParse(data);
  if (!parsed.success) {
    return actionError(
      "Sprawdź pola formularza",
      Object.fromEntries(
        parsed.error.issues.map((i) => [i.path.join("."), i.message]),
      ),
    );
  }
  const locationId = await resolveLocationId(tenantId, parsed.data.locationId);
  if (id) {
    const existing = await prisma.roomType.findFirst({
      where: { id, tenantId },
      select: { id: true },
    });
    if (!existing) return actionError("Pokój nie istnieje");
    await prisma.roomType.update({
      where: { id },
      data: {
        capacity: parsed.data.capacity,
        label: parsed.data.label,
        description: parsed.data.description ?? null,
        basePrice: parsed.data.basePrice,
        available: parsed.data.available,
        sortOrder: parsed.data.sortOrder,
        isActive: parsed.data.isActive,
        locationId,
      },
    });
  } else {
    // Limit planu: liczba typów pokoi (egzekwowane przy dodawaniu nowego).
    const [count, subscription] = await Promise.all([
      prisma.roomType.count({ where: { tenantId } }),
      prisma.subscription.findUnique({
        where: { tenantId },
        select: { plan: true, limitOverrides: true },
      }),
    ]);
    if (!isWithinLimit(subscription, "maxRoomTypes", count)) {
      return actionError(
        "Osiągnięto limit typów pokoi w Twoim planie. Przejdź na wyższy plan, aby dodać więcej.",
      );
    }
    await prisma.roomType.create({
      data: {
        tenantId,
        capacity: parsed.data.capacity,
        label: parsed.data.label,
        description: parsed.data.description ?? null,
        basePrice: parsed.data.basePrice,
        available: parsed.data.available,
        sortOrder: parsed.data.sortOrder,
        isActive: parsed.data.isActive,
        locationId,
      },
    });
  }
  await logAction({
    actor: tenantActor(userId, email),
    tenantId,
    action: id ? "UPDATE" : "CREATE",
    entity: "RoomType",
    entityId: id ?? undefined,
    summary: `${id ? "Zaktualizowano" : "Dodano"} pokój „${parsed.data.label}”`,
  });
  revalidatePath("/konfiguracja/pokoje");
  revalidatePath("/konfiguracja");
  return actionOk();
}

export async function deleteRoomType(id: string): Promise<ActionResult> {
  const { tenantId, userId, email } = await requireTenantSession();
  const existing = await prisma.roomType.findFirst({
    where: { id, tenantId },
    select: { id: true, _count: { select: { quotes: true } } },
  });
  if (!existing) return actionError("Pokój nie istnieje");
  if (existing._count.quotes > 0) {
    // Soft delete (dezaktywuj) jeśli ma podpięte wyceny
    await prisma.roomType.update({
      where: { id },
      data: { isActive: false },
    });
    await logAction({
      actor: tenantActor(userId, email),
      tenantId,
      action: "TOGGLE",
      entity: "RoomType",
      entityId: id,
      summary: "Dezaktywowano pokój (miał podpięte wyceny)",
    });
    revalidatePath("/konfiguracja/pokoje");
    return actionOk();
  }
  await prisma.roomType.delete({ where: { id } });
  await logAction({
    actor: tenantActor(userId, email),
    tenantId,
    action: "DELETE",
    entity: "RoomType",
    entityId: id,
    summary: "Usunięto pokój",
  });
  revalidatePath("/konfiguracja/pokoje");
  revalidatePath("/konfiguracja");
  return actionOk();
}

export async function toggleRoomActive(id: string): Promise<ActionResult> {
  const { tenantId } = await requireTenantSession();
  const existing = await prisma.roomType.findFirst({
    where: { id, tenantId },
    select: { isActive: true },
  });
  if (!existing) return actionError("Pokój nie istnieje");
  await prisma.roomType.update({
    where: { id },
    data: { isActive: !existing.isActive },
  });
  revalidatePath("/konfiguracja/pokoje");
  return actionOk();
}
