import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { sendVisitBookingEmails } from "@/lib/email";
import { rateLimit, clientIdentifier } from "@/lib/rate-limit";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const schema = z.object({
  name: z.string().min(2).max(100),
  phone: z.string().min(6).max(40),
  email: z.string().email().optional().or(z.literal("")),
  preferredAt: z.string().nullish(),
  notes: z.string().max(1000).optional(),
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
    resource: "widget-visit",
    limit: 3,
    windowSec: 60,
  });
  if (!rl.allowed) {
    return NextResponse.json(
      {
        success: false,
        error: "Zbyt wiele zgłoszeń wizyt. Spróbuj ponownie za chwilę.",
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
      notifications: {
        select: { emailNewVisit: true, recipientEmails: true },
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
        error: "Sprawdź pola formularza",
        details: parsed.error.flatten(),
      },
      { status: 400, headers: CORS_HEADERS },
    );
  }

  const quote = await prisma.quote.findUnique({
    where: { shareToken: token },
    select: { id: true, tenantId: true, visit: { select: { id: true } } },
  });
  if (!quote || quote.tenantId !== tenant.id) {
    return NextResponse.json(
      { success: false, error: "Wycena nie istnieje" },
      { status: 404, headers: CORS_HEADERS },
    );
  }
  if (quote.visit) {
    return NextResponse.json(
      { success: false, error: "Wizyta już została zgłoszona dla tej wyceny" },
      { status: 409, headers: CORS_HEADERS },
    );
  }

  const preferredAt =
    parsed.data.preferredAt && parsed.data.preferredAt.length > 0
      ? new Date(parsed.data.preferredAt)
      : null;

  const visit = await prisma.visitBooking.create({
    data: {
      tenantId: tenant.id,
      quoteId: quote.id,
      contactName: parsed.data.name,
      contactPhone: parsed.data.phone,
      contactEmail: parsed.data.email || null,
      preferredAt,
      notes: parsed.data.notes ?? null,
      status: "REQUESTED",
    },
    select: { id: true },
  });

  // Zapisz status leada jako VISIT_SCHEDULED + uzupełnij contact jeśli brakowało
  await prisma.quote.update({
    where: { id: quote.id },
    data: {
      status: "VISIT_SCHEDULED",
      contactName: parsed.data.name,
      contactPhone: parsed.data.phone,
      contactEmail: parsed.data.email || null,
    },
  });

  if (tenant.notifications?.emailNewVisit) {
    const origin =
      process.env.NEXT_PUBLIC_APP_URL ?? new URL(req.url).origin;
    const recipients = Array.from(
      new Set([
        ...(tenant.notifications.recipientEmails ?? []),
        ...(tenant.email ? [tenant.email] : []),
      ]),
    );
    sendVisitBookingEmails({
      tenant: { name: tenant.name },
      managerEmails: recipients,
      customer: {
        name: parsed.data.name,
        phone: parsed.data.phone,
        email: parsed.data.email || null,
      },
      preferredAt,
      notes: parsed.data.notes ?? null,
      panelUrl: `${origin}/wizyty`,
    }).catch((e) => console.error("[visit-email]", e));
  }

  return NextResponse.json(
    { success: true, data: { visitId: visit.id } },
    { headers: CORS_HEADERS },
  );
}
