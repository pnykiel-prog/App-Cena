import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { formatPLN } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  CareLevelChart,
  FunnelChart,
  type CareDatum,
  type FunnelDatum,
} from "./dashboard-charts";

export const metadata = { title: "Dashboard" };

// Ankietę uznajemy za "z kontaktem", jeśli zostawiono e-mail, telefon lub imię.
const HAS_CONTACT = {
  OR: [
    { contactEmail: { not: null } },
    { contactPhone: { not: null } },
    { contactName: { not: null } },
  ],
};

export default async function DashboardPage() {
  const session = await auth();
  const tenantId = session!.user.tenantId!;

  const [
    quotesCount,
    visitsCount,
    last7Quotes,
    recentQuotes,
    withVisit,
    withContactTotal,
    careTierGroups,
  ] = await Promise.all([
    prisma.quote.count({ where: { tenantId } }),
    prisma.visitBooking.count({ where: { tenantId } }),
    prisma.quote.count({
      where: {
        tenantId,
        createdAt: { gte: new Date(Date.now() - 7 * 86400_000) },
      },
    }),
    prisma.quote.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        createdAt: true,
        barthelScore: true,
        estimateMin: true,
        estimateMax: true,
        contractMonths: true,
      },
    }),
    // Ankiety, które zakończyły się umówieniem konsultacji (mają rezerwację wizyty)
    prisma.quote.count({ where: { tenantId, visit: { isNot: null } } }),
    // Ankiety, w których zostawiono kontakt (zawiera też te z umówioną wizytą)
    prisma.quote.count({ where: { tenantId, ...HAS_CONTACT } }),
    // Rozkład wg progu opieki (Barthel → CareTier)
    prisma.quote.groupBy({
      by: ["careTierLabel"],
      where: { tenantId },
      _count: { _all: true },
    }),
  ]);

  // Trzy rozłączne grupy lejka (wizyta ⊆ kontakt ⊆ wszystkie)
  const bookedVisit = withVisit;
  const leftContactOnly = Math.max(0, withContactTotal - withVisit);
  const noContact = Math.max(0, quotesCount - withContactTotal);

  const funnelData: FunnelDatum[] = [
    { name: "Wypełnił, bez kontaktu", value: noContact, fill: "#94a3b8" },
    { name: "Wypełnił, zostawił kontakt", value: leftContactOnly, fill: "#1e3a5f" },
    { name: "Wypełnił i umówił konsultację", value: bookedVisit, fill: "#C9A84C" },
  ];

  const careData: CareDatum[] = careTierGroups
    .map((g) => ({
      name: g.careTierLabel ?? "Brak progu",
      value: g._count._all,
    }))
    .sort((a, b) => b.value - a.value);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--primary)]">
          Witaj{session?.user?.name ? `, ${session.user.name.split(" ")[0]}` : ""} 👋
        </h1>
        <p className="text-sm text-[var(--muted-foreground)] mt-1">
          Tu zobaczysz, ile leadów wygenerował widget i jak wygląda konwersja.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KPI title="Leady (łącznie)" value={quotesCount.toString()} />
        <KPI title="Leady (ostatnie 7 dni)" value={last7Quotes.toString()} />
        <KPI title="Umówione wizyty" value={visitsCount.toString()} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Lejek wypełnionych ankiet</CardTitle>
            <CardDescription>
              Podział na etap zaangażowania: bez kontaktu, z kontaktem oraz z
              umówioną konsultacją.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {quotesCount === 0 ? (
              <EmptyChart />
            ) : (
              <FunnelChart data={funnelData} />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Poziom opieki w ankietach</CardTitle>
            <CardDescription>
              Rozkład wypełnionych ankiet wg progu opieki (skala Barthela).
            </CardDescription>
          </CardHeader>
          <CardContent>
            {careData.length === 0 ? (
              <EmptyChart />
            ) : (
              <CareLevelChart data={careData} />
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Ostatnie wyceny</CardTitle>
          <CardDescription>5 najnowszych anonimowych leadów</CardDescription>
        </CardHeader>
        <CardContent>
          {recentQuotes.length === 0 ? (
            <div className="rounded-lg border border-dashed border-[var(--border)] p-8 text-center text-sm text-[var(--muted-foreground)]">
              Brak leadów. Osadź widget na swojej stronie, żeby zacząć zbierać wyceny.
            </div>
          ) : (
            <ul className="divide-y divide-[var(--border)]">
              {recentQuotes.map((q) => (
                <li key={q.id} className="flex items-center justify-between py-3">
                  <div>
                    <div className="text-sm font-medium">
                      Barthel {q.barthelScore} / 100
                    </div>
                    <div className="text-xs text-[var(--muted-foreground)]">
                      {new Date(q.createdAt).toLocaleString("pl-PL")} ·{" "}
                      {q.contractMonths} mies.
                    </div>
                  </div>
                  <Badge variant="muted">
                    {formatPLN(q.estimateMin)} – {formatPLN(q.estimateMax)}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function EmptyChart() {
  return (
    <div className="flex h-64 items-center justify-center rounded-lg border border-dashed border-[var(--border)] text-center text-sm text-[var(--muted-foreground)]">
      Brak danych — pojawią się, gdy widget zacznie zbierać ankiety.
    </div>
  );
}

function KPI({ title, value }: { title: string; value: string }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <p className="text-xs uppercase tracking-wider text-[var(--muted-foreground)]">
          {title}
        </p>
        <p className="mt-2 text-3xl font-semibold text-[var(--primary)]">{value}</p>
      </CardContent>
    </Card>
  );
}
