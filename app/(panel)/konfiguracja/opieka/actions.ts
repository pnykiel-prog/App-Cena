"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireTenantSession } from "@/lib/tenant-actions";
import { actionError, actionOk, type ActionResult } from "@/lib/action-result";

const schema = z
  .object({
    label: z.string().min(2).max(80),
    minBarthel: z.number().int().min(0).max(100),
    maxBarthel: z.number().int().min(0).max(100),
    monthlySurcharge: z.number().min(0).max(50_000),
    sortOrder: z.number().int().min(0).max(999),
    isActive: z.boolean(),
  })
  .refine((d) => d.minBarthel <= d.maxBarthel, {
    message: "Próg minimalny musi być ≤ maksymalnemu",
    path: ["minBarthel"],
  });

export async function upsertCareTier(
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

  // Sprawdź nakładanie się zakresów
  const overlapping = await prisma.careTier.findFirst({
    where: {
      tenantId,
      isActive: true,
      ...(id ? { NOT: { id } } : {}),
      AND: [
        { minBarthel: { lte: parsed.data.maxBarthel } },
        { maxBarthel: { gte: parsed.data.minBarthel } },
      ],
    },
    select: { label: true, minBarthel: true, maxBarthel: true },
  });
  if (overlapping) {
    return actionError(
      `Zakres pokrywa się z progiem „${overlapping.label}" (${overlapping.minBarthel}–${overlapping.maxBarthel})`,
    );
  }

  if (id) {
    const existing = await prisma.careTier.findFirst({
      where: { id, tenantId },
      select: { id: true },
    });
    if (!existing) return actionError("Próg nie istnieje");
    await prisma.careTier.update({
      where: { id },
      data: parsed.data,
    });
  } else {
    await prisma.careTier.create({
      data: { ...parsed.data, tenantId },
    });
  }
  revalidatePath("/konfiguracja/opieka");
  revalidatePath("/konfiguracja");
  return actionOk();
}

export async function deleteCareTier(id: string): Promise<ActionResult> {
  const { tenantId } = await requireTenantSession();
  const existing = await prisma.careTier.findFirst({
    where: { id, tenantId },
    select: { id: true },
  });
  if (!existing) return actionError("Próg nie istnieje");
  await prisma.careTier.delete({ where: { id } });
  revalidatePath("/konfiguracja/opieka");
  revalidatePath("/konfiguracja");
  return actionOk();
}

export async function toggleCareTierActive(id: string): Promise<ActionResult> {
  const { tenantId } = await requireTenantSession();
  const existing = await prisma.careTier.findFirst({
    where: { id, tenantId },
    select: { isActive: true },
  });
  if (!existing) return actionError("Próg nie istnieje");
  await prisma.careTier.update({
    where: { id },
    data: { isActive: !existing.isActive },
  });
  revalidatePath("/konfiguracja/opieka");
  return actionOk();
}
