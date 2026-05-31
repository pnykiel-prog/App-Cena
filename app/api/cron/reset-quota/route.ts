import { prisma } from "@/lib/prisma";

// Cron: resetuje licznik wycen w okresie (quotesThisPeriod) dla subskrypcji,
// których bieżący okres rozliczeniowy minął miesiąc temu. Po resecie przesuwa
// currentPeriodStart na teraz. Uruchamiane codziennie przez Vercel Cron.
//
// Zabezpieczenie: w środowisku Vercel cron wysyła nagłówek
// `Authorization: Bearer ${CRON_SECRET}`. Gdy CRON_SECRET jest ustawiony,
// wymagamy zgodności. (Vercel Cron sam dołącza ten nagłówek z env projektu.)

export const dynamic = "force-dynamic";

function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true; // brak sekretu → nie blokuj (np. środowisko dev)
  return req.headers.get("authorization") === `Bearer ${secret}`;
}

async function handle(req: Request) {
  if (!authorized(req)) {
    return new Response("Unauthorized", { status: 401 });
  }

  // Próg: okres dłuższy niż ~1 miesiąc temu (30 dni).
  const cutoff = new Date(Date.now() - 30 * 86400_000);

  const result = await prisma.subscription.updateMany({
    where: { currentPeriodStart: { lte: cutoff } },
    data: { quotesThisPeriod: 0, currentPeriodStart: new Date() },
  });

  return Response.json({
    ok: true,
    reset: result.count,
    at: new Date().toISOString(),
  });
}

export async function GET(req: Request) {
  return handle(req);
}

export async function POST(req: Request) {
  return handle(req);
}
