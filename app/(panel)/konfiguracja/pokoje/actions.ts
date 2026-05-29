"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireTenantSession } from "@/lib/tenant-actions";
import { actionError, actionOk, type ActionResult } from "@/lib/action-result";

const schema = z.object({
  capacity: z.enum(["SINGLE", "DOUBLE", "TRIPLE"]),
  label: z.string().min(2, "Min. 2 znaki").max(120),
  description: z.string().max(500).nullish(),
  basePrice: z.number().min(0).max(100_000),
  available: z.number().int().min(0).max(999),
  sortOrder: z.number().int().min(0).max(999),
  isActive: z.boolean(),
});

export async function upsertRoomType(
  id: string | null,
  data: unknown,
): Promise<ActionResult> {
  const { tenantId } = await requireTenantSession();
  const parsed = schema.safeParse(data);
  if (!parsed.success) {
    return actionError(
      "Sprawdź pola formularza",
      Object.fromEntries(
        parsed.error.issues.map((i) => [i.path.join("."), i.message]),
      ),
    );
  }
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
      },
    });
  } else {
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
      },
    });
  }
  revalidatePath("/konfiguracja/pokoje");
  revalidatePath("/konfiguracja");
  return actionOk();
}

export async function deleteRoomType(id: string): Promise<ActionResult> {
  const { tenantId } = await requireTenantSession();
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
    revalidatePath("/konfiguracja/pokoje");
    return actionOk();
  }
  await prisma.roomType.delete({ where: { id } });
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
