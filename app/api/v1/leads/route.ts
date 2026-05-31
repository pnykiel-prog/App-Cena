import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateApiKey } from "@/lib/api-auth";
import { requireFeature, planErrorResponse } from "@/lib/plan-guard";
import { rateLimit, clientIdentifier } from "@/lib/rate-limit";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

// GET /api/v1/leads?status=NEW&limit=50&offset=0
// Auth: Authorization: Bearer cq_...  • Plan: Enterprise (restApi) → inaczej 402.
export async function GET(req: Request) {
  const rl = rateLimit(clientIdentifier(req), {
    resource: "api-v1",
    limit: 120,
    windowSec: 60,
  });
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "RATE_LIMITED" },
      { status: 429, headers: { ...CORS_HEADERS, "Retry-After": String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } },
    );
  }

  const auth = await authenticateApiKey(req);
  if (!auth.ok) {
    return NextResponse.json({ error: "UNAUTHORIZED", message: auth.error }, { status: 401, headers: CORS_HEADERS });
  }

  try {
    await requireFeature(auth.tenantId, "restApi");
  } catch (e) {
    const resp = planErrorResponse(e);
    if (resp) return resp;
    throw e;
  }

  const url = new URL(req.url);
  const status = url.searchParams.get("status");
  const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit")) || 50));
  const offset = Math.max(0, Number(url.searchParams.get("offset")) || 0);

  const where = {
    tenantId: auth.tenantId,
    ...(status ? { status: status as never } : {}),
  };

  const [total, quotes] = await Promise.all([
    prisma.quote.count({ where }),
    prisma.quote.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
      select: {
        id: true,
        shareToken: true,
        status: true,
        barthelScore: true,
        careTierLabel: true,
        estimateMin: true,
        estimateMid: true,
        estimateMax: true,
        currency: true,
        contractMonths: true,
        contactName: true,
        contactPhone: true,
        contactEmail: true,
        consentRodo: true,
        consentMarketing: true,
        createdAt: true,
        roomType: { select: { capacity: true, label: true } },
      },
    }),
  ]);

  return NextResponse.json(
    {
      data: quotes.map(serializeLead),
      pagination: { total, limit, offset },
    },
    { headers: CORS_HEADERS },
  );
}

// Współdzielona serializacja (też w /leads/[id]).
export function serializeLead(q: {
  id: string;
  shareToken: string;
  status: string;
  barthelScore: number;
  careTierLabel: string | null;
  estimateMin: number;
  estimateMid: number;
  estimateMax: number;
  currency: string;
  contractMonths: number;
  contactName: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  consentRodo: boolean;
  consentMarketing: boolean;
  createdAt: Date;
  roomType: { capacity: string; label: string } | null;
}) {
  return {
    id: q.id,
    shareToken: q.shareToken,
    status: q.status,
    barthelScore: q.barthelScore,
    careTierLabel: q.careTierLabel,
    estimate: { min: q.estimateMin, mid: q.estimateMid, max: q.estimateMax, currency: q.currency },
    contractMonths: q.contractMonths,
    contact: {
      name: q.contactName,
      phone: q.contactPhone,
      email: q.contactEmail,
      consentRodo: q.consentRodo,
      consentMarketing: q.consentMarketing,
    },
    room: q.roomType ? { capacity: q.roomType.capacity, label: q.roomType.label } : null,
    createdAt: q.createdAt.toISOString(),
  };
}
