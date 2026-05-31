"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireTenantSession } from "@/lib/tenant-actions";
import { actionError, actionOk, type ActionResult } from "@/lib/action-result";
import { canFeature } from "@/lib/plan-limits";
import { logAction, tenantActor } from "@/lib/audit";

const hexColor = z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Format #RRGGBB");

const schema = z.object({
  name: z.string().min(2).max(120),
  legalName: z.string().max(160).nullish(),
  nip: z.string().max(15).nullish(),
  city: z.string().max(80).nullish(),
  address: z.string().max(200).nullish(),
  postalCode: z.string().max(10).nullish(),
  phone: z.string().max(40).nullish(),
  email: z
    .string()
    .max(120)
    .nullish()
    .refine((v) => !v || /.+@.+\..+/.test(v), "Nieprawidłowy e-mail"),
  website: z.string().max(200).nullish(),
  logoUrl: z.string().max(500).nullish(),
  brandColor: hexColor,
  accentColor: hexColor,
  showRangeWidth: z.number().min(0).max(0.5), // 0..50%
  requirePhoneOnLead: z.boolean(),
  hideBranding: z.boolean(),
  priceDisplay: z.enum(["RANGE", "EXACT"]).default("RANGE"),
});

export async function updateBranding(data: unknown): Promise<ActionResult> {
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

  // Ukrycie „Powered by" to funkcja Pro+. Jeśli plan nie pozwala, nie zezwalamy
  // na włączenie (ale pozwalamy wyłączyć — np. po downgrade).
  let hideBranding = parsed.data.hideBranding;
  if (hideBranding) {
    const subscription = await prisma.subscription.findUnique({
      where: { tenantId },
      select: { plan: true, limitOverrides: true },
    });
    if (!canFeature(subscription, "hideBranding")) {
      return actionError(
        "Ukrycie „Powered by” jest dostępne w planie Pro i wyższych. Przejdź na wyższy plan.",
      );
    }
  }

  // Dokładna cena (zamiast widełek) to funkcja Pro+. Bez uprawnień wymuszamy RANGE.
  let priceDisplay = parsed.data.priceDisplay;
  if (priceDisplay === "EXACT") {
    const sub = await prisma.subscription.findUnique({
      where: { tenantId },
      select: { plan: true, limitOverrides: true },
    });
    if (!canFeature(sub, "exactPrice")) {
      return actionError(
        "Wybór „dokładna cena” jest dostępny w planie Pro i wyższych. Przejdź na wyższy plan.",
      );
    }
  }

  await prisma.tenant.update({
    where: { id: tenantId },
    data: {
      name: parsed.data.name,
      legalName: parsed.data.legalName ?? null,
      nip: parsed.data.nip ?? null,
      city: parsed.data.city ?? null,
      address: parsed.data.address ?? null,
      postalCode: parsed.data.postalCode ?? null,
      phone: parsed.data.phone ?? null,
      email: parsed.data.email ?? null,
      website: parsed.data.website ?? null,
      logoUrl: parsed.data.logoUrl ?? null,
      brandColor: parsed.data.brandColor,
      accentColor: parsed.data.accentColor,
      showRangeWidth: parsed.data.showRangeWidth,
      requirePhoneOnLead: parsed.data.requirePhoneOnLead,
      hideBranding,
      priceDisplay,
    },
  });
  await logAction({
    actor: tenantActor(userId, email),
    tenantId,
    action: "UPDATE",
    entity: "Tenant",
    entityId: tenantId,
    summary: "Zaktualizowano branding placówki",
  });
  revalidatePath("/konfiguracja/branding");
  revalidatePath("/konfiguracja");
  // Widget też się zmienia
  revalidatePath("/w");
  return actionOk();
}
