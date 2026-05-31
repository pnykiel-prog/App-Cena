import { NextResponse } from "next/server";
import { resolveWidgetSlug, getTenantCatalog } from "@/lib/tenant";
import { BARTHEL_ITEMS } from "@/lib/barthel";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const resolved = await resolveWidgetSlug(slug);
  if (!resolved) {
    return NextResponse.json(
      { success: false, error: "Tenant not found" },
      { status: 404, headers: CORS_HEADERS },
    );
  }
  const { tenant, locationId } = resolved;
  const catalog = await getTenantCatalog(tenant.id, locationId);

  return NextResponse.json(
    {
      success: true,
      data: {
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
      },
    },
    { headers: CORS_HEADERS },
  );
}
