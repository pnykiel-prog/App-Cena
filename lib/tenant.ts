import { prisma } from "@/lib/prisma";
import { cache } from "react";

export type PublicTenant = Awaited<ReturnType<typeof getPublicTenantBySlug>>;

export const getPublicTenantBySlug = cache(async (slug: string) => {
  const tenant = await prisma.tenant.findUnique({
    where: { slug },
    select: {
      id: true,
      slug: true,
      name: true,
      logoUrl: true,
      brandColor: true,
      accentColor: true,
      city: true,
      currency: true,
      locale: true,
      showRangeWidth: true,
      requirePhoneOnLead: true,
      hideBranding: true,
      priceDisplay: true,
      status: true,
    },
  });
  if (!tenant || tenant.status === "SUSPENDED" || tenant.status === "CANCELLED") {
    return null;
  }
  return tenant;
});

// Rozwiązuje slug widgetu: najpierw jako tenant, potem jako lokalizacja (budynek).
// Zwraca tenanta + opcjonalną lokalizację. Dzięki temu /w/{slug} działa zarówno
// dla placówki jednolokalizacyjnej, jak i dla konkretnego budynku.
export const resolveWidgetSlug = cache(async (slug: string) => {
  const tenant = await getPublicTenantBySlug(slug);
  if (tenant) {
    return { tenant, locationId: null as string | null, locationName: null as string | null };
  }
  // Spróbuj jako slug lokalizacji
  const location = await prisma.location.findUnique({
    where: { slug },
    select: { id: true, name: true, city: true, isActive: true, tenantId: true },
  });
  if (!location || !location.isActive) return null;
  const parent = await prisma.tenant.findUnique({
    where: { id: location.tenantId },
    select: {
      id: true,
      slug: true,
      name: true,
      logoUrl: true,
      brandColor: true,
      accentColor: true,
      city: true,
      currency: true,
      locale: true,
      showRangeWidth: true,
      requirePhoneOnLead: true,
      hideBranding: true,
      priceDisplay: true,
      status: true,
    },
  });
  if (!parent || parent.status === "SUSPENDED" || parent.status === "CANCELLED") {
    return null;
  }
  // Nadpisujemy miasto/nazwę kontekstem lokalizacji (slug zostaje tenanta do API).
  return {
    tenant: { ...parent, city: location.city ?? parent.city, name: `${parent.name} — ${location.name}` },
    locationId: location.id,
    locationName: location.name,
  };
});

// Katalog cennika. Pokoje są zależne od lokalizacji: locationId=null → pokoje
// trybu jednolokalizacyjnego; konkretne locationId → pokoje tego budynku.
// Pozostały katalog (progi, modyfikatory, usługi, rabaty) jest wspólny dla tenanta.
export const getTenantCatalog = cache(async (tenantId: string, locationId: string | null = null) => {
  const [roomTypes, careTiers, modifiers, addons, discounts] = await Promise.all([
    prisma.roomType.findMany({
      where: { tenantId, isActive: true, locationId },
      orderBy: { sortOrder: "asc" },
    }),
    prisma.careTier.findMany({
      where: { tenantId, isActive: true },
      orderBy: { sortOrder: "asc" },
    }),
    prisma.medicalModifier.findMany({
      where: { tenantId, isActive: true },
      orderBy: { sortOrder: "asc" },
    }),
    prisma.addonService.findMany({
      where: { tenantId, isActive: true },
      orderBy: { sortOrder: "asc" },
    }),
    prisma.contractDiscount.findMany({
      where: { tenantId, isActive: true },
      orderBy: { minMonths: "asc" },
    }),
  ]);
  return { roomTypes, careTiers, modifiers, addons, discounts };
});

export function brandingCss(t: {
  brandColor: string;
  accentColor: string;
}): Record<string, string> {
  return {
    "--brand": t.brandColor,
    "--brand-accent": t.accentColor,
  };
}
