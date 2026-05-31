"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireTenantSession } from "@/lib/tenant-actions";
import { actionError, actionOk, type ActionResult } from "@/lib/action-result";
import { isWithinLimit } from "@/lib/plan-limits";
import { logAction, tenantActor } from "@/lib/audit";

const schema = z.object({
  code: z
    .string()
    .min(2)
    .max(40)
    .regex(/^[A-Z0-9_]+$/, "Wielkie litery, cyfry i podkreślenia"),
  label: z.string().min(2).max(120),
  description: z.string().max(500).nullish(),
  unit: z.enum(["PER_MONTH", "PER_DAY", "PER_HOUR", "PER_VISIT"]),
  unitPrice: z.number().min(0).max(100_000),
  defaultMonthly: z.number().int().min(0).max(999).nullish(),
  sortOrder: z.number().int().min(0).max(999),
  isActive: z.boolean(),
});

export async function upsertAddon(
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

  const codeExists = await prisma.addonService.findFirst({
    where: {
      tenantId,
      code: parsed.data.code,
      ...(id ? { NOT: { id } } : {}),
    },
    select: { id: true },
  });
  if (codeExists) {
    return actionError(`Kod „${parsed.data.code}" już istnieje`);
  }

  const payload = {
    code: parsed.data.code,
    label: parsed.data.label,
    description: parsed.data.description ?? null,
    unit: parsed.data.unit,
    unitPrice: parsed.data.unitPrice,
    defaultMonthly: parsed.data.defaultMonthly ?? null,
    sortOrder: parsed.data.sortOrder,
    isActive: parsed.data.isActive,
  };

  if (id) {
    const existing = await prisma.addonService.findFirst({
      where: { id, tenantId },
      select: { id: true },
    });
    if (!existing) return actionError("Usługa nie istnieje");
    await prisma.addonService.update({ where: { id }, data: payload });
  } else {
    // Limit planu: liczba usług dodatkowych (egzekwowane przy dodawaniu nowej).
    const [count, subscription] = await Promise.all([
      prisma.addonService.count({ where: { tenantId } }),
      prisma.subscription.findUnique({
        where: { tenantId },
        select: { plan: true, limitOverrides: true },
      }),
    ]);
    if (!isWithinLimit(subscription, "maxAddonServices", count)) {
      return actionError(
        "Osiągnięto limit usług dodatkowych w Twoim planie. Przejdź na wyższy plan, aby dodać więcej.",
      );
    }
    await prisma.addonService.create({ data: { ...payload, tenantId } });
  }
  await logAction({
    actor: tenantActor(userId, email),
    tenantId,
    action: id ? "UPDATE" : "CREATE",
    entity: "AddonService",
    entityId: id ?? undefined,
    summary: `${id ? "Zaktualizowano" : "Dodano"} usługę „${parsed.data.label}”`,
  });
  revalidatePath("/konfiguracja/uslugi");
  revalidatePath("/konfiguracja");
  return actionOk();
}

export async function deleteAddon(id: string): Promise<ActionResult> {
  const { tenantId, userId, email } = await requireTenantSession();
  const existing = await prisma.addonService.findFirst({
    where: { id, tenantId },
    select: { id: true },
  });
  if (!existing) return actionError("Usługa nie istnieje");
  await prisma.addonService.delete({ where: { id } });
  await logAction({
    actor: tenantActor(userId, email),
    tenantId,
    action: "DELETE",
    entity: "AddonService",
    entityId: id,
    summary: "Usunięto usługę",
  });
  revalidatePath("/konfiguracja/uslugi");
  revalidatePath("/konfiguracja");
  return actionOk();
}

export async function toggleAddonActive(id: string): Promise<ActionResult> {
  const { tenantId } = await requireTenantSession();
  const existing = await prisma.addonService.findFirst({
    where: { id, tenantId },
    select: { isActive: true },
  });
  if (!existing) return actionError("Usługa nie istnieje");
  await prisma.addonService.update({
    where: { id },
    data: { isActive: !existing.isActive },
  });
  revalidatePath("/konfiguracja/uslugi");
  return actionOk();
}
