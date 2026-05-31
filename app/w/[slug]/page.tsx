import { notFound } from "next/navigation";
import { resolveWidgetSlug, getTenantCatalog, brandingCss } from "@/lib/tenant";
import { BARTHEL_ITEMS } from "@/lib/barthel";
import { prisma } from "@/lib/prisma";
import { canFeature } from "@/lib/plan-limits";
import { WidgetShell } from "@/components/widget/widget-shell";
import type { WidgetConfig } from "@/components/widget/types";

export const dynamic = "force-dynamic";

export default async function WidgetPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const resolved = await resolveWidgetSlug(slug);
  if (!resolved) notFound();
  const { tenant, locationId } = resolved;

  const [catalog, subscription] = await Promise.all([
    getTenantCatalog(tenant.id, locationId),
    prisma.subscription.findUnique({
      where: { tenantId: tenant.id },
      select: { plan: true, limitOverrides: true },
    }),
  ]);
  const multiLanguage = canFeature(subscription, "multiLanguage");

  const config: WidgetConfig = {
    tenant: {
      id: tenant.id,
      // Slug używany przez widget do wywołań API = slug z URL (tenanta LUB
      // lokalizacji), aby API rozwiązało ten sam kontekst (i przypisało locationId).
      slug,
      name: tenant.name,
      city: tenant.city,
      logoUrl: tenant.logoUrl,
      brandColor: tenant.brandColor,
      accentColor: tenant.accentColor,
      currency: tenant.currency,
      locale: tenant.locale,
      showRangeWidth: tenant.showRangeWidth,
      requirePhoneOnLead: tenant.requirePhoneOnLead,
      hideBranding: tenant.hideBranding,
      multiLanguage,
    },
    barthelItems: BARTHEL_ITEMS,
    roomTypes: catalog.roomTypes.map((r) => ({
      id: r.id,
      capacity: r.capacity,
      label: r.label,
      description: r.description,
      basePrice: r.basePrice,
      available: r.available,
    })),
    careTiers: catalog.careTiers.map((t) => ({
      id: t.id,
      label: t.label,
      minBarthel: t.minBarthel,
      maxBarthel: t.maxBarthel,
      monthlySurcharge: t.monthlySurcharge,
    })),
    medicalModifiers: catalog.modifiers.map((m) => ({
      id: m.id,
      code: m.code,
      label: m.label,
      kind: m.kind,
      description: m.description,
      monthlySurcharge: m.monthlySurcharge,
      isToggle: m.isToggle,
    })),
    addons: catalog.addons.map((a) => ({
      id: a.id,
      code: a.code,
      label: a.label,
      description: a.description,
      unit: a.unit,
      unitPrice: a.unitPrice,
      defaultMonthly: a.defaultMonthly,
    })),
    discounts: catalog.discounts.map((d) => ({
      id: d.id,
      label: d.label,
      minMonths: d.minMonths,
      discountPct: d.discountPct,
    })),
  };

  return (
    <div
      className="min-h-screen bg-[var(--background)] py-6 px-4"
      style={
        {
          ...brandingCss({
            brandColor: tenant.brandColor,
            accentColor: tenant.accentColor,
          }),
          "--brand-light": tenant.brandColor + "1A", // 10% alpha
        } as React.CSSProperties
      }
    >
      <div className="mx-auto max-w-3xl">
        <WidgetShell config={config} />
      </div>
    </div>
  );
}
