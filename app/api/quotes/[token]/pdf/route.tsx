import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { prisma } from "@/lib/prisma";
import { QuotePDF, type QuotePdfData } from "@/lib/pdf-quote";

export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;

  const quote = await prisma.quote.findUnique({
    where: { shareToken: token },
    include: {
      tenant: true,
      roomType: true,
    },
  });
  if (!quote) {
    return new NextResponse("Wycena nie istnieje", { status: 404 });
  }

  // Pobierz modyfikatory i addons z catalog tenanta dla nazw human-readable
  const [modCatalog, addonCatalog] = await Promise.all([
    prisma.medicalModifier.findMany({
      where: { tenantId: quote.tenantId },
      select: { code: true, label: true, monthlySurcharge: true, isToggle: true },
    }),
    prisma.addonService.findMany({
      where: { tenantId: quote.tenantId },
      select: { code: true, label: true, unitPrice: true, unit: true },
    }),
  ]);

  const DAYS_PER_MONTH = 30.44;
  const modInput = (quote.medModifiers as Record<string, unknown>) ?? {};
  const modifiers: QuotePdfData["modifiers"] = [];
  for (const m of modCatalog) {
    const raw = modInput[m.code];
    if (raw === undefined || raw === null || raw === false || raw === 0) continue;
    const value = m.isToggle ? 1 : typeof raw === "number" ? raw : 1;
    const amount = m.monthlySurcharge * value;
    if (amount === 0) continue;
    modifiers.push({ label: m.label, amount });
  }

  const addonsInput =
    (quote.addons as Array<{ code: string; monthlyCountEstimate: number }>) ??
    [];
  const addons: QuotePdfData["addons"] = [];
  for (const a of addonsInput) {
    const found = addonCatalog.find((x) => x.code === a.code);
    if (!found) continue;
    let monthlyEquivalent: number;
    switch (found.unit) {
      case "PER_MONTH":
        monthlyEquivalent = found.unitPrice;
        break;
      case "PER_DAY":
        monthlyEquivalent =
          found.unitPrice *
          (a.monthlyCountEstimate > 0 ? a.monthlyCountEstimate : DAYS_PER_MONTH);
        break;
      default:
        monthlyEquivalent =
          found.unitPrice * Math.max(0, a.monthlyCountEstimate);
    }
    addons.push({ label: found.label, monthlyEquivalent });
  }

  const origin =
    process.env.NEXT_PUBLIC_APP_URL ??
    new URL(req.url).origin;

  const data: QuotePdfData = {
    tenant: {
      name: quote.tenant.name,
      city: quote.tenant.city,
      address: quote.tenant.address,
      postalCode: quote.tenant.postalCode,
      phone: quote.tenant.phone,
      email: quote.tenant.email,
      website: quote.tenant.website,
      brandColor: quote.tenant.brandColor,
      accentColor: quote.tenant.accentColor,
    },
    quote: {
      createdAt: quote.createdAt.toISOString(),
      barthelScore: quote.barthelScore,
      careTierLabel: quote.careTierLabel,
      contractMonths: quote.contractMonths,
      basePrice: quote.basePrice,
      careSurcharge: quote.careSurcharge,
      modifiersTotal: quote.modifiersTotal,
      addonsTotal: quote.addonsTotal,
      discountPct: quote.discountPct,
      estimateMin: quote.estimateMin,
      estimateMid: quote.estimateMid,
      estimateMax: quote.estimateMax,
      currency: quote.currency,
      roomLabel: quote.roomType?.label ?? null,
    },
    modifiers,
    addons,
    shareUrl: `${origin}/q/${quote.shareToken}`,
  };

  const buffer = await renderToBuffer(<QuotePDF data={data} />);
  const filename = `wycena-${quote.tenant.slug}-${quote.shareToken.slice(0, 8)}.pdf`;

  return new NextResponse(buffer as unknown as BodyInit, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${filename}"`,
      "Cache-Control": "private, max-age=0, no-store",
    },
  });
}
