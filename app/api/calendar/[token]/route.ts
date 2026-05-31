import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildIcsFeed } from "@/lib/ical";

export const dynamic = "force-dynamic";

// Publiczny feed iCal chroniony losowym tokenem w URL. Subskrybowany przez
// Google/Outlook/Apple Calendar. Zwraca text/calendar z wizytami tenanta.
export async function GET(
  req: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;

  const integration = await prisma.calendarIntegration.findUnique({
    where: { feedToken: token },
    select: { tenantId: true, isActive: true },
  });
  if (!integration || !integration.isActive) {
    return new NextResponse("Not found", { status: 404 });
  }

  const [tenant, visits] = await Promise.all([
    prisma.tenant.findUnique({
      where: { id: integration.tenantId },
      select: { name: true },
    }),
    prisma.visitBooking.findMany({
      where: { tenantId: integration.tenantId },
      orderBy: { preferredAt: "asc" },
      take: 500,
      select: {
        id: true,
        contactName: true,
        contactPhone: true,
        contactEmail: true,
        kind: true,
        preferredDay: true,
        preferredTime: true,
        preferredAt: true,
        notes: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
  ]);

  const appHost = (() => {
    try {
      return new URL(process.env.NEXT_PUBLIC_APP_URL ?? req.url).host;
    } catch {
      return "carequote";
    }
  })();

  const ics = buildIcsFeed(tenant?.name ?? "CareQuote", appHost, visits);

  // Zaktualizuj znacznik ostatniej synchronizacji (best-effort).
  prisma.calendarIntegration
    .update({ where: { feedToken: token }, data: { lastSyncAt: new Date() } })
    .catch(() => {});

  return new NextResponse(ics, {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'inline; filename="wizyty.ics"',
      "Cache-Control": "private, max-age=300",
    },
  });
}
