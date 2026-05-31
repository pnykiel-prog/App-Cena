import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { formatPLN, formatRange } from "@/lib/utils";
import { barthelInterpretation } from "@/lib/barthel";
import { brandingCss } from "@/lib/tenant";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function SharedQuotePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const quote = await prisma.quote.findUnique({
    where: { shareToken: id },
    include: {
      tenant: {
        select: {
          name: true,
          slug: true,
          city: true,
          logoUrl: true,
          brandColor: true,
          accentColor: true,
          phone: true,
          email: true,
          hideBranding: true,
        },
      },
      roomType: true,
    },
  });

  if (!quote) notFound();

  const interp = barthelInterpretation(quote.barthelScore);
  const modifiers = (quote.medModifiers as Record<string, unknown>) ?? {};
  const addons = (quote.addons as Array<{ code: string; monthlyCountEstimate: number }>) ?? [];

  return (
    <div
      className="min-h-screen bg-[var(--background)] py-8 px-4"
      style={
        {
          ...brandingCss({
            brandColor: quote.tenant.brandColor,
            accentColor: quote.tenant.accentColor,
          }),
        } as React.CSSProperties
      }
    >
      <div className="mx-auto max-w-2xl space-y-6">
        <header className="text-center">
          {quote.tenant.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={quote.tenant.logoUrl}
              alt={quote.tenant.name}
              className="mx-auto h-16 w-16 rounded-xl object-cover"
            />
          ) : (
            <div
              className="mx-auto h-16 w-16 rounded-xl flex items-center justify-center text-white font-bold text-2xl"
              style={{ backgroundColor: "var(--brand)" }}
            >
              {quote.tenant.name[0]}
            </div>
          )}
          <h1
            className="mt-4 text-2xl font-semibold tracking-tight"
            style={{ color: "var(--brand)" }}
          >
            {quote.tenant.name}
          </h1>
          <p className="text-sm text-[var(--muted-foreground)]">
            Wycena z {new Date(quote.createdAt).toLocaleDateString("pl-PL", {
              dateStyle: "long",
            } as Intl.DateTimeFormatOptions)}
          </p>
        </header>

        <Card
          className="border-0 text-white"
          style={{ background: `var(--brand)` }}
        >
          <CardContent className="pt-6 text-center">
            <p className="text-xs uppercase tracking-wider opacity-80">
              Szacunkowy koszt miesięczny
            </p>
            <p className="mt-3 text-4xl font-bold tracking-tight">
              {formatRange(quote.estimateMin, quote.estimateMax)}
            </p>
            <p className="mt-2 text-sm opacity-80">
              {quote.currency} / miesiąc · pobyt {quote.contractMonths} mies.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6 space-y-3">
            <p className="text-sm font-semibold" style={{ color: "var(--brand)" }}>
              Szczegóły wyceny
            </p>
            <Row label="Pokój" value={quote.roomType?.label ?? "—"} />
            <Row label="Cena bazowa pokoju" value={formatPLN(quote.basePrice)} />
            {quote.careTierLabel ? (
              <Row
                label={`Opieka (Barthel ${quote.barthelScore}/100 — ${interp.label})`}
                value={formatPLN(quote.careSurcharge)}
              />
            ) : null}
            <Row
              label="Modyfikatory medyczne"
              value={formatPLN(quote.modifiersTotal)}
            />
            <Row label="Usługi dodatkowe" value={formatPLN(quote.addonsTotal)} />
            {quote.discountPct > 0 ? (
              <Row
                label={`Rabat ${(quote.discountPct * 100).toFixed(0)}%`}
                value={`−${(quote.discountPct * 100).toFixed(0)}%`}
                accent
              />
            ) : null}
            <div className="pt-3 border-t border-[var(--border)] flex justify-between text-sm font-semibold">
              <span>Środek widełek</span>
              <span>{formatPLN(quote.estimateMid)} / mies.</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6 space-y-2 text-sm">
            <p className="font-semibold" style={{ color: "var(--brand)" }}>
              Kontakt z placówką
            </p>
            <p>{quote.tenant.name}</p>
            {quote.tenant.city ? <p>{quote.tenant.city}</p> : null}
            {quote.tenant.phone ? <p>Tel: {quote.tenant.phone}</p> : null}
            {quote.tenant.email ? <p>E-mail: {quote.tenant.email}</p> : null}
            <Link
              href={`/w/${quote.tenant.slug}`}
              className="inline-block mt-2 text-xs underline"
              style={{ color: "var(--brand-accent)" }}
            >
              Zacznij nową wycenę →
            </Link>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-[var(--muted-foreground)]">
          Wycena ma charakter wstępny i niewiążący. Modyfikatory: {Object.values(modifiers).filter(Boolean).length}, usługi: {addons.length}.
          {!quote.tenant.hideBranding && (
            <>
              <br />
              Powered by{" "}
              <span style={{ color: "var(--brand-accent)" }} className="font-semibold">
                CareQuote
              </span>
            </>
          )}
        </p>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-[var(--muted-foreground)]">{label}</span>
      <span
        className="font-mono"
        style={accent ? { color: "var(--brand-accent)", fontWeight: 600 } : undefined}
      >
        {value}
      </span>
    </div>
  );
}
