import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getPublicTenantBySlug, getTenantCatalog } from "@/lib/tenant";
import { computePricing, type PricingInput } from "@/lib/pricing";
import { scoreBarthel, BARTHEL_ITEMS, type BarthelAnswers } from "@/lib/barthel";
import { rateLimit, clientIdentifier } from "@/lib/rate-limit";
import { isWithinLimit, canFeature } from "@/lib/plan-limits";
import { fireLeadWebhooks } from "@/lib/webhook";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const ALLOWED_BARTHEL_CODES = new Set(BARTHEL_ITEMS.map((i) => i.code));

const payloadSchema = z.object({
  barthelAnswers: z.record(z.string(), z.number().int().min(0).max(15)),
  modifiers: z.record(z.string(), z.union([z.boolean(), z.number()])),
  roomTypeId: z.string().min(1, "Wybierz typ pokoju"),
  addons: z
    .array(
      z.object({
        code: z.string().min(1),
        monthlyCountEstimate: z.number().min(0).max(744), // hours in month max
      }),
    )
    .default([]),
  contractMonths: z.number().int().min(1).max(120).default(12),
  // Kontakt — opcjonalny w pierwszym wywołaniu (wycena anonimowa).
  contact: z
    .object({
      name: z.string().min(2).max(100).optional(),
      phone: z.string().min(6).max(40).optional(),
      email: z.string().email().optional(),
      seniorFirstName: z.string().max(60).optional(),
      seniorAge: z.number().int().min(40).max(120).optional(),
      consentRodo: z.boolean(),
      consentMarketing: z.boolean().optional(),
    })
    .optional(),
});

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;

  const rl = rateLimit(`${clientIdentifier(req)}:${slug}`, {
    resource: "widget-quote",
    limit: 10,
    windowSec: 60,
  });
  if (!rl.allowed) {
    return NextResponse.json(
      {
        success: false,
        error: "Zbyt wiele wycen w krótkim czasie. Spróbuj ponownie za chwilę.",
      },
      {
        status: 429,
        headers: {
          ...CORS_HEADERS,
          "Retry-After": String(Math.ceil((rl.resetAt - Date.now()) / 1000)),
        },
      },
    );
  }

  const tenant = await getPublicTenantBySlug(slug);
  if (!tenant) {
    return NextResponse.json(
      { success: false, error: "Tenant not found" },
      { status: 404, headers: CORS_HEADERS },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Nieprawidłowy JSON" },
      { status: 400, headers: CORS_HEADERS },
    );
  }

  const parsed = payloadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: "Nieprawidłowe dane", details: parsed.error.flatten() },
      { status: 400, headers: CORS_HEADERS },
    );
  }
  const input = parsed.data;

  // Filtruj barthelAnswers tylko do dozwolonych kodów
  const safeAnswers: BarthelAnswers = {};
  for (const [k, v] of Object.entries(input.barthelAnswers)) {
    if (ALLOWED_BARTHEL_CODES.has(k as never)) {
      (safeAnswers as Record<string, number>)[k] = v;
    }
  }
  const barthelScore = scoreBarthel(safeAnswers);

  const catalog = await getTenantCatalog(tenant.id);

  const pricingInput: PricingInput = {
    roomTypeId: input.roomTypeId,
    barthelScore,
    modifiers: input.modifiers,
    addons: input.addons,
    contractMonths: input.contractMonths,
  };

  let result;
  try {
    result = computePricing(pricingInput, {
      tenant: {
        id: tenant.id,
        currency: tenant.currency,
        showRangeWidth: tenant.showRangeWidth,
      },
      roomTypes: catalog.roomTypes,
      careTiers: catalog.careTiers,
      modifiers: catalog.modifiers,
      addons: catalog.addons,
      discounts: catalog.discounts,
    });
  } catch (e) {
    return NextResponse.json(
      { success: false, error: e instanceof Error ? e.message : "Błąd wyceny" },
      { status: 400, headers: CORS_HEADERS },
    );
  }

  const referrer = req.headers.get("referer") ?? null;
  const userAgent = req.headers.get("user-agent") ?? null;

  // Zapisz Quote — anonimowo (dane kontaktowe tylko jeśli zgody RODO udzielono).
  const contact = input.contact && input.contact.consentRodo ? input.contact : null;

  // Miękki limit wycen: liczymy bieżące wykorzystanie względem limitu planu.
  // Po przekroczeniu wycena NADAL jest zapisywana (chronimy konwersję), tylko
  // oznaczamy flagą overLimit i podbijamy licznik okresu na subskrypcji.
  const subscription = await prisma.subscription.findUnique({
    where: { tenantId: tenant.id },
    select: { id: true, plan: true, limitOverrides: true, quotesThisPeriod: true },
  });
  const overLimit = !isWithinLimit(
    subscription,
    "monthlyQuoteLimit",
    subscription?.quotesThisPeriod ?? 0,
  );

  const quote = await prisma.quote.create({
    data: {
      tenantId: tenant.id,
      barthelScore,
      barthelAnswers: safeAnswers,
      medModifiers: input.modifiers,
      roomTypeId: input.roomTypeId,
      addons: input.addons,
      contractMonths: input.contractMonths,
      basePrice: result.basePrice,
      careTierLabel: result.careTier?.label ?? null,
      careSurcharge: result.careSurcharge,
      modifiersTotal: result.modifiersTotal,
      addonsTotal: result.addonsTotal,
      discountPct: result.discountPct,
      estimateMin: result.estimateMin,
      estimateMid: result.estimateMid,
      estimateMax: result.estimateMax,
      currency: result.currency,
      status: contact ? "NEW" : "DRAFT",
      overLimit,
      contactName: contact?.name ?? null,
      contactPhone: contact?.phone ?? null,
      contactEmail: contact?.email ?? null,
      consentRodo: contact?.consentRodo ?? false,
      consentMarketing: contact?.consentMarketing ?? false,
      seniorFirstName: contact?.seniorFirstName ?? null,
      seniorAge: contact?.seniorAge ?? null,
      referrer,
      userAgent: userAgent?.slice(0, 500),
    },
    select: {
      id: true,
      shareToken: true,
      estimateMin: true,
      estimateMid: true,
      estimateMax: true,
      currency: true,
    },
  });

  // Podbij licznik wycen w okresie (jeśli subskrypcja istnieje).
  if (subscription) {
    await prisma.subscription.update({
      where: { id: subscription.id },
      data: { quotesThisPeriod: { increment: 1 } },
    });
  }

  // Webhook po leadzie (Enterprise). Bez PII mieszkańca w payloadzie.
  if (canFeature(subscription, "webhookOnLead")) {
    await fireLeadWebhooks(tenant.id, {
      event: "lead.created",
      quoteId: quote.id,
      shareToken: quote.shareToken,
      tenantSlug: tenant.slug,
      barthelScore,
      estimateMin: quote.estimateMin,
      estimateMid: quote.estimateMid,
      estimateMax: quote.estimateMax,
      currency: quote.currency,
      hasContact: Boolean(contact),
      overLimit,
      createdAt: new Date().toISOString(),
    });
  }

  return NextResponse.json(
    {
      success: true,
      data: {
        quoteId: quote.id,
        shareToken: quote.shareToken,
        barthelScore,
        estimateMin: quote.estimateMin,
        estimateMid: quote.estimateMid,
        estimateMax: quote.estimateMax,
        currency: quote.currency,
        breakdown: {
          basePrice: result.basePrice,
          careTier: result.careTier
            ? {
                label: result.careTier.label,
                surcharge: result.careSurcharge,
              }
            : null,
          modifiers: result.modifiersBreakdown,
          addons: result.addonsBreakdown,
          discountPct: result.discountPct,
          discountAmount: result.discountAmount,
        },
      },
    },
    { headers: CORS_HEADERS },
  );
}
