// Server-side pricing engine. NEVER call this from the browser — quote
// computation must happen on the server, otherwise a malicious user could
// fabricate cheap estimates. The widget posts inputs, the server returns a
// signed range.

import type {
  AddonService,
  CareTier,
  ContractDiscount,
  MedicalModifier,
  RoomType,
  Tenant,
} from "@prisma/client";

export type AddonInput = {
  code: string;
  monthlyCountEstimate: number;
};

export type ModifierInput = Record<string, number | boolean>;

export type PricingInput = {
  roomTypeId: string;
  barthelScore: number;
  modifiers: ModifierInput;
  addons: AddonInput[];
  contractMonths: number;
};

export type PricingCatalog = {
  tenant: Pick<Tenant, "id" | "currency" | "showRangeWidth">;
  roomTypes: RoomType[];
  careTiers: CareTier[];
  modifiers: MedicalModifier[];
  addons: AddonService[];
  discounts: ContractDiscount[];
};

export type PricingResult = {
  basePrice: number;
  careTier: CareTier | null;
  careSurcharge: number;
  modifiersTotal: number;
  modifiersBreakdown: { code: string; label: string; amount: number }[];
  addonsTotal: number;
  addonsBreakdown: { code: string; label: string; monthlyEquivalent: number }[];
  discountPct: number;
  discountAmount: number;
  estimateMid: number;
  estimateMin: number;
  estimateMax: number;
  currency: string;
};

/** Roczne ekwiwalenty na dzień (do PER_DAY) i miesiąc (PER_MONTH). */
const DAYS_PER_MONTH = 30.44;

function monthlyEquivalent(addon: AddonService, monthlyCount: number): number {
  switch (addon.unit) {
    case "PER_MONTH":
      // Cena ryczałtowa miesięczna — ignorujemy count (zawsze 1).
      return addon.unitPrice;
    case "PER_DAY":
      // Dla "dziennej" interpretujemy `monthlyCount` jako liczbę dób w miesiącu;
      // jeśli 0 → przyjmij 30.44 (typowo dla usług "dziennych" jak wyżywienie).
      return addon.unitPrice * (monthlyCount > 0 ? monthlyCount : DAYS_PER_MONTH);
    case "PER_VISIT":
    case "PER_HOUR":
      return addon.unitPrice * Math.max(0, monthlyCount);
    default:
      return 0;
  }
}

function findCareTier(careTiers: CareTier[], score: number): CareTier | null {
  // Tier którego minBarthel <= score <= maxBarthel. Aktywne, posortowane.
  const sorted = [...careTiers]
    .filter((t) => t.isActive)
    .sort((a, b) => a.minBarthel - b.minBarthel);
  return (
    sorted.find((t) => score >= t.minBarthel && score <= t.maxBarthel) ?? null
  );
}

function pickDiscount(discounts: ContractDiscount[], months: number): ContractDiscount | null {
  const active = discounts
    .filter((d) => d.isActive && months >= d.minMonths)
    .sort((a, b) => b.minMonths - a.minMonths);
  return active[0] ?? null;
}

export function computePricing(
  input: PricingInput,
  catalog: PricingCatalog,
): PricingResult {
  const room = catalog.roomTypes.find(
    (r) => r.id === input.roomTypeId && r.isActive,
  );
  if (!room) {
    throw new Error("Nieprawidłowy typ pokoju");
  }
  const basePrice = room.basePrice;

  const careTier = findCareTier(catalog.careTiers, input.barthelScore);
  const careSurcharge = careTier?.monthlySurcharge ?? 0;

  // Modyfikatory: dla toggle akceptujemy true/1; dla nie-toggle (np. liczba
  // podań) mnożymy monthlySurcharge * value.
  const modifiersBreakdown: PricingResult["modifiersBreakdown"] = [];
  let modifiersTotal = 0;
  for (const mod of catalog.modifiers) {
    if (!mod.isActive) continue;
    const raw = input.modifiers[mod.code];
    if (raw === undefined || raw === null || raw === false || raw === 0) continue;
    const value = mod.isToggle ? 1 : typeof raw === "number" ? raw : 1;
    const amount = mod.monthlySurcharge * value;
    if (amount === 0) continue;
    modifiersBreakdown.push({ code: mod.code, label: mod.label, amount });
    modifiersTotal += amount;
  }

  // Usługi à la carte
  const addonsBreakdown: PricingResult["addonsBreakdown"] = [];
  let addonsTotal = 0;
  for (const ainput of input.addons) {
    const addon = catalog.addons.find(
      (a) => a.code === ainput.code && a.isActive,
    );
    if (!addon) continue;
    const me = monthlyEquivalent(addon, ainput.monthlyCountEstimate);
    if (me <= 0) continue;
    addonsBreakdown.push({ code: addon.code, label: addon.label, monthlyEquivalent: me });
    addonsTotal += me;
  }

  // Suma przed rabatem
  const grossMid = basePrice + careSurcharge + modifiersTotal + addonsTotal;

  // Rabat za długość umowy
  const discount = pickDiscount(catalog.discounts, input.contractMonths);
  const discountPct = discount?.discountPct ?? 0;
  const discountAmount = grossMid * discountPct;
  const estimateMid = Math.max(0, grossMid - discountAmount);

  // Widełki: ±showRangeWidth/2 od estymaty, ale rozpiętość ograniczona do
  // maksymalnie 300 zł (±150 zł), żeby zakres był węższy i bardziej wiarygodny.
  const MAX_HALF_SPREAD = 150;
  const half = (catalog.tenant.showRangeWidth ?? 0.1) / 2;
  const halfAmount = Math.min(estimateMid * half, MAX_HALF_SPREAD);
  const estimateMin = Math.round(estimateMid - halfAmount);
  const estimateMax = Math.round(estimateMid + halfAmount);

  return {
    basePrice,
    careTier,
    careSurcharge,
    modifiersTotal,
    modifiersBreakdown,
    addonsTotal,
    addonsBreakdown,
    discountPct,
    discountAmount,
    estimateMid: Math.round(estimateMid),
    estimateMin,
    estimateMax,
    currency: catalog.tenant.currency ?? "PLN",
  };
}
