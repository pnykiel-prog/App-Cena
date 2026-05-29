"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireTenantSession } from "@/lib/tenant-actions";
import { actionError, actionOk, type ActionResult } from "@/lib/action-result";

const statusEnum = z.enum([
  "DRAFT",
  "NEW",
  "CONTACTED",
  "VISIT_SCHEDULED",
  "WON",
  "LOST",
  "ARCHIVED",
]);

export async function updateLeadStatus(
  id: string,
  status: string,
): Promise<ActionResult> {
  const { tenantId } = await requireTenantSession();
  const parsed = statusEnum.safeParse(status);
  if (!parsed.success) return actionError("Nieprawidłowy status");
  const existing = await prisma.quote.findFirst({
    where: { id, tenantId },
    select: { id: true },
  });
  if (!existing) return actionError("Lead nie istnieje");
  await prisma.quote.update({
    where: { id },
    data: { status: parsed.data },
  });
  revalidatePath(`/leady/${id}`);
  revalidatePath("/leady");
  revalidatePath("/dashboard");
  return actionOk();
}

const notesSchema = z.object({
  notes: z.string().max(5000).nullish(),
});

export async function updateLeadNotes(
  id: string,
  data: unknown,
): Promise<ActionResult> {
  const { tenantId } = await requireTenantSession();
  const parsed = notesSchema.safeParse(data);
  if (!parsed.success) return actionError("Nieprawidłowe dane");
  const existing = await prisma.quote.findFirst({
    where: { id, tenantId },
    select: { id: true },
  });
  if (!existing) return actionError("Lead nie istnieje");
  await prisma.quote.update({
    where: { id },
    data: { notes: parsed.data.notes ?? null },
  });
  revalidatePath(`/leady/${id}`);
  return actionOk();
}
