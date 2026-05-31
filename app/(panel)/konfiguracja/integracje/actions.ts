"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireTenantSession } from "@/lib/tenant-actions";
import { actionError, actionOk, type ActionResult } from "@/lib/action-result";
import { canFeature } from "@/lib/plan-limits";
import { logAction, tenantActor } from "@/lib/audit";
import { generateApiKey } from "@/lib/api-auth";

const nameSchema = z.object({
  name: z.string().min(2, "Min. 2 znaki").max(80),
});

async function hasRestApi(tenantId: string): Promise<boolean> {
  const subscription = await prisma.subscription.findUnique({
    where: { tenantId },
    select: { plan: true, limitOverrides: true },
  });
  return canFeature(subscription, "restApi");
}

const REST_API_GATE_MSG =
  "REST API jest dostępne w planie Enterprise. Przejdź na wyższy plan.";

// Tworzy klucz i zwraca pełny klucz JEDNORAZOWO (do pokazania właścicielowi).
export async function createApiKey(
  data: unknown,
): Promise<ActionResult<{ key: string; prefix: string }>> {
  const { tenantId, userId, email } = await requireTenantSession();
  if (!(await hasRestApi(tenantId))) return actionError(REST_API_GATE_MSG);

  const parsed = nameSchema.safeParse(data);
  if (!parsed.success) return actionError("Podaj nazwę klucza (min. 2 znaki)");

  const { plain, hash, prefix } = generateApiKey();
  await prisma.apiKey.create({
    data: { tenantId, name: parsed.data.name, keyHash: hash, prefix },
  });
  await logAction({
    actor: tenantActor(userId, email),
    tenantId,
    action: "CREATE",
    entity: "ApiKey",
    summary: `Utworzono klucz API „${parsed.data.name}” (${prefix}…)`,
  });
  revalidatePath("/konfiguracja/integracje");
  return actionOk({ key: plain, prefix });
}

export async function toggleApiKey(id: string): Promise<ActionResult> {
  const { tenantId } = await requireTenantSession();
  if (!(await hasRestApi(tenantId))) return actionError(REST_API_GATE_MSG);
  const existing = await prisma.apiKey.findFirst({
    where: { id, tenantId },
    select: { isActive: true },
  });
  if (!existing) return actionError("Klucz nie istnieje");
  await prisma.apiKey.update({
    where: { id },
    data: { isActive: !existing.isActive },
  });
  revalidatePath("/konfiguracja/integracje");
  return actionOk();
}

export async function deleteApiKey(id: string): Promise<ActionResult> {
  const { tenantId, userId, email } = await requireTenantSession();
  if (!(await hasRestApi(tenantId))) return actionError(REST_API_GATE_MSG);
  const existing = await prisma.apiKey.findFirst({
    where: { id, tenantId },
    select: { id: true, prefix: true },
  });
  if (!existing) return actionError("Klucz nie istnieje");
  await prisma.apiKey.delete({ where: { id } });
  await logAction({
    actor: tenantActor(userId, email),
    tenantId,
    action: "DELETE",
    entity: "ApiKey",
    entityId: id,
    summary: `Usunięto klucz API (${existing.prefix}…)`,
  });
  revalidatePath("/konfiguracja/integracje");
  return actionOk();
}
