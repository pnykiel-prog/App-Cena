import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

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
      currentPeriodEnd: new Date(Date.now() + 30 * 86400_000),
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

  // 6) Room types (3)
  const existingRooms = await prisma.roomType.count({ where: { tenantId: tenant.id } });
  if (existingRooms === 0) {
    await prisma.roomType.createMany({
      data: [
        {
          tenantId: tenant.id,
          capacity: "SINGLE",
          label: "Pokój 1-osobowy z balkonem",
          description: "Komfortowy pokój z balkonem i prywatną łazienką.",
          basePrice: 6500,
          available: 4,
          sortOrder: 1,
        },
        {
          tenantId: tenant.id,
          capacity: "DOUBLE",
          label: "Pokój 2-osobowy",
          description: "Pokój dzielony, każde łóżko z parawanem i szafą.",
          basePrice: 5200,
          available: 6,
          sortOrder: 2,
        },
        {
          tenantId: tenant.id,
          capacity: "TRIPLE",
          label: "Pokój 3-osobowy",
          description: "Najbardziej ekonomiczna opcja, wspólna łazienka.",
          basePrice: 4200,
          available: 3,
          sortOrder: 3,
        },
      ],
    });
    console.log("  ✓ 3 typy pokoi");
  }

  // 7) Care tiers / progi Barthela (5)
  const existingTiers = await prisma.careTier.count({ where: { tenantId: tenant.id } });
  if (existingTiers === 0) {
    await prisma.careTier.createMany({
      data: [
        {
          tenantId: tenant.id,
          label: "Pełna niesamodzielność",
          minBarthel: 0,
          maxBarthel: 20,
          monthlySurcharge: 2400,
          sortOrder: 1,
        },
        {
          tenantId: tenant.id,
          label: "Znaczna niesamodzielność",
          minBarthel: 21,
          maxBarthel: 40,
          monthlySurcharge: 1800,
          sortOrder: 2,
        },
        {
          tenantId: tenant.id,
          label: "Umiarkowana niesamodzielność",
          minBarthel: 41,
          maxBarthel: 60,
          monthlySurcharge: 1200,
          sortOrder: 3,
        },
        {
          tenantId: tenant.id,
          label: "Niewielka niesamodzielność",
          minBarthel: 61,
          maxBarthel: 85,
          monthlySurcharge: 600,
          sortOrder: 4,
        },
        {
          tenantId: tenant.id,
          label: "Samodzielność",
          minBarthel: 86,
          maxBarthel: 100,
          monthlySurcharge: 0,
          sortOrder: 5,
        },
      ],
    });
    console.log("  ✓ 5 progów Barthela");
  }

  // 8) Medical modifiers (9) — z katalogu domyślnego
  const { DEFAULT_MEDICAL_MODIFIERS } = await import("../lib/medical-catalog");
  for (let i = 0; i < DEFAULT_MEDICAL_MODIFIERS.length; i++) {
    const spec = DEFAULT_MEDICAL_MODIFIERS[i];
    await prisma.medicalModifier.upsert({
      where: { tenantId_code: { tenantId: tenant.id, code: spec.code } },
      update: {},
      create: {
        tenantId: tenant.id,
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
  console.log(`  ✓ ${DEFAULT_MEDICAL_MODIFIERS.length} modyfikatorów medycznych`);

  // 9) Addon services (6)
  const existingAddons = await prisma.addonService.count({ where: { tenantId: tenant.id } });
  if (existingAddons === 0) {
    await prisma.addonService.createMany({
      data: [
        {
          tenantId: tenant.id,
          code: "PHYSIO_VISIT",
          label: "Fizjoterapia indywidualna",
          description: "Sesja 45 min z fizjoterapeutą.",
          unit: "PER_VISIT",
          unitPrice: 120,
          defaultMonthly: 8,
          sortOrder: 1,
        },
        {
          tenantId: tenant.id,
          code: "PSYCHO_VISIT",
          label: "Konsultacja psychologiczna",
          description: "Sesja 60 min.",
          unit: "PER_VISIT",
          unitPrice: 180,
          defaultMonthly: 2,
          sortOrder: 2,
        },
        {
          tenantId: tenant.id,
          code: "PRIVATE_NURSE_HOUR",
          label: "Opiekun prywatny (godzina)",
          description: "Dedykowany opiekun 1:1.",
          unit: "PER_HOUR",
          unitPrice: 65,
          defaultMonthly: 30,
          sortOrder: 3,
        },
        {
          tenantId: tenant.id,
          code: "SPECIAL_DIET",
          label: "Dieta specjalistyczna",
          description: "Dieta cukrzycowa, bezglutenowa, miksowana itp.",
          unit: "PER_MONTH",
          unitPrice: 350,
          sortOrder: 4,
        },
        {
          tenantId: tenant.id,
          code: "LAUNDRY",
          label: "Pranie ubrań i pościeli",
          description: "Pełna obsługa.",
          unit: "PER_MONTH",
          unitPrice: 180,
          sortOrder: 5,
        },
        {
          tenantId: tenant.id,
          code: "TRANSPORT_VISIT",
          label: "Transport medyczny",
          description: "Pojedynczy przejazd na konsultację/badanie.",
          unit: "PER_VISIT",
          unitPrice: 90,
          defaultMonthly: 1,
          sortOrder: 6,
        },
      ],
    });
    console.log("  ✓ 6 usług à la carte");
  }

  // 10) Contract discounts (4)
  const existingDiscounts = await prisma.contractDiscount.count({
    where: { tenantId: tenant.id },
  });
  if (existingDiscounts === 0) {
    await prisma.contractDiscount.createMany({
      data: [
        {
          tenantId: tenant.id,
          label: "Umowa na 12 miesięcy",
          minMonths: 12,
          discountPct: 0.03,
          sortOrder: 1,
        },
        {
          tenantId: tenant.id,
          label: "Umowa na 18 miesięcy",
          minMonths: 18,
          discountPct: 0.05,
          sortOrder: 2,
        },
        {
          tenantId: tenant.id,
          label: "Umowa na 24 miesiące",
          minMonths: 24,
          discountPct: 0.08,
          sortOrder: 3,
        },
        {
          tenantId: tenant.id,
          label: "Umowa dłuższa niż 24 miesiące",
          minMonths: 25,
          discountPct: 0.1,
          sortOrder: 4,
        },
      ],
    });
    console.log("  ✓ 4 rabaty kontraktowe");
  }

  console.log("\n✅ Seed zakończony pomyślnie.");
  console.log("\nLogowanie:");
  console.log("  Super-admin: p.nykiel@gmail.com / admin123  →  /admin-logowanie");
  console.log("  Manager:     manager@solaris-senior.pl / manager123  →  /logowanie");
  console.log("  Widget:      /w/solaris");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
