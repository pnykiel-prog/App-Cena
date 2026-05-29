"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireTenantSession } from "@/lib/tenant-actions";
import { actionError, actionOk, type ActionResult } from "@/lib/action-result";

const schema = z.object({
  label: z.string().min(2).max(80),
  minMonths: z.number().int().min(1).max(120),
  discountPct: z.number().min(0).max(0.5), // 0..50%
  sortOrder: z.number().int().min(0).max(999),
  isActive: z.boolean(),
});

export async function upsertDiscount(
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
    const existing = await prisma.contractDiscount.findFirst({
      where: { id, tenantId },
      select: { id: true },
    });
    if (!existing) return actionError("Rabat nie istnieje");
    await prisma.contractDiscount.update({
      where: { id },
      data: parsed.data,
    });
  } else {
    await prisma.contractDiscount.create({
      data: { ...parsed.data, tenantId },
    });
  }
  revalidatePath("/konfiguracja/rabaty");
  revalidatePath("/konfiguracja");
  return actionOk();
}

export async function deleteDiscount(id: string): Promise<ActionResult> {
  const { tenantId } = await requireTenantSession();
  const existing = await prisma.contractDiscount.findFirst({
    where: { id, tenantId },
    select: { id: true },
  });
  if (!existing) return actionError("Rabat nie istnieje");
  await prisma.contractDiscount.delete({ where: { id } });
  revalidatePath("/konfiguracja/rabaty");
  revalidatePath("/konfiguracja");
  return actionOk();
}

export async function toggleDiscountActive(id: string): Promise<ActionResult> {
  const { tenantId } = await requireTenantSession();
  const existing = await prisma.contractDiscount.findFirst({
    where: { id, tenantId },
    select: { isActive: true },
  });
  if (!existing) return actionError("Rabat nie istnieje");
  await prisma.contractDiscount.update({
    where: { id },
    data: { isActive: !existing.isActive },
  });
  revalidatePath("/konfiguracja/rabaty");
  return actionOk();
}
