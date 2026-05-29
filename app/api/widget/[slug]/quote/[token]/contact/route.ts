import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { sendNewLeadEmail } from "@/lib/email";
import { rateLimit, clientIdentifier } from "@/lib/rate-limit";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

// E-mail jest ZAWSZE wymagany (gate dostępu do wyceny).
// Telefon — schema akceptuje opcjonalny string, walidacja zależna od
// tenant.requirePhoneOnLead nakładana niżej.
const schema = z.object({
  name: z.string().min(2, "Wpisz imię i nazwisko").max(100),
  phone: z.string().max(40).optional().or(z.literal("")),
  email: z.string().email("Wpisz prawidłowy adres e-mail").max(120),
  consentRodo: z.literal(true, {
    message: "Zgoda RODO jest wymagana",
  }),
  consentMarketing: z.boolean().optional(),
});

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ slug: string; token: string }> },
) {
  const { slug, token } = await params;

  const rl = rateLimit(clientIdentifier(req), {
    resource: "widget-contact",
    limit: 5,
    windowSec: 60,
  });
  if (!rl.allowed) {
    return NextResponse.json(
      {
        success: false,
        error: "Zbyt wiele zgłoszeń. Spróbuj ponownie za chwilę.",
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

  const tenant = await prisma.tenant.findUnique({
    where: { slug },
    select: {
      id: true,
      name: true,
      status: true,
      email: true,
      requirePhoneOnLead: true,
      notifications: {
        select: { emailNewLead: true, recipientEmails: true },
      },
    },
  });
  if (!tenant || tenant.status === "SUSPENDED" || tenant.status === "CANCELLED") {
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
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        success: false,
        error:
          parsed.error.issues[0]?.message ??
          "Sprawdź pola formularza i zgodę RODO",
        details: parsed.error.flatten(),
      },
      { status: 400, headers: CORS_HEADERS },
    );
  }

  // Telefon wymagany warunkowo, w zależności od konfiguracji tenanta.
  const phoneTrim = (parsed.data.phone ?? "").trim();
  if (tenant.requirePhoneOnLead && phoneTrim.length < 6) {
    return NextResponse.json(
      {
        success: false,
        error: "Numer telefonu jest wymagany dla tej placówki",
        details: { fieldErrors: { phone: "Wpisz numer telefonu (min. 6 znaków)" } },
      },
      { status: 400, headers: CORS_HEADERS },
    );
  }

  const quote = await prisma.quote.findUnique({
    where: { shareToken: token },
    select: {
      id: true,
      tenantId: true,
      shareToken: true,
      barthelScore: true,
      estimateMin: true,
      estimateMax: true,
      estimateMid: true,
      contractMonths: true,
      roomType: { select: { label: true } },
    },
  });
  if (!quote || quote.tenantId !== tenant.id) {
    return NextResponse.json(
      { success: false, error: "Wycena nie istnieje" },
      { status: 404, headers: CORS_HEADERS },
    );
  }

  const updated = await prisma.quote.update({
    where: { id: quote.id },
    data: {
      contactName: parsed.data.name,
      contactPhone: phoneTrim || null,
      contactEmail: parsed.data.email,
      consentRodo: true,
      consentMarketing: parsed.data.consentMarketing ?? false,
      status: "NEW",
    },
    select: { id: true },
  });

  // Powiadom managera (fire-and-forget — nie blokuj odpowiedzi)
  if (tenant.notifications?.emailNewLead) {
    const origin =
      process.env.NEXT_PUBLIC_APP_URL ?? new URL(req.url).origin;
    const recipients = Array.from(
      new Set([
        ...(tenant.notifications.recipientEmails ?? []),
        ...(tenant.email ? [tenant.email] : []),
      ]),
    );
    if (recipients.length > 0) {
      sendNewLeadEmail({
        tenant: { name: tenant.name },
        recipientEmails: recipients,
        quote: {
          shareToken: quote.shareToken,
          barthelScore: quote.barthelScore,
          estimateMin: quote.estimateMin,
          estimateMax: quote.estimateMax,
          estimateMid: quote.estimateMid,
          contractMonths: quote.contractMonths,
          roomLabel: quote.roomType?.label ?? null,
        },
        contact: {
          name: parsed.data.name,
          phone: phoneTrim,
          email: parsed.data.email,
          consentMarketing: parsed.data.consentMarketing ?? false,
        },
        panelUrl: `${origin}/leady/${updated.id}`,
        publicQuoteUrl: `${origin}/q/${quote.shareToken}`,
      }).catch((e) => console.error("[lead-email]", e));
    }
  }

  return NextResponse.json(
    { success: true, data: { received: true } },
    { headers: CORS_HEADERS },
  );
}
