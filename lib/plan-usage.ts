// Pomocnik serwerowy: pobiera subskrypcję tenanta i liczy bieżące wykorzystanie
// limitów (do strony /plan, kafelki na dashboardzie i ostrzeżeń >80%).

import { prisma } from "@/lib/prisma";
import {
  getLimits,
  planFromSubscription,
  type Plan,
  type PlanLimits,
} from "@/lib/plan-limits";

export type UsageRow = {
  key: keyof Omit<PlanLimits, "features">;
  label: string;
  used: number;
  limit: number | null; // null = bez limitu
};

export type PlanUsage = {
  plan: Plan;
  status: string;
  trialEndsAt: string | null;
  limits: PlanLimits;
  quoteUsed: number;
  quoteLimit: number | null;
  quotePct: number | null; // 0..100 lub null gdy bez limitu
  rows: UsageRow[];
};

export async function getPlanUsage(tenantId: string): Promise<PlanUsage> {
  const subscription = await prisma.subscription.findUnique({
    where: { tenantId },
    select: {
      plan: true,
      status: true,
      trialEndsAt: true,
      limitOverrides: true,
      quotesThisPeriod: true,
    },
  });

  const [roomCount, addonCount, userCount, recipientAgg] = await Promise.all([
    prisma.roomType.count({ where: { tenantId } }),
    prisma.addonService.count({ where: { tenantId } }),
    prisma.tenantUser.count({ where: { tenantId } }),
    prisma.notificationSetting.findUnique({
      where: { tenantId },
      select: { recipientEmails: true },
    }),
  ]);

  const limits = getLimits(subscription);
  const plan = planFromSubscription(subscription);
  const quoteUsed = subscription?.quotesThisPeriod ?? 0;
  const quoteLimit = limits.monthlyQuoteLimit;

  const rows: UsageRow[] = [
    { key: "monthlyQuoteLimit", label: "Wyceny w okresie", used: quoteUsed, limit: limits.monthlyQuoteLimit },
    { key: "maxRoomTypes", label: "Typy pokoi", used: roomCount, limit: limits.maxRoomTypes },
    { key: "maxAddonServices", label: "Usługi dodatkowe", used: addonCount, limit: limits.maxAddonServices },
    { key: "panelUsers", label: "Użytkownicy panelu", used: userCount, limit: limits.panelUsers },
    {
      key: "embedDomains",
      label: "Odbiorcy powiadomień",
      used: recipientAgg?.recipientEmails.length ?? 0,
      limit: null,
    },
  ];

  return {
    plan,
    status: subscription?.status ?? "TRIAL",
    trialEndsAt: subscription?.trialEndsAt?.toISOString() ?? null,
    limits,
    quoteUsed,
    quoteLimit,
    quotePct:
      quoteLimit === null ? null : Math.min(100, Math.round((quoteUsed / quoteLimit) * 100)),
    rows,
  };
}
