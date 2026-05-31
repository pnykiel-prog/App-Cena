import { notFound } from "next/navigation";
import { getPublicTenantBySlug, getTenantCatalog, brandingCss } from "@/lib/tenant";
import { BARTHEL_ITEMS } from "@/lib/barthel";
import { WidgetWizard } from "@/components/widget/widget-wizard";
import type { WidgetConfig } from "@/components/widget/types";

export const dynamic = "force-dynamic";

export default async function WidgetPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const tenant = await getPublicTenantBySlug(slug);
  if (!tenant) notFound();

  const catalog = await getTenantCatalog(tenant.id);

  const config: WidgetConfig = {
    tenant: {
      id: tenant.id,
      slug: tenant.slug,
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
        <header className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            {tenant.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={tenant.logoUrl}
                alt={tenant.name}
                className="h-12 w-12 rounded-lg object-cover"
              />
            ) : (
              <div
                className="h-12 w-12 rounded-lg flex items-center justify-center text-white font-bold text-xl"
                style={{ backgroundColor: "var(--brand)" }}
              >
                {tenant.name[0]}
              </div>
            )}
            <div>
              <p
                className="font-semibold tracking-tight"
                style={{ color: "var(--brand)" }}
              >
                {tenant.name}
              </p>
              <p className="text-xs text-[var(--muted-foreground)]">
                {tenant.city ?? "Wycena pobytu"}
              </p>
            </div>
          </div>
          <span
            className="text-xs uppercase tracking-wider font-medium hidden sm:inline"
            style={{ color: "var(--brand-accent)" }}
          >
            Wycena pobytu
          </span>
        </header>

        <div className="rounded-2xl border border-[var(--border)] bg-white shadow-xl p-6 md:p-8">
          <WidgetWizard config={config} />
        </div>

        {!tenant.hideBranding && (
          <footer className="mt-6 text-center text-xs text-[var(--muted-foreground)]">
            Powered by{" "}
            <span style={{ color: "var(--brand-accent)" }} className="font-semibold">
              CareQuote
            </span>
          </footer>
        )}
      </div>
    </div>
  );
}
