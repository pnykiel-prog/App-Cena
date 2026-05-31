import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateApiKey } from "@/lib/api-auth";
import { requireFeature, planErrorResponse } from "@/lib/plan-guard";
import { serializeLead } from "../route";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

// GET /api/v1/leads/{id}  — pojedynczy lead należący do tenanta klucza API.
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

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

  const quote = await prisma.quote.findFirst({
    where: { id, tenantId: auth.tenantId }, // izolacja tenanta
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
  });

  if (!quote) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404, headers: CORS_HEADERS });
  }

  return NextResponse.json({ data: serializeLead(quote) }, { headers: CORS_HEADERS });
}
