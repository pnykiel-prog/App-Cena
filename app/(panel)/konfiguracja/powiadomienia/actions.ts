"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireTenantSession } from "@/lib/tenant-actions";
import { actionError, actionOk, type ActionResult } from "@/lib/action-result";

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
  revalidatePath("/konfiguracja/powiadomienia");
  return actionOk();
}
