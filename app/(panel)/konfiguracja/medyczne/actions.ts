"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireTenantSession } from "@/lib/tenant-actions";
import { actionError, actionOk, type ActionResult } from "@/lib/action-result";

const schema = z.object({
  code: z
    .string()
    .min(2)
    .max(40)
    .regex(/^[A-Z0-9_]+$/, "Wielkie litery, cyfry i podkreślenia"),
  label: z.string().min(2).max(120),
  kind: z.enum(["COGNITIVE", "MEDICAL", "BEHAVIORAL", "MOBILITY"]),
  description: z.string().max(500).nullish(),
  monthlySurcharge: z.number().min(0).max(50_000),
  isToggle: z.boolean(),
  sortOrder: z.number().int().min(0).max(999),
  isActive: z.boolean(),
});

export async function upsertModifier(
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

  // Sprawdź unikalność code w obrębie tenanta
  const codeExists = await prisma.medicalModifier.findFirst({
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

  if (id) {
    const existing = await prisma.medicalModifier.findFirst({
      where: { id, tenantId },
      select: { id: true },
    });
    if (!existing) return actionError("Modyfikator nie istnieje");
    await prisma.medicalModifier.update({
      where: { id },
      data: { ...parsed.data, description: parsed.data.description ?? null },
    });
  } else {
    await prisma.medicalModifier.create({
      data: {
        ...parsed.data,
        description: parsed.data.description ?? null,
        tenantId,
      },
    });
  }
  revalidatePath("/konfiguracja/medyczne");
  revalidatePath("/konfiguracja");
  return actionOk();
}

export async function deleteModifier(id: string): Promise<ActionResult> {
  const { tenantId } = await requireTenantSession();
  const existing = await prisma.medicalModifier.findFirst({
    where: { id, tenantId },
    select: { id: true },
  });
  if (!existing) return actionError("Modyfikator nie istnieje");
  await prisma.medicalModifier.delete({ where: { id } });
  revalidatePath("/konfiguracja/medyczne");
  revalidatePath("/konfiguracja");
  return actionOk();
}

export async function toggleModifierActive(id: string): Promise<ActionResult> {
  const { tenantId } = await requireTenantSession();
  const existing = await prisma.medicalModifier.findFirst({
    where: { id, tenantId },
    select: { isActive: true },
  });
  if (!existing) return actionError("Modyfikator nie istnieje");
  await prisma.medicalModifier.update({
    where: { id },
    data: { isActive: !existing.isActive },
  });
  revalidatePath("/konfiguracja/medyczne");
  return actionOk();
}
