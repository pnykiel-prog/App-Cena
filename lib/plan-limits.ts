// ─── Plan-limits — JEDNO ŹRÓDŁO PRAWDY dla planów abonamentowych ──────────────
//
// Definicje planów (limity ilościowe + flagi funkcyjne) żyją w KODZIE, nie w bazie.
// Per-placówkowe wyjątki trzymamy w Subscription.limitOverrides (JSON) i nakładamy
// na limity bazowe planu. Egzekwowanie limitów (plan-guard, FeatureGate) to kolejna
// faza — tu dostarczamy wyłącznie dane + helpery odczytu.
//
// Zgodnie z wytycznymi: CareQuote_PlanyAbonamentowe_Update.md

export type Plan = "TRIAL" | "STARTER" | "PRO" | "ENTERPRISE";

// Flagi funkcyjne (włączone/wyłączone per plan).
export type FeatureFlags = {
  analyticsFunnel: boolean; // wykresy/analityka na dashboardzie
  exportCsv: boolean; // eksport leadów CSV/XLSX
  hideBranding: boolean; // ukrycie „Powered by"
  emailMultipleRecipients: boolean; // wielu odbiorców powiadomień e-mail
  calendarGoogle: boolean; // integracja Google Calendar
  calendarOutlook: boolean; // integracja Outlook/iCal
  slackTeamsIntegration: boolean; // Slack/Teams
  smsNotifications: boolean; // powiadomienia SMS
  webhookOnLead: boolean; // webhook po leadzie (HMAC)
  customQuestions: boolean; // własne pytania w module medycznym
  customDomain: boolean; // custom domena widgetu (CNAME)
  multiLanguage: boolean; // wielojęzyczność widgetu
  restApi: boolean; // REST API + klucze API
  sso: boolean; // SSO Google/Microsoft
  auditLog: boolean; // audit log w panelu placówki
  multiLocation: boolean; // wiele lokalizacji
  zapierMake: boolean; // Zapier/Make
  exactPrice: boolean; // wybór: widełki vs dokładna cena w widgecie
};

// Limity ilościowe. `null` = bez limitu.
export type PlanLimits = {
  monthlyQuoteLimit: number | null; // wyceny w okresie (limit miękki)
  maxRoomTypes: number | null;
  maxAddonServices: number | null;
  panelUsers: number | null;
  embedDomains: number | null;
  leadRetentionDays: number | null; // retencja leadów
  auditLogMonths: number | null; // retencja audit logu
  features: FeatureFlags;
};

const NONE: FeatureFlags = {
  analyticsFunnel: false,
  exportCsv: false,
  hideBranding: false,
  emailMultipleRecipients: false,
  calendarGoogle: false,
  calendarOutlook: false,
  slackTeamsIntegration: false,
  smsNotifications: false,
  webhookOnLead: false,
  customQuestions: false,
  customDomain: false,
  multiLanguage: false,
  restApi: false,
  sso: false,
  auditLog: false,
  multiLocation: false,
  zapierMake: false,
  exactPrice: false,
};

export const PLAN_LIMITS: Record<Plan, PlanLimits> = {
  // TRIAL — pełny dostęp jak PRO przez 14 dni (do oceny produktu).
  TRIAL: {
    monthlyQuoteLimit: 100,
    maxRoomTypes: 10,
    maxAddonServices: 20,
    panelUsers: 5,
    embedDomains: 3,
    leadRetentionDays: 90,
    auditLogMonths: 6,
    features: {
      ...NONE,
      analyticsFunnel: true,
      exportCsv: true,
      hideBranding: true,
      emailMultipleRecipients: true,
      calendarGoogle: true,
      slackTeamsIntegration: true,
      multiLanguage: true,
      auditLog: true,
      zapierMake: true,
      exactPrice: true,
    },
  },

  STARTER: {
    monthlyQuoteLimit: 50,
    maxRoomTypes: 3,
    maxAddonServices: 6,
    panelUsers: 1,
    embedDomains: 1,
    leadRetentionDays: 90,
    auditLogMonths: null,
    features: { ...NONE },
  },

  PRO: {
    monthlyQuoteLimit: 300,
    maxRoomTypes: 10,
    maxAddonServices: 20,
    panelUsers: 5,
    embedDomains: 3,
    leadRetentionDays: 365,
    auditLogMonths: 6,
    features: {
      ...NONE,
      analyticsFunnel: true,
      exportCsv: true,
      hideBranding: true,
      emailMultipleRecipients: true,
      calendarGoogle: true,
      slackTeamsIntegration: true,
      multiLanguage: true,
      auditLog: true,
      zapierMake: true,
      exactPrice: true,
    },
  },

  ENTERPRISE: {
    monthlyQuoteLimit: null,
    maxRoomTypes: null,
    maxAddonServices: null,
    panelUsers: null,
    embedDomains: null,
    leadRetentionDays: null,
    auditLogMonths: 24,
    features: {
      analyticsFunnel: true,
      exportCsv: true,
      hideBranding: true,
      emailMultipleRecipients: true,
      calendarGoogle: true,
      calendarOutlook: true,
      slackTeamsIntegration: true,
      smsNotifications: true,
      webhookOnLead: true,
      customQuestions: true,
      customDomain: true,
      multiLanguage: true,
      restApi: true,
      sso: true,
      auditLog: true,
      multiLocation: true,
      zapierMake: true,
      exactPrice: true,
    },
  },
};

// Ludzkie etykiety planów (UI).
export const PLAN_LABEL: Record<Plan, string> = {
  TRIAL: "Trial",
  STARTER: "Starter",
  PRO: "Pro",
  ENTERPRISE: "Enterprise",
};

// Sugerowane ceny miesięczne (placeholder — decyzja handlowa). 0 = wycena indywidualna.
export const PLAN_PRICE: Record<Plan, number> = {
  TRIAL: 0,
  STARTER: 199,
  PRO: 499,
  ENTERPRISE: 1499,
};

// Kolejność planów (do matrycy i porównań „wyższy plan").
export const PLAN_ORDER: Plan[] = ["TRIAL", "STARTER", "PRO", "ENTERPRISE"];

// ─── Helpery odczytu ──────────────────────────────────────────────────────────

type SubscriptionLike = {
  plan: Plan;
  limitOverrides?: unknown;
} | null | undefined;

export function planFromSubscription(sub: SubscriptionLike): Plan {
  return sub?.plan ?? "TRIAL";
}

// Limity dla planu z nałożonymi per-tenant nadpisaniami z Subscription.limitOverrides.
// Nadpisania mogą zmieniać limity ilościowe oraz pojedyncze flagi funkcyjne, np.:
//   { "monthlyQuoteLimit": 1000, "features": { "exportCsv": true } }
export function getLimits(sub: SubscriptionLike): PlanLimits {
  const plan = planFromSubscription(sub);
  const base = PLAN_LIMITS[plan];

  const ov = sub?.limitOverrides;
  if (!ov || typeof ov !== "object") return base;

  const o = ov as Partial<PlanLimits> & { features?: Partial<FeatureFlags> };
  return {
    ...base,
    ...stripUndefined(o, ["features"]),
    features: { ...base.features, ...(o.features ?? {}) },
  };
}

export function canFeature(sub: SubscriptionLike, feature: keyof FeatureFlags): boolean {
  return getLimits(sub).features[feature];
}

// Czy `current` mieści się w limicie `key`. `null` (brak limitu) → zawsze true.
export function isWithinLimit(
  sub: SubscriptionLike,
  key: Exclude<keyof PlanLimits, "features">,
  current: number,
): boolean {
  const limit = getLimits(sub)[key];
  if (limit === null) return true;
  return current < limit;
}

function stripUndefined<T extends object>(obj: T, omit: string[]): Partial<T> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || omit.includes(k)) continue;
    out[k] = v;
  }
  return out as Partial<T>;
}
