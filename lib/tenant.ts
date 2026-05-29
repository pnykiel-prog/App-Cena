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
      status: true,
    },
  });
  if (!tenant || tenant.status === "SUSPENDED" || tenant.status === "CANCELLED") {
    return null;
  }
  return tenant;
});

export const getTenantCatalog = cache(async (tenantId: string) => {
  const [roomTypes, careTiers, modifiers, addons, discounts] = await Promise.all([
    prisma.roomType.findMany({
      where: { tenantId, isActive: true },
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
