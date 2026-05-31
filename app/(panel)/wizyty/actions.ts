"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireTenantSession } from "@/lib/tenant-actions";
import { actionError, actionOk, type ActionResult } from "@/lib/action-result";
import { canFeature } from "@/lib/plan-limits";
import { logAction, tenantActor } from "@/lib/audit";
import { generateFeedToken } from "@/lib/ical";

// Integracja kalendarza (feed iCal) wymaga funkcji calendarGoogle (Pro+).
async function hasCalendar(tenantId: string): Promise<boolean> {
  const subscription = await prisma.subscription.findUnique({
    where: { tenantId },
    select: { plan: true, limitOverrides: true },
  });
  return canFeature(subscription, "calendarGoogle");
}

const GATE_MSG =
  "Integracja z kalendarzem jest dostępna w planie Pro i wyższych. Przejdź na wyższy plan.";

// Włącza integrację (tworzy token feedu) lub regeneruje token (rotacja).
export async function enableCalendarFeed(): Promise<ActionResult> {
  const { tenantId, userId, email } = await requireTenantSession();
  if (!(await hasCalendar(tenantId))) return actionError(GATE_MSG);

  const feedToken = generateFeedToken();
  await prisma.calendarIntegration.upsert({
    where: { tenantId },
    update: { feedToken, isActive: true },
    create: { tenantId, provider: "ICAL", feedToken, isActive: true },
  });
  await logAction({
    actor: tenantActor(userId, email),
    tenantId,
    action: "UPDATE",
    entity: "CalendarIntegration",
    summary: "Włączono/zregenerowano feed kalendarza (iCal)",
  });
  revalidatePath("/wizyty");
  return actionOk();
}

export async function disableCalendarFeed(): Promise<ActionResult> {
  const { tenantId, userId, email } = await requireTenantSession();
  if (!(await hasCalendar(tenantId))) return actionError(GATE_MSG);

  const existing = await prisma.calendarIntegration.findUnique({
    where: { tenantId },
    select: { id: true },
  });
  if (!existing) return actionOk();
  await prisma.calendarIntegration.update({
    where: { tenantId },
    data: { isActive: false },
  });
  await logAction({
    actor: tenantActor(userId, email),
    tenantId,
    action: "UPDATE",
    entity: "CalendarIntegration",
    summary: "Wyłączono feed kalendarza",
  });
  revalidatePath("/wizyty");
  return actionOk();
}
