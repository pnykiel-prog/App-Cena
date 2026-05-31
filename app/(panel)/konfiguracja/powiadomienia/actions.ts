"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireTenantSession } from "@/lib/tenant-actions";
import { actionError, actionOk, type ActionResult } from "@/lib/action-result";
import { canFeature } from "@/lib/plan-limits";
import { logAction, tenantActor } from "@/lib/audit";

const schema = z.object({
  emailNewLead: z.boolean(),
  emailNewVisit: z.boolean(),
  recipientEmails: z
    .array(z.string().email("Nieprawidłowy e-mail"))
    .max(10, "Maks. 10 odbiorców"),
});

export async function updateNotifications(
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

  // Wielu odbiorców powiadomień e-mail to funkcja Pro+.
  if (parsed.data.recipientEmails.length > 1) {
    const subscription = await prisma.subscription.findUnique({
      where: { tenantId },
      select: { plan: true, limitOverrides: true },
    });
    if (!canFeature(subscription, "emailMultipleRecipients")) {
      return actionError(
        "Wielu odbiorców powiadomień jest dostępne w planie Pro i wyższych. Pozostaw jeden adres lub przejdź na wyższy plan.",
      );
    }
  }

  await prisma.notificationSetting.upsert({
    where: { tenantId },
    update: {
      emailNewLead: parsed.data.emailNewLead,
      emailNewVisit: parsed.data.emailNewVisit,
      recipientEmails: parsed.data.recipientEmails,
    },
    create: {
      tenantId,
      emailNewLead: parsed.data.emailNewLead,
      emailNewVisit: parsed.data.emailNewVisit,
      recipientEmails: parsed.data.recipientEmails,
    },
  });
  await logAction({
    actor: tenantActor(userId, email),
    tenantId,
    action: "UPDATE",
    entity: "NotificationSetting",
    summary: "Zaktualizowano ustawienia powiadomień",
  });
  revalidatePath("/konfiguracja/powiadomienia");
  return actionOk();
}
