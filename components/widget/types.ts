import type { BarthelItem } from "@/lib/barthel";

export type WidgetTenant = {
  id: string;
  slug: string;
  name: string;
  city: string | null;
  logoUrl: string | null;
  brandColor: string;
  accentColor: string;
  currency: string;
  locale: string;
  showRangeWidth: number;
  requirePhoneOnLead: boolean;
  hideBranding: boolean;
};

export type WidgetRoom = {
  id: string;
  capacity: "SINGLE" | "DOUBLE" | "TRIPLE";
  label: string;
  description: string | null;
  basePrice: number;
  available: number;
};

export type WidgetCareTier = {
  id: string;
  label: string;
  minBarthel: number;
  maxBarthel: number;
  monthlySurcharge: number;
};

export type WidgetMedicalModifier = {
  id: string;
  code: string;
  label: string;
  kind: "COGNITIVE" | "MEDICAL" | "BEHAVIORAL" | "MOBILITY";
  description: string | null;
  monthlySurcharge: number;
  isToggle: boolean;
};

export type WidgetAddon = {
  id: string;
  code: string;
  label: string;
  description: string | null;
  unit: "PER_MONTH" | "PER_DAY" | "PER_HOUR" | "PER_VISIT";
  unitPrice: number;
  defaultMonthly: number | null;
};

export type WidgetDiscount = {
  id: string;
  label: string;
  minMonths: number;
  discountPct: number;
};

export type WidgetConfig = {
  tenant: WidgetTenant;
  barthelItems: BarthelItem[];
  roomTypes: WidgetRoom[];
  careTiers: WidgetCareTier[];
  medicalModifiers: WidgetMedicalModifier[];
  addons: WidgetAddon[];
  discounts: WidgetDiscount[];
};

export type AddonSelection = {
  code: string;
  monthlyCountEstimate: number;
};

export type WizardAnswers = {
  barthelAnswers: Record<string, number>;
  modifiers: Record<string, boolean | number>;
  roomTypeId: string | null;
  selectedAddons: AddonSelection[];
  contractMonths: number;
  seniorFirstName?: string;
  seniorAge?: number;
};

export type QuoteResult = {
  quoteId: string;
  shareToken: string;
  barthelScore: number;
  estimateMin: number;
  estimateMid: number;
  estimateMax: number;
  currency: string;
  breakdown: {
    basePrice: number;
    careTier: { label: string; surcharge: number } | null;
    modifiers: { code: string; label: string; amount: number }[];
    addons: { code: string; label: string; monthlyEquivalent: number }[];
    discountPct: number;
    discountAmount: number;
  };
};

export const STEPS = [
  { key: "intro", label: "Start" },
  { key: "barthel", label: "Samodzielność" },
  { key: "medical", label: "Stan zdrowia" },
  { key: "room", label: "Pokój" },
  { key: "addons", label: "Usługi" },
  { key: "contract", label: "Umowa" },
  { key: "result", label: "Wycena" },
] as const;

export type StepKey = (typeof STEPS)[number]["key"];
