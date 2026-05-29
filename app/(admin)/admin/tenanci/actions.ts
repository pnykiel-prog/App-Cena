"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/admin-actions";
import { actionError, actionOk, type ActionResult } from "@/lib/action-result";
import { DEFAULT_MEDICAL_MODIFIERS } from "@/lib/medical-catalog";

const createSchema = z
  .object({
    name: z.string().min(2).max(120),
    slug: z
      .string()
      .min(2)
      .max(40)
      .regex(/^[a-z0-9-]+$/, "Małe litery, cyfry i myślniki"),
    city: z.string().max(80).nullish(),
    contactEmail: z.string().email("Nieprawidłowy e-mail"),
    ownerName: z.string().min(2).max(120),
    ownerEmail: z.string().email("Nieprawidłowy e-mail ownera"),
    ownerPassword: z.string().min(8, "Min. 8 znaków"),
    plan: z.enum(["TRIAL", "STARTER", "PRO", "ENTERPRISE"]),
    seedDefaults: z.boolean(),
  });

export async function createTenant(data: unknown): Promise<ActionResult<{ id: string; slug: string }>> {
  await requireAdminSession();
  const parsed = createSchema.safeParse(data);
  if (!parsed.success) {
    return actionError(
      "Sprawdź pola formularza",
      Object.fromEntries(
        parsed.error.issues.map((i) => [i.path.join("."), i.message]),
      ),
    );
  }
  const d = parsed.data;

  const slugTaken = await prisma.tenant.findUnique({
    where: { slug: d.slug },
    select: { id: true },
  });
  if (slugTaken) return actionError(`Slug „${d.slug}" jest już zajęty`);

  const emailTaken = await prisma.tenantUser.findUnique({
    where: { email: d.ownerEmail },
    select: { id: true },
  });
  if (emailTaken) return actionError(`E-mail „${d.ownerEmail}" już istnieje`);

  const passwordHash = await bcrypt.hash(d.ownerPassword, 10);

  const tenant = await prisma.tenant.create({
    data: {
      name: d.name,
      slug: d.slug,
      city: d.city ?? null,
      email: d.contactEmail,
      status: d.plan === "TRIAL" ? "TRIAL" : "ACTIVE",
      subscription: {
        create: {
          plan: d.plan,
          status: d.plan === "TRIAL" ? "TRIAL" : "ACTIVE",
          monthlyPrice:
            d.plan === "TRIAL"
              ? 0
              : d.plan === "STARTER"
                ? 199
                : d.plan === "PRO"
                  ? 499
                  : 1499,
          trialEndsAt:
            d.plan === "TRIAL"
              ? new Date(Date.now() + 14 * 86400_000)
              : null,
        },
      },
      users: {
        create: {
          email: d.ownerEmail,
          name: d.ownerName,
          password: passwordHash,
          role: "OWNER",
          status: "ACTIVE",
        },
      },
      notifications: {
        create: {
          emailNewLead: true,
          emailNewVisit: true,
          recipientEmails: [d.ownerEmail],
        },
      },
    },
  });

  if (d.seedDefaults) {
    // 3 pokoje, 5 progów Barthela, 9 modyfikatorów, 6 usług, 4 rabaty
    await prisma.roomType.createMany({
      data: [
        { tenantId: tenant.id, capacity: "SINGLE", label: "Pokój 1-osobowy", basePrice: 5500, available: 0, sortOrder: 1 },
        { tenantId: tenant.id, capacity: "DOUBLE", label: "Pokój 2-osobowy", basePrice: 4500, available: 0, sortOrder: 2 },
        { tenantId: tenant.id, capacity: "TRIPLE", label: "Pokój 3-osobowy", basePrice: 3800, available: 0, sortOrder: 3 },
      ],
    });
    await prisma.careTier.createMany({
      data: [
        { tenantId: tenant.id, label: "Pełna niesamodzielność", minBarthel: 0, maxBarthel: 20, monthlySurcharge: 2400, sortOrder: 1 },
        { tenantId: tenant.id, label: "Znaczna niesamodzielność", minBarthel: 21, maxBarthel: 40, monthlySurcharge: 1800, sortOrder: 2 },
        { tenantId: tenant.id, label: "Umiarkowana niesamodzielność", minBarthel: 41, maxBarthel: 60, monthlySurcharge: 1200, sortOrder: 3 },
        { tenantId: tenant.id, label: "Niewielka niesamodzielność", minBarthel: 61, maxBarthel: 85, monthlySurcharge: 600, sortOrder: 4 },
        { tenantId: tenant.id, label: "Samodzielność", minBarthel: 86, maxBarthel: 100, monthlySurcharge: 0, sortOrder: 5 },
      ],
    });
    await prisma.medicalModifier.createMany({
      data: DEFAULT_MEDICAL_MODIFIERS.map((m, idx) => ({
        tenantId: tenant.id,
        code: m.code,
        label: m.label,
        kind: m.kind,
        description: m.description,
        monthlySurcharge: m.defaultMonthlySurcharge,
        isToggle: m.isToggle,
        sortOrder: idx + 1,
      })),
    });
    await prisma.addonService.createMany({
      data: [
        { tenantId: tenant.id, code: "PHYSIO_VISIT", label: "Fizjoterapia indywidualna", unit: "PER_VISIT", unitPrice: 120, defaultMonthly: 8, sortOrder: 1 },
        { tenantId: tenant.id, code: "PSYCHO_VISIT", label: "Konsultacja psychologiczna", unit: "PER_VISIT", unitPrice: 180, defaultMonthly: 2, sortOrder: 2 },
        { tenantId: tenant.id, code: "PRIVATE_NURSE_HOUR", label: "Opiekun prywatny (godzina)", unit: "PER_HOUR", unitPrice: 65, defaultMonthly: 30, sortOrder: 3 },
        { tenantId: tenant.id, code: "SPECIAL_DIET", label: "Dieta specjalistyczna", unit: "PER_MONTH", unitPrice: 350, sortOrder: 4 },
        { tenantId: tenant.id, code: "LAUNDRY", label: "Pranie ubrań i pościeli", unit: "PER_MONTH", unitPrice: 180, sortOrder: 5 },
        { tenantId: tenant.id, code: "TRANSPORT_VISIT", label: "Transport medyczny", unit: "PER_VISIT", unitPrice: 90, defaultMonthly: 1, sortOrder: 6 },
      ],
    });
    await prisma.contractDiscount.createMany({
      data: [
        { tenantId: tenant.id, label: "Umowa na 12 mies.", minMonths: 12, discountPct: 0.03, sortOrder: 1 },
        { tenantId: tenant.id, label: "Umowa na 18 mies.", minMonths: 18, discountPct: 0.05, sortOrder: 2 },
        { tenantId: tenant.id, label: "Umowa na 24 mies.", minMonths: 24, discountPct: 0.08, sortOrder: 3 },
        { tenantId: tenant.id, label: "Umowa > 24 mies.", minMonths: 25, discountPct: 0.10, sortOrder: 4 },
      ],
    });
  }

  revalidatePath("/admin/tenanci");
  revalidatePath("/admin");
  return actionOk({ id: tenant.id, slug: tenant.slug });
}

export async function setTenantStatus(
  id: string,
  status: "TRIAL" | "ACTIVE" | "SUSPENDED" | "CANCELLED",
): Promise<ActionResult> {
  await requireAdminSession();
  const existing = await prisma.tenant.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!existing) return actionError("Tenant nie istnieje");
  await prisma.tenant.update({ where: { id }, data: { status } });
  revalidatePath("/admin/tenanci");
  revalidatePath(`/admin/tenanci/${id}`);
  revalidatePath("/admin");
  return actionOk();
}

const updateBasicSchema = z.object({
  name: z.string().min(2).max(120),
  city: z.string().max(80).nullish(),
  email: z.string().email().nullish().or(z.literal("")),
  phone: z.string().max(40).nullish(),
});

export async function updateTenantBasic(
  id: string,
  data: unknown,
): Promise<ActionResult> {
  await requireAdminSession();
  const parsed = updateBasicSchema.safeParse(data);
  if (!parsed.success) {
    return actionError("Sprawdź pola formularza");
  }
  const existing = await prisma.tenant.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!existing) return actionError("Tenant nie istnieje");
  await prisma.tenant.update({
    where: { id },
    data: {
      name: parsed.data.name,
      city: parsed.data.city ?? null,
      email: parsed.data.email || null,
      phone: parsed.data.phone ?? null,
    },
  });
  revalidatePath(`/admin/tenanci/${id}`);
  revalidatePath("/admin/tenanci");
  return actionOk();
}

const subscriptionSchema = z.object({
  plan: z.enum(["TRIAL", "STARTER", "PRO", "ENTERPRISE"]),
  status: z.enum(["TRIAL", "ACTIVE", "PAST_DUE", "CANCELLED"]),
  monthlyPrice: z.number().min(0).max(100_000),
  trialEndsAt: z.string().nullish(),
});

export async function updateSubscription(
  tenantId: string,
  data: unknown,
): Promise<ActionResult> {
  await requireAdminSession();
  const parsed = subscriptionSchema.safeParse(data);
  if (!parsed.success) {
    return actionError("Sprawdź pola formularza");
  }
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { id: true, subscription: { select: { id: true } } },
  });
  if (!tenant) return actionError("Tenant nie istnieje");
  const sub = tenant.subscription;
  const trialEndsAt =
    parsed.data.trialEndsAt && parsed.data.trialEndsAt.length > 0
      ? new Date(parsed.data.trialEndsAt)
      : null;

  if (sub) {
    await prisma.subscription.update({
      where: { id: sub.id },
      data: {
        plan: parsed.data.plan,
        status: parsed.data.status,
        monthlyPrice: parsed.data.monthlyPrice,
        trialEndsAt,
      },
    });
  } else {
    await prisma.subscription.create({
      data: {
        tenantId,
        plan: parsed.data.plan,
        status: parsed.data.status,
        monthlyPrice: parsed.data.monthlyPrice,
        trialEndsAt,
      },
    });
  }
  revalidatePath(`/admin/tenanci/${tenantId}`);
  revalidatePath("/admin/abonamenty");
  revalidatePath("/admin");
  return actionOk();
}

export async function toggleTenantUser(
  userId: string,
  tenantId: string,
): Promise<ActionResult> {
  await requireAdminSession();
  const user = await prisma.tenantUser.findFirst({
    where: { id: userId, tenantId },
    select: { id: true, status: true },
  });
  if (!user) return actionError("User nie istnieje");
  await prisma.tenantUser.update({
    where: { id: userId },
    data: { status: user.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE" },
  });
  revalidatePath(`/admin/tenanci/${tenantId}`);
  return actionOk();
}
