import {
  PrismaClient,
  type Prisma,
  type QuoteStatus,
  type RoomCapacity,
  type VisitStatus,
} from "@prisma/client";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import path from "path";
import { createDbAdapter } from "../lib/db-adapter";
import { computePricing, type PricingCatalog } from "../lib/pricing";
import { scoreBarthel, type BarthelAnswers } from "../lib/barthel";
import { DEFAULT_MEDICAL_MODIFIERS } from "../lib/medical-catalog";

const DAY_MS = 86400_000;

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const adapter = createDbAdapter(process.env.DATABASE_URL!);
const prisma = new PrismaClient({ adapter });

// ─── Reużywalne fragmenty cennika (per tenant) ────────────────────────────────

type RoomSpec = {
  capacity: RoomCapacity;
  label: string;
  description: string;
  basePrice: number;
  available: number;
};

// Progi Barthela, modyfikatory, usługi i rabaty są identyczne dla wszystkich
// tenantów demo — różnią się tylko pokoje (ceny/etykiety). Każdy seeder pilnuje
// idempotencji (count-guard / upsert), więc ponowne uruchomienie jest bezpieczne.
async function seedRooms(tenantId: string, rooms: RoomSpec[]) {
  if ((await prisma.roomType.count({ where: { tenantId } })) > 0) return;
  await prisma.roomType.createMany({
    data: rooms.map((r, i) => ({ tenantId, ...r, sortOrder: i + 1 })),
  });
}

async function seedCareTiers(tenantId: string) {
  if ((await prisma.careTier.count({ where: { tenantId } })) > 0) return;
  await prisma.careTier.createMany({
    data: [
      { tenantId, label: "Pełna niesamodzielność", minBarthel: 0, maxBarthel: 20, monthlySurcharge: 2400, sortOrder: 1 },
      { tenantId, label: "Znaczna niesamodzielność", minBarthel: 21, maxBarthel: 40, monthlySurcharge: 1800, sortOrder: 2 },
      { tenantId, label: "Umiarkowana niesamodzielność", minBarthel: 41, maxBarthel: 60, monthlySurcharge: 1200, sortOrder: 3 },
      { tenantId, label: "Niewielka niesamodzielność", minBarthel: 61, maxBarthel: 85, monthlySurcharge: 600, sortOrder: 4 },
      { tenantId, label: "Samodzielność", minBarthel: 86, maxBarthel: 100, monthlySurcharge: 0, sortOrder: 5 },
    ],
  });
}

async function seedModifiers(tenantId: string) {
  for (let i = 0; i < DEFAULT_MEDICAL_MODIFIERS.length; i++) {
    const spec = DEFAULT_MEDICAL_MODIFIERS[i];
    await prisma.medicalModifier.upsert({
      where: { tenantId_code: { tenantId, code: spec.code } },
      update: {},
      create: {
        tenantId,
        code: spec.code,
        label: spec.label,
        kind: spec.kind,
        description: spec.description,
        monthlySurcharge: spec.defaultMonthlySurcharge,
        isToggle: spec.isToggle,
        sortOrder: i + 1,
      },
    });
  }
}

async function seedAddons(tenantId: string) {
  if ((await prisma.addonService.count({ where: { tenantId } })) > 0) return;
  await prisma.addonService.createMany({
    data: [
      { tenantId, code: "PHYSIO_VISIT", label: "Fizjoterapia indywidualna", description: "Sesja 45 min z fizjoterapeutą.", unit: "PER_VISIT", unitPrice: 120, defaultMonthly: 8, sortOrder: 1 },
      { tenantId, code: "PSYCHO_VISIT", label: "Konsultacja psychologiczna", description: "Sesja 60 min.", unit: "PER_VISIT", unitPrice: 180, defaultMonthly: 2, sortOrder: 2 },
      { tenantId, code: "PRIVATE_NURSE_HOUR", label: "Opiekun prywatny (godzina)", description: "Dedykowany opiekun 1:1.", unit: "PER_HOUR", unitPrice: 65, defaultMonthly: 30, sortOrder: 3 },
      { tenantId, code: "SPECIAL_DIET", label: "Dieta specjalistyczna", description: "Dieta cukrzycowa, bezglutenowa, miksowana itp.", unit: "PER_MONTH", unitPrice: 350, sortOrder: 4 },
      { tenantId, code: "LAUNDRY", label: "Pranie ubrań i pościeli", description: "Pełna obsługa.", unit: "PER_MONTH", unitPrice: 180, sortOrder: 5 },
      { tenantId, code: "TRANSPORT_VISIT", label: "Transport medyczny", description: "Pojedynczy przejazd na konsultację/badanie.", unit: "PER_VISIT", unitPrice: 90, defaultMonthly: 1, sortOrder: 6 },
    ],
  });
}

async function seedDiscounts(tenantId: string) {
  if ((await prisma.contractDiscount.count({ where: { tenantId } })) > 0) return;
  await prisma.contractDiscount.createMany({
    data: [
      { tenantId, label: "Umowa na 12 miesięcy", minMonths: 12, discountPct: 0.03, sortOrder: 1 },
      { tenantId, label: "Umowa na 18 miesięcy", minMonths: 18, discountPct: 0.05, sortOrder: 2 },
      { tenantId, label: "Umowa na 24 miesiące", minMonths: 24, discountPct: 0.08, sortOrder: 3 },
      { tenantId, label: "Umowa dłuższa niż 24 miesiące", minMonths: 25, discountPct: 0.1, sortOrder: 4 },
    ],
  });
}

async function seedTenantCatalog(tenantId: string, rooms: RoomSpec[]) {
  await seedRooms(tenantId, rooms);
  await seedCareTiers(tenantId);
  await seedModifiers(tenantId);
  await seedAddons(tenantId);
  await seedDiscounts(tenantId);
}

// ─── Generator leadów/wizyt (wycena liczona realnym silnikiem pricingu) ────────

type TenantForPricing = { id: string; currency: string; showRangeWidth: number };

type LeadSpec = {
  status: QuoteStatus;
  capacity: RoomCapacity;
  barthel: BarthelAnswers;
  modifiers: string[]; // kody modyfikatorów (toggle)
  addons: { code: string; monthlyCountEstimate: number }[];
  contractMonths: number;
  daysAgo: number;
  contact?: { name: string; phone: string; email: string; marketing?: boolean };
  senior?: { firstName?: string; age?: number };
  notes?: string;
  visit?: { status: VisitStatus; inDays: number; notes?: string };
};

async function seedLeads(tenant: TenantForPricing, slug: string, specs: LeadSpec[]) {
  if ((await prisma.quote.count({ where: { tenantId: tenant.id } })) > 0) {
    console.log(`  • Leady dla /${slug} już istnieją — pomijam.`);
    return;
  }

  // Zbuduj katalog cennika z bazy (te same dane, których używa widget).
  const [roomTypes, careTiers, modifiers, addons, discounts] = await Promise.all([
    prisma.roomType.findMany({ where: { tenantId: tenant.id } }),
    prisma.careTier.findMany({ where: { tenantId: tenant.id } }),
    prisma.medicalModifier.findMany({ where: { tenantId: tenant.id } }),
    prisma.addonService.findMany({ where: { tenantId: tenant.id } }),
    prisma.contractDiscount.findMany({ where: { tenantId: tenant.id } }),
  ]);

  const catalog: PricingCatalog = {
    tenant: { id: tenant.id, currency: tenant.currency, showRangeWidth: tenant.showRangeWidth },
    roomTypes,
    careTiers,
    modifiers,
    addons,
    discounts,
  };

  let leads = 0;
  let visits = 0;
  for (const spec of specs) {
    const room = roomTypes.find((r) => r.capacity === spec.capacity);
    if (!room) continue;

    const barthelScore = scoreBarthel(spec.barthel);
    const medModifiers: Record<string, boolean> = {};
    for (const code of spec.modifiers) medModifiers[code] = true;

    const pricing = computePricing(
      {
        roomTypeId: room.id,
        barthelScore,
        modifiers: medModifiers,
        addons: spec.addons,
        contractMonths: spec.contractMonths,
      },
      catalog,
    );

    const createdAt = new Date(Date.now() - spec.daysAgo * DAY_MS);

    const quote = await prisma.quote.create({
      data: {
        tenantId: tenant.id,
        barthelScore,
        barthelAnswers: spec.barthel as Prisma.InputJsonValue,
        medModifiers: medModifiers as Prisma.InputJsonValue,
        roomTypeId: room.id,
        addons: spec.addons as unknown as Prisma.InputJsonValue,
        contractMonths: spec.contractMonths,
        basePrice: pricing.basePrice,
        careTierLabel: pricing.careTier?.label ?? null,
        careSurcharge: pricing.careSurcharge,
        modifiersTotal: pricing.modifiersTotal,
        addonsTotal: pricing.addonsTotal,
        discountPct: pricing.discountPct,
        estimateMin: pricing.estimateMin,
        estimateMid: pricing.estimateMid,
        estimateMax: pricing.estimateMax,
        currency: pricing.currency,
        status: spec.status,
        contactName: spec.contact?.name ?? null,
        contactPhone: spec.contact?.phone ?? null,
        contactEmail: spec.contact?.email ?? null,
        consentRodo: Boolean(spec.contact),
        consentMarketing: spec.contact?.marketing ?? false,
        seniorFirstName: spec.senior?.firstName ?? null,
        seniorAge: spec.senior?.age ?? null,
        notes: spec.notes ?? null,
        createdAt,
      },
    });
    leads++;

    if (spec.visit && spec.contact) {
      await prisma.visitBooking.create({
        data: {
          tenantId: tenant.id,
          quoteId: quote.id,
          contactName: spec.contact.name,
          contactPhone: spec.contact.phone,
          contactEmail: spec.contact.email,
          preferredAt: new Date(Date.now() + spec.visit.inDays * DAY_MS),
          notes: spec.visit.notes ?? null,
          status: spec.visit.status,
          confirmedAt: spec.visit.status === "CONFIRMED" ? createdAt : null,
        },
      });
      visits++;
    }
  }
  console.log(`  ✓ ${leads} leadów + ${visits} wizyt dla /${slug}`);
}

// Zestaw demonstracyjnych leadów dla Willi Lawendowej — różne statusy w lejku,
// realistyczny rozrzut profili Barthela, modyfikatorów i usług dodatkowych.
const WILLA_LEADS: LeadSpec[] = [
  {
    // Porzucony szkic (anonimowy) — senior w pełni samodzielny.
    status: "DRAFT",
    capacity: "SINGLE",
    barthel: { feeding: 10, transfer: 15, grooming: 5, toilet: 10, bathing: 5, mobility: 15, stairs: 5, dressing: 10, bowels: 10, bladder: 10 },
    modifiers: [],
    addons: [],
    contractMonths: 12,
    daysAgo: 1,
  },
  {
    // Nowy lead — lekkie wsparcie, cukrzyca.
    status: "NEW",
    capacity: "DOUBLE",
    barthel: { feeding: 10, transfer: 10, grooming: 5, toilet: 10, bathing: 0, mobility: 10, stairs: 5, dressing: 5, bowels: 10, bladder: 5 },
    modifiers: ["DIABETES_INSULIN"],
    addons: [{ code: "PHYSIO_VISIT", monthlyCountEstimate: 4 }],
    contractMonths: 12,
    daysAgo: 2,
    contact: { name: "Katarzyna Wiśniewska", phone: "+48 601 234 567", email: "k.wisniewska@example.pl", marketing: true },
    senior: { firstName: "Helena", age: 78 },
  },
  {
    // Po pierwszym kontakcie — umiarkowana niesamodzielność, demencja.
    status: "CONTACTED",
    capacity: "SINGLE",
    barthel: { feeding: 5, transfer: 10, grooming: 5, toilet: 5, bathing: 0, mobility: 5, stairs: 0, dressing: 5, bowels: 5, bladder: 5 },
    modifiers: ["DEMENTIA", "INCONTINENCE"],
    addons: [{ code: "PRIVATE_NURSE_HOUR", monthlyCountEstimate: 10 }],
    contractMonths: 24,
    daysAgo: 6,
    contact: { name: "Marek Zieliński", phone: "+48 602 345 678", email: "m.zielinski@example.pl" },
    senior: { firstName: "Stanisław", age: 84 },
    notes: "Rodzina dzwoniła, prosi o ofertę z dietą cukrzycową. Oddzwonić w tym tygodniu.",
  },
  {
    // Umówiona wizyta — znaczna niesamodzielność, demencja + błądzenie.
    status: "VISIT_SCHEDULED",
    capacity: "SINGLE",
    barthel: { feeding: 5, transfer: 5, grooming: 0, toilet: 5, bathing: 0, mobility: 5, stairs: 0, dressing: 5, bowels: 5, bladder: 0 },
    modifiers: ["DEMENTIA", "WANDERING", "INCONTINENCE"],
    addons: [{ code: "SPECIAL_DIET", monthlyCountEstimate: 1 }],
    contractMonths: 24,
    daysAgo: 9,
    contact: { name: "Agnieszka Lewandowska", phone: "+48 603 456 789", email: "a.lewandowska@example.pl", marketing: true },
    senior: { firstName: "Janina", age: 86 },
    notes: "Umówiona wizyta w placówce z córką.",
    visit: { status: "CONFIRMED", inDays: 3, notes: "Zwiedzanie placówki + rozmowa o oddziale zamkniętym." },
  },
  {
    // Wygrany — pełna opieka, pacjent leżący z PEG.
    status: "WON",
    capacity: "DOUBLE",
    barthel: { feeding: 0, transfer: 5, grooming: 0, toilet: 0, bathing: 0, mobility: 0, stairs: 0, dressing: 0, bowels: 5, bladder: 0 },
    modifiers: ["BEDRIDDEN", "PEG_FEEDING", "INCONTINENCE"],
    addons: [{ code: "PHYSIO_VISIT", monthlyCountEstimate: 8 }, { code: "LAUNDRY", monthlyCountEstimate: 1 }],
    contractMonths: 24,
    daysAgo: 18,
    contact: { name: "Tomasz Kamiński", phone: "+48 604 567 890", email: "t.kaminski@example.pl" },
    senior: { firstName: "Zofia", age: 90 },
    notes: "Umowa podpisana, wprowadzenie od początku miesiąca.",
  },
  {
    // Przegrany — wybrali inną placówkę.
    status: "LOST",
    capacity: "SINGLE",
    barthel: { feeding: 10, transfer: 10, grooming: 5, toilet: 5, bathing: 0, mobility: 5, stairs: 5, dressing: 5, bowels: 5, bladder: 5 },
    modifiers: ["OXYGEN_THERAPY"],
    addons: [],
    contractMonths: 12,
    daysAgo: 21,
    contact: { name: "Barbara Mazur", phone: "+48 605 678 901", email: "b.mazur@example.pl" },
    senior: { firstName: "Edward", age: 81 },
    notes: "Zdecydowali się na placówkę bliżej domu.",
  },
  {
    // Druga umówiona wizyta (do potwierdzenia) — niewielkie wsparcie.
    status: "VISIT_SCHEDULED",
    capacity: "DOUBLE",
    barthel: { feeding: 10, transfer: 15, grooming: 5, toilet: 10, bathing: 5, mobility: 10, stairs: 5, dressing: 10, bowels: 5, bladder: 5 },
    modifiers: ["DIABETES_INSULIN"],
    addons: [{ code: "PHYSIO_VISIT", monthlyCountEstimate: 6 }],
    contractMonths: 18,
    daysAgo: 4,
    contact: { name: "Piotr Nowicki", phone: "+48 606 789 012", email: "p.nowicki@example.pl", marketing: true },
    senior: { firstName: "Halina", age: 75 },
    visit: { status: "REQUESTED", inDays: 7, notes: "Prosi o wizytę po godzinie 15:00." },
  },
];

async function main() {
  console.log("→ Seeding CareQuote demo data...");

  // 1) Super-admin
  const adminEmail = "p.nykiel@gmail.com";
  const adminPassword = await bcrypt.hash("admin123", 10);
  const admin = await prisma.platformAdmin.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      name: "Paweł Nykiel",
      password: adminPassword,
    },
  });
  console.log(`  ✓ Super-admin: ${admin.email}`);

  // 2) Demo tenant — Dom Seniora Solaris
  const tenant = await prisma.tenant.upsert({
    where: { slug: "solaris" },
    update: {},
    create: {
      slug: "solaris",
      name: "Dom Seniora Solaris",
      legalName: "Solaris Care sp. z o.o.",
      city: "Warszawa",
      address: "ul. Słoneczna 12",
      postalCode: "02-495",
      phone: "+48 22 123 45 67",
      email: "kontakt@solaris-senior.pl",
      website: "https://solaris-senior.pl",
      brandColor: "#1e3a5f",
      accentColor: "#C9A84C",
      status: "ACTIVE",
    },
  });
  console.log(`  ✓ Tenant: ${tenant.name} (/${tenant.slug})`);

  // 3) Subscription
  await prisma.subscription.upsert({
    where: { tenantId: tenant.id },
    update: {},
    create: {
      tenantId: tenant.id,
      plan: "PRO",
      status: "ACTIVE",
      monthlyPrice: 499,
      trialEndsAt: null,
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 30 * DAY_MS),
    },
  });
  console.log("  ✓ Subscription: PRO (active)");

  // 4) Manager
  const managerEmail = "manager@solaris-senior.pl";
  const managerPassword = await bcrypt.hash("manager123", 10);
  const manager = await prisma.tenantUser.upsert({
    where: { email: managerEmail },
    update: {},
    create: {
      tenantId: tenant.id,
      email: managerEmail,
      name: "Anna Kowalska",
      password: managerPassword,
      role: "MANAGER",
      status: "ACTIVE",
    },
  });
  console.log(`  ✓ Manager: ${manager.email}`);

  // 5) Notification settings
  await prisma.notificationSetting.upsert({
    where: { tenantId: tenant.id },
    update: {},
    create: {
      tenantId: tenant.id,
      emailNewLead: true,
      emailNewVisit: true,
      recipientEmails: [managerEmail],
    },
  });

  // 6–10) Cennik tenanta Solaris
  await seedTenantCatalog(tenant.id, [
    { capacity: "SINGLE", label: "Pokój 1-osobowy z balkonem", description: "Komfortowy pokój z balkonem i prywatną łazienką.", basePrice: 6500, available: 4 },
    { capacity: "DOUBLE", label: "Pokój 2-osobowy", description: "Pokój dzielony, każde łóżko z parawanem i szafą.", basePrice: 5200, available: 6 },
    { capacity: "TRIPLE", label: "Pokój 3-osobowy", description: "Najbardziej ekonomiczna opcja, wspólna łazienka.", basePrice: 4200, available: 3 },
  ]);
  console.log("  ✓ Cennik Solaris (pokoje, progi, modyfikatory, usługi, rabaty)");

  // ─── Drugi demo tenant — Willa Lawendowa (Kraków) ───────────────────────────
  const willa = await prisma.tenant.upsert({
    where: { slug: "willa-lawendowa" },
    update: {},
    create: {
      slug: "willa-lawendowa",
      name: "Willa Lawendowa",
      city: "Kraków",
      email: "kontakt@willa-lawendowa.pl",
      brandColor: "#1e3a5f",
      accentColor: "#C9A84C",
      status: "ACTIVE",
    },
  });
  console.log(`  ✓ Tenant: ${willa.name} (/${willa.slug})`);

  await prisma.subscription.upsert({
    where: { tenantId: willa.id },
    update: {},
    create: {
      tenantId: willa.id,
      plan: "PRO",
      status: "ACTIVE",
      monthlyPrice: 499,
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 30 * DAY_MS),
    },
  });

  const willaOwnerEmail = "maria@willa-lawendowa.pl";
  const willaOwnerPassword = await bcrypt.hash("manager123", 10);
  const willaOwner = await prisma.tenantUser.upsert({
    where: { email: willaOwnerEmail },
    update: {},
    create: {
      tenantId: willa.id,
      email: willaOwnerEmail,
      name: "Maria Nowak",
      password: willaOwnerPassword,
      role: "OWNER",
      status: "ACTIVE",
    },
  });
  console.log(`  ✓ Owner: ${willaOwner.email}`);

  await prisma.notificationSetting.upsert({
    where: { tenantId: willa.id },
    update: {},
    create: {
      tenantId: willa.id,
      emailNewLead: true,
      emailNewVisit: true,
      recipientEmails: [willaOwnerEmail],
    },
  });

  await seedTenantCatalog(willa.id, [
    { capacity: "SINGLE", label: "Pokój 1-osobowy", description: "Jasny pokój jednoosobowy z własną łazienką.", basePrice: 5500, available: 2 },
    { capacity: "DOUBLE", label: "Pokój 2-osobowy", description: "Przytulny pokój dwuosobowy z widokiem na ogród.", basePrice: 4500, available: 4 },
    { capacity: "TRIPLE", label: "Pokój 3-osobowy", description: "Ekonomiczny pokój trzyosobowy.", basePrice: 3800, available: 2 },
  ]);
  console.log("  ✓ Cennik Willa Lawendowa (pokoje, progi, modyfikatory, usługi, rabaty)");

  // Leady + wizyty dla Willi Lawendowej
  await seedLeads(
    { id: willa.id, currency: willa.currency, showRangeWidth: willa.showRangeWidth },
    willa.slug,
    WILLA_LEADS,
  );

  console.log("\n✅ Seed zakończony pomyślnie.");
  console.log("\nLogowanie:");
  console.log("  Super-admin: p.nykiel@gmail.com / admin123  →  /admin-logowanie");
  console.log("  Manager:     manager@solaris-senior.pl / manager123  →  /logowanie");
  console.log("  Owner:       maria@willa-lawendowa.pl / manager123  →  /logowanie");
  console.log("  Widget:      /w/solaris  •  /w/willa-lawendowa");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
