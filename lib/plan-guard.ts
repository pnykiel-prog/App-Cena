// ─── Plan-guard — egzekwowanie funkcji/limitów po stronie serwera ─────────────
//
// Wspólna warstwa dla API i server-actions. Czyta plan z bazy (z uwzględnieniem
// limitOverrides) i rzuca PlanFeatureRequiredError, gdy funkcja/limit niedostępne.
// API powinno mapować ten błąd na HTTP 402 z payloadem PLAN_FEATURE_REQUIRED.
//
// Zgodnie z wytycznymi CareQuote_PlanyAbonamentowe_Update.md (pkt 3).

import { prisma } from "@/lib/prisma";
import {
  canFeature,
  isWithinLimit,
  planFromSubscription,
  type FeatureFlags,
  type PlanLimits,
  type Plan,
} from "@/lib/plan-limits";

export class PlanFeatureRequiredError extends Error {
  readonly code = "PLAN_FEATURE_REQUIRED" as const;
  constructor(
    readonly feature: keyof FeatureFlags | (string & {}),
    readonly currentPlan: Plan,
    message?: string,
  ) {
    super(message ?? `Funkcja „${String(feature)}” wymaga wyższego planu.`);
    this.name = "PlanFeatureRequiredError";
  }
}

export class PlanLimitReachedError extends Error {
  readonly code = "PLAN_LIMIT_REACHED" as const;
  constructor(
    readonly limitKey: Exclude<keyof PlanLimits, "features">,
    readonly currentPlan: Plan,
    message?: string,
  ) {
    super(message ?? `Osiągnięto limit „${String(limitKey)}” w bieżącym planie.`);
    this.name = "PlanLimitReachedError";
  }
}

type SubSlice = {
  plan: Plan;
  limitOverrides: unknown;
} | null;

async function loadSub(tenantId: string): Promise<SubSlice> {
  return prisma.subscription.findUnique({
    where: { tenantId },
    select: { plan: true, limitOverrides: true },
  });
}

// Rzuca PlanFeatureRequiredError jeśli plan tenanta nie obejmuje danej funkcji.
export async function requireFeature(
  tenantId: string,
  feature: keyof FeatureFlags,
): Promise<void> {
  const sub = await loadSub(tenantId);
  if (!canFeature(sub, feature)) {
    throw new PlanFeatureRequiredError(feature, planFromSubscription(sub));
  }
}

// Rzuca PlanLimitReachedError jeśli `current` osiągnął limit `key` w planie tenanta.
export async function requireWithinLimit(
  tenantId: string,
  key: Exclude<keyof PlanLimits, "features">,
  current: number,
): Promise<void> {
  const sub = await loadSub(tenantId);
  if (!isWithinLimit(sub, key, current)) {
    throw new PlanLimitReachedError(key, planFromSubscription(sub));
  }
}

// Pomocnik dla API route: zamienia błędy planu na odpowiedź HTTP 402.
// Zwraca null gdy błąd nie jest związany z planem (caller obsłuży inaczej).
export function planErrorResponse(err: unknown): Response | null {
  if (err instanceof PlanFeatureRequiredError) {
    return Response.json(
      { error: err.code, feature: err.feature, currentPlan: err.currentPlan },
      { status: 402 },
    );
  }
  if (err instanceof PlanLimitReachedError) {
    return Response.json(
      { error: err.code, limit: err.limitKey, currentPlan: err.currentPlan },
      { status: 402 },
    );
  }
  return null;
}
