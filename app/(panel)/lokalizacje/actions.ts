"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireTenantSession } from "@/lib/tenant-actions";
import { actionError, actionOk, type ActionResult } from "@/lib/action-result";
import { canFeature } from "@/lib/plan-limits";
import { logAction, tenantActor } from "@/lib/audit";

const schema = z.object({
  name: z.string().min(2, "Min. 2 znaki").max(120),
  slug: z
    .string()
    .min(2)
    .max(60)
    .regex(/^[a-z0-9-]+$/, "Małe litery, cyfry i myślniki"),
  city: z.string().max(80).nullish(),
  address: z.string().max(200).nullish(),
  isActive: z.boolean(),
});

async function hasMultiLocation(tenantId: string): Promise<boolean> {
  const subscription = await prisma.subscription.findUnique({
    where: { tenantId },
    select: { plan: true, limitOverrides: true },
  });
  return canFeature(subscription, "multiLocation");
}

const GATE_MSG =
  "Wiele lokalizacji jest dostępne w planie Enterprise. Przejdź na wyższy plan.";

// Slug lokalizacji musi być globalnie unikalny i NIE kolidować ze slugiem tenanta
// ani innej lokalizacji (bo /w/{slug} musi być jednoznaczny).
async function slugTaken(slug: string, exceptLocationId?: string): Promise<boolean> {
  const [tenant, location] = await Promise.all([
    prisma.tenant.findUnique({ where: { slug }, select: { id: true } }),
    prisma.location.findUnique({ where: { slug }, select: { id: true } }),
  ]);
  if (tenant) return true;
  if (location && location.id !== exceptLocationId) return true;
  return false;
}

export async function upsertLocation(
  id: string | null,
  data: unknown,
): Promise<ActionResult> {
  const { tenantId, userId, email } = await requireTenantSession();
  if (!(await hasMultiLocation(tenantId))) return actionError(GATE_MSG);

  const parsed = schema.safeParse(data);
  if (!parsed.success) {
    return actionError(
      "Sprawdź pola formularza",
      Object.fromEntries(parsed.error.issues.map((i) => [i.path.join("."), i.message])),
    );
  }

  if (await slugTaken(parsed.data.slug, id ?? undefined)) {
    return actionError(`Slug „${parsed.data.slug}” jest już zajęty (przez placówkę lub inną lokalizację).`);
  }

  if (id) {
    const existing = await prisma.location.findFirst({
      where: { id, tenantId },
      select: { id: true },
    });
    if (!existing) return actionError("Lokalizacja nie istnieje");
    await prisma.location.update({
      where: { id },
      data: {
        name: parsed.data.name,
        slug: parsed.data.slug,
        city: parsed.data.city ?? null,
        address: parsed.data.address ?? null,
        isActive: parsed.data.isActive,
      },
    });
  } else {
    const count = await prisma.location.count({ where: { tenantId } });
    await prisma.location.create({
      data: {
        tenantId,
        name: parsed.data.name,
        slug: parsed.data.slug,
        city: parsed.data.city ?? null,
        address: parsed.data.address ?? null,
        isActive: parsed.data.isActive,
        sortOrder: count + 1,
      },
    });
  }
  await logAction({
    actor: tenantActor(userId, email),
    tenantId,
    action: id ? "UPDATE" : "CREATE",
    entity: "Location",
    entityId: id ?? undefined,
    summary: `${id ? "Zaktualizowano" : "Dodano"} lokalizację „${parsed.data.name}” (/w/${parsed.data.slug})`,
  });
  revalidatePath("/lokalizacje");
  return actionOk();
}

export async function deleteLocation(id: string): Promise<ActionResult> {
  const { tenantId, userId, email } = await requireTenantSession();
  if (!(await hasMultiLocation(tenantId))) return actionError(GATE_MSG);

  const existing = await prisma.location.findFirst({
    where: { id, tenantId },
    select: { id: true, name: true, _count: { select: { rooms: true, quotes: true } } },
  });
  if (!existing) return actionError("Lokalizacja nie istnieje");
  if (existing._count.quotes > 0) {
    return actionError(
      "Nie można usunąć — lokalizacja ma przypisane leady. Dezaktywuj ją zamiast usuwać.",
    );
  }
  // Pokoje lokalizacji znikają wraz z nią (onDelete: Cascade na RoomType.locationId).
  await prisma.location.delete({ where: { id } });
  await logAction({
    actor: tenantActor(userId, email),
    tenantId,
    action: "DELETE",
    entity: "Location",
    entityId: id,
    summary: `Usunięto lokalizację „${existing.name}”`,
  });
  revalidatePath("/lokalizacje");
  return actionOk();
}

export async function toggleLocationActive(id: string): Promise<ActionResult> {
  const { tenantId } = await requireTenantSession();
  if (!(await hasMultiLocation(tenantId))) return actionError(GATE_MSG);
  const existing = await prisma.location.findFirst({
    where: { id, tenantId },
    select: { isActive: true },
  });
  if (!existing) return actionError("Lokalizacja nie istnieje");
  await prisma.location.update({
    where: { id },
    data: { isActive: !existing.isActive },
  });
  revalidatePath("/lokalizacje");
  return actionOk();
}
