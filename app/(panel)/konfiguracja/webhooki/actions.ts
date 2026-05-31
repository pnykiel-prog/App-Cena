"use server";

import { revalidatePath } from "next/cache";
import { randomBytes } from "node:crypto";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireTenantSession } from "@/lib/tenant-actions";
import { actionError, actionOk, type ActionResult } from "@/lib/action-result";
import { canFeature } from "@/lib/plan-limits";
import { logAction, tenantActor } from "@/lib/audit";

const schema = z.object({
  url: z.string().url("Podaj prawidłowy URL (https://...)").max(500),
  description: z.string().max(200).nullish(),
  isActive: z.boolean(),
});

// Egzekwowanie: webhooki to funkcja Enterprise. Sprawdzamy przy każdej mutacji.
async function requireWebhookFeature(tenantId: string): Promise<ActionResult | null> {
  const subscription = await prisma.subscription.findUnique({
    where: { tenantId },
    select: { plan: true, limitOverrides: true },
  });
  if (!canFeature(subscription, "webhookOnLead")) {
    return actionError(
      "Webhooki są dostępne w planie Enterprise. Przejdź na wyższy plan.",
    );
  }
  return null;
}

export async function upsertWebhook(
  id: string | null,
  data: unknown,
): Promise<ActionResult> {
  const { tenantId, userId, email } = await requireTenantSession();
  const gate = await requireWebhookFeature(tenantId);
  if (gate) return gate;

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
    const existing = await prisma.webhookEndpoint.findFirst({
      where: { id, tenantId },
      select: { id: true },
    });
    if (!existing) return actionError("Webhook nie istnieje");
    await prisma.webhookEndpoint.update({
      where: { id },
      data: {
        url: parsed.data.url,
        description: parsed.data.description ?? null,
        isActive: parsed.data.isActive,
      },
    });
  } else {
    // Sekret HMAC generowany serwerowo (pokazujemy go potem właścicielowi).
    const secret = "whsec_" + randomBytes(24).toString("hex");
    await prisma.webhookEndpoint.create({
      data: {
        tenantId,
        url: parsed.data.url,
        description: parsed.data.description ?? null,
        isActive: parsed.data.isActive,
        secret,
      },
    });
  }
  await logAction({
    actor: tenantActor(userId, email),
    tenantId,
    action: id ? "UPDATE" : "CREATE",
    entity: "WebhookEndpoint",
    entityId: id ?? undefined,
    summary: `${id ? "Zaktualizowano" : "Dodano"} webhook ${parsed.data.url}`,
  });
  revalidatePath("/konfiguracja/webhooki");
  return actionOk();
}

export async function deleteWebhook(id: string): Promise<ActionResult> {
  const { tenantId, userId, email } = await requireTenantSession();
  const gate = await requireWebhookFeature(tenantId);
  if (gate) return gate;

  const existing = await prisma.webhookEndpoint.findFirst({
    where: { id, tenantId },
    select: { id: true },
  });
  if (!existing) return actionError("Webhook nie istnieje");
  await prisma.webhookEndpoint.delete({ where: { id } });
  await logAction({
    actor: tenantActor(userId, email),
    tenantId,
    action: "DELETE",
    entity: "WebhookEndpoint",
    entityId: id,
    summary: "Usunięto webhook",
  });
  revalidatePath("/konfiguracja/webhooki");
  return actionOk();
}

export async function toggleWebhookActive(id: string): Promise<ActionResult> {
  const { tenantId } = await requireTenantSession();
  const gate = await requireWebhookFeature(tenantId);
  if (gate) return gate;

  const existing = await prisma.webhookEndpoint.findFirst({
    where: { id, tenantId },
    select: { isActive: true },
  });
  if (!existing) return actionError("Webhook nie istnieje");
  await prisma.webhookEndpoint.update({
    where: { id },
    data: { isActive: !existing.isActive },
  });
  revalidatePath("/konfiguracja/webhooki");
  return actionOk();
}
