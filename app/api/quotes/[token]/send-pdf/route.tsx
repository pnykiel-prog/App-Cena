import { NextResponse } from "next/server";
import { z } from "zod";
import { renderToBuffer } from "@react-pdf/renderer";
import { prisma } from "@/lib/prisma";
import { QuotePDF, type QuotePdfData } from "@/lib/pdf-quote";
import { sendQuotePdfToCustomer } from "@/lib/email";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const schema = z.object({
  email: z.string().email("Wpisz prawidłowy e-mail"),
});

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Nieprawidłowy JSON" },
      { status: 400, headers: CORS_HEADERS },
    );
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0]?.message ?? "Sprawdź pole e-mail" },
      { status: 400, headers: CORS_HEADERS },
    );
  }

  const quote = await prisma.quote.findUnique({
    where: { shareToken: token },
    include: { tenant: true, roomType: true },
  });
  if (!quote) {
    return NextResponse.json(
      { success: false, error: "Wycena nie istnieje" },
      { status: 404, headers: CORS_HEADERS },
    );
  }
  if (
    quote.tenant.status === "SUSPENDED" ||
    quote.tenant.status === "CANCELLED"
  ) {
    return NextResponse.json(
      { success: false, error: "Tenant niedostępny" },
      { status: 410, headers: CORS_HEADERS },
    );
  }

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
    process.env.NEXT_PUBLIC_APP_URL ?? new URL(req.url).origin;
  const shareUrl = `${origin}/q/${quote.shareToken}`;

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
    shareUrl,
  };

  const buffer = await renderToBuffer(<QuotePDF data={data} />);

  const result = await sendQuotePdfToCustomer({
    tenant: { name: quote.tenant.name },
    to: parsed.data.email,
    pdf: buffer as Buffer,
    shareUrl,
  });

  await prisma.quote.update({
    where: { id: quote.id },
    data: {
      pdfSentAt: result.delivered || result.skipped ? new Date() : null,
      contactEmail: quote.contactEmail ?? parsed.data.email,
    },
  });

  return NextResponse.json(
    {
      success: true,
      data: {
        delivered: result.delivered,
        skipped: result.skipped,
      },
    },
    { headers: CORS_HEADERS },
  );
}
