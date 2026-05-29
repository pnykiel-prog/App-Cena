import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { formatPLN } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const session = await auth();
  const tenantId = session!.user.tenantId!;

  const [quotesCount, visitsCount, last7Quotes, recentQuotes] = await Promise.all([
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
  ]);

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
