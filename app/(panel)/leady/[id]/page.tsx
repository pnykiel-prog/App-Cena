import { notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ExternalLink, Mail, Phone, FileText } from "lucide-react";
import { formatPLN, formatRange } from "@/lib/utils";
import { barthelInterpretation } from "@/lib/barthel";
import { LeadStatusControl } from "./status-control";
import { LeadNotesEditor } from "./notes-editor";

export const metadata = { title: "Lead — szczegóły" };

const STATUS_LABEL: Record<string, string> = {
  DRAFT: "Anonimowa",
  NEW: "Nowy",
  CONTACTED: "Kontakt nawiązany",
  VISIT_SCHEDULED: "Wizyta umówiona",
  WON: "Wygrany",
  LOST: "Stracony",
  COMPLETED: "Zakończony",
  ARCHIVED: "Archiwum",
  CONVERTED_TO_VISIT: "Wizyta",
};

const STATUS_VARIANT: Record<string, "muted" | "success" | "warning" | "danger" | "outline"> = {
  DRAFT: "outline",
  NEW: "warning",
  CONTACTED: "muted",
  VISIT_SCHEDULED: "success",
  WON: "success",
  LOST: "danger",
  COMPLETED: "muted",
  ARCHIVED: "muted",
  CONVERTED_TO_VISIT: "success",
};

export default async function LeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  const tenantId = session!.user.tenantId!;

  const quote = await prisma.quote.findFirst({
    where: { id, tenantId },
    include: { roomType: true, visit: true },
  });
  if (!quote) notFound();

  const interp = barthelInterpretation(quote.barthelScore);
  const modInput = (quote.medModifiers as Record<string, unknown>) ?? {};
  const addonsInput =
    (quote.addons as Array<{ code: string; monthlyCountEstimate: number }>) ??
    [];

  const [modCatalog, addonCatalog] = await Promise.all([
    prisma.medicalModifier.findMany({
      where: { tenantId, code: { in: Object.keys(modInput) } },
      select: { code: true, label: true, monthlySurcharge: true, isToggle: true },
    }),
    prisma.addonService.findMany({
      where: {
        tenantId,
        code: { in: addonsInput.map((a) => a.code) },
      },
      select: { code: true, label: true, unitPrice: true, unit: true },
    }),
  ]);

  const DAYS_PER_MONTH = 30.44;
  const modBreakdown: { label: string; amount: number }[] = [];
  for (const m of modCatalog) {
    const raw = modInput[m.code];
    if (raw === undefined || raw === null || raw === false || raw === 0) continue;
    const value = m.isToggle ? 1 : typeof raw === "number" ? raw : 1;
    const amount = m.monthlySurcharge * value;
    if (amount === 0) continue;
    modBreakdown.push({ label: m.label, amount });
  }
  const addonBreakdown: { label: string; monthlyEquivalent: number }[] = [];
  for (const a of addonsInput) {
    const found = addonCatalog.find((x) => x.code === a.code);
    if (!found) continue;
    let monthlyEquivalent: number;
    switch (found.unit) {
      case "PER_MONTH":
        monthlyEquivalent = found.unitPrice;
        break;
      case "PER_DAY":
        monthlyEquivalent =
          found.unitPrice *
          (a.monthlyCountEstimate > 0 ? a.monthlyCountEstimate : DAYS_PER_MONTH);
        break;
      default:
        monthlyEquivalent = found.unitPrice * Math.max(0, a.monthlyCountEstimate);
    }
    addonBreakdown.push({ label: found.label, monthlyEquivalent });
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/leady"
          className="inline-flex items-center gap-1 text-xs text-[var(--muted-foreground)] hover:text-[var(--primary)]"
        >
          <ArrowLeft className="h-3 w-3" />
          Wszystkie leady
        </Link>
        <div className="mt-2 flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-[var(--primary)]">
              Lead z {new Date(quote.createdAt).toLocaleDateString("pl-PL")}
            </h1>
            <p className="text-sm text-[var(--muted-foreground)] mt-1">
              {quote.contactName ?? "Anonim"} ·{" "}
              {new Date(quote.createdAt).toLocaleString("pl-PL")}
            </p>
            <div className="mt-2 flex items-center gap-2 flex-wrap">
              <Badge variant={STATUS_VARIANT[quote.status] ?? "muted"}>
                {STATUS_LABEL[quote.status] ?? quote.status}
              </Badge>
              <Badge variant="muted">
                Barthel {quote.barthelScore}/100 — {interp.label}
              </Badge>
            </div>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="outline">
              <a
                href={`/q/${quote.shareToken}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink className="h-4 w-4" />
                Podgląd
              </a>
            </Button>
            <Button asChild>
              <a
                href={`/api/quotes/${quote.shareToken}/pdf`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <FileText className="h-4 w-4" />
                PDF
              </a>
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Wycena</CardTitle>
              <CardDescription>
                Snapshot kalkulacji z momentu wypełnienia ankiety
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div
                className="rounded-lg p-5 text-white text-center"
                style={{ background: "var(--primary)" }}
              >
                <p className="text-xs uppercase tracking-wider opacity-80">
                  Szacunkowy koszt miesięczny
                </p>
                <p className="mt-2 text-3xl font-bold">
                  {formatRange(quote.estimateMin, quote.estimateMax)}
                </p>
                <p className="mt-1 text-xs opacity-80">
                  pobyt {quote.contractMonths} mies. · środek {formatPLN(quote.estimateMid)}
                </p>
              </div>

              <div className="space-y-2 pt-2">
                <Row
                  label={`Pokój — ${quote.roomType?.label ?? "—"}`}
                  value={quote.basePrice}
                />
                {quote.careTierLabel ? (
                  <Row
                    label={`Opieka — ${quote.careTierLabel}`}
                    value={quote.careSurcharge}
                  />
                ) : null}
                {modBreakdown.length > 0 ? (
                  <>
                    <p className="text-xs text-[var(--muted-foreground)] pt-2">
                      Modyfikatory medyczne:
                    </p>
                    {modBreakdown.map((m, i) => (
                      <Row key={i} sub label={`• ${m.label}`} value={m.amount} />
                    ))}
                  </>
                ) : null}
                {addonBreakdown.length > 0 ? (
                  <>
                    <p className="text-xs text-[var(--muted-foreground)] pt-2">
                      Usługi dodatkowe (ekwiwalent mies.):
                    </p>
                    {addonBreakdown.map((a, i) => (
                      <Row
                        key={i}
                        sub
                        label={`• ${a.label}`}
                        value={a.monthlyEquivalent}
                      />
                    ))}
                  </>
                ) : null}
                {quote.discountPct > 0 ? (
                  <Row
                    label={`Rabat ${(quote.discountPct * 100).toFixed(0)}%`}
                    value={
                      -(
                        (quote.basePrice +
                          quote.careSurcharge +
                          quote.modifiersTotal +
                          quote.addonsTotal) *
                        quote.discountPct
                      )
                    }
                    accent
                  />
                ) : null}
                <div className="pt-2 border-t border-[var(--border)] flex justify-between text-sm font-semibold">
                  <span>Środek widełek</span>
                  <span className="font-mono">
                    {formatPLN(quote.estimateMid)} / mies.
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Notatki managera</CardTitle>
              <CardDescription>
                Wewnętrzne notatki — niewidoczne dla klienta.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <LeadNotesEditor leadId={quote.id} initial={quote.notes ?? ""} />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Status</CardTitle>
            </CardHeader>
            <CardContent>
              <LeadStatusControl leadId={quote.id} current={quote.status} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Kontakt</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {quote.contactName ? (
                <>
                  <p className="font-medium">{quote.contactName}</p>
                  {quote.contactPhone ? (
                    <p className="flex items-center gap-1.5 text-[var(--muted-foreground)]">
                      <Phone className="h-3.5 w-3.5" />
                      <a
                        href={`tel:${quote.contactPhone}`}
                        className="hover:underline"
                      >
                        {quote.contactPhone}
                      </a>
                    </p>
                  ) : null}
                  {quote.contactEmail ? (
                    <p className="flex items-center gap-1.5 text-[var(--muted-foreground)]">
                      <Mail className="h-3.5 w-3.5" />
                      <a
                        href={`mailto:${quote.contactEmail}`}
                        className="hover:underline"
                      >
                        {quote.contactEmail}
                      </a>
                    </p>
                  ) : null}
                  <div className="pt-2 text-xs space-y-1">
                    <p>
                      RODO:{" "}
                      {quote.consentRodo ? (
                        <span className="text-emerald-700">✓ tak</span>
                      ) : (
                        <span className="text-red-600">✗ nie</span>
                      )}
                    </p>
                    <p>
                      Marketing:{" "}
                      {quote.consentMarketing ? (
                        <span className="text-emerald-700">✓ tak</span>
                      ) : (
                        <span className="text-[var(--muted-foreground)]">nie</span>
                      )}
                    </p>
                  </div>
                </>
              ) : (
                <p className="text-xs text-[var(--muted-foreground)] italic">
                  Lead anonimowy — klient nie zostawił kontaktu.
                </p>
              )}
            </CardContent>
          </Card>

          {quote.seniorFirstName || quote.seniorAge ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Dane seniora</CardTitle>
              </CardHeader>
              <CardContent className="text-sm">
                {quote.seniorFirstName ? <p>Imię: {quote.seniorFirstName}</p> : null}
                {quote.seniorAge ? <p>Wiek: {quote.seniorAge}</p> : null}
              </CardContent>
            </Card>
          ) : null}

          {quote.visit ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Powiązana wizyta</CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-1">
                <p className="font-medium">{quote.visit.contactName}</p>
                <p className="text-[var(--muted-foreground)]">
                  {quote.visit.contactPhone}
                </p>
                {quote.visit.preferredAt ? (
                  <p className="text-xs">
                    Preferowany:{" "}
                    {new Date(quote.visit.preferredAt).toLocaleString("pl-PL")}
                  </p>
                ) : null}
                <Badge variant="muted">{quote.visit.status}</Badge>
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: number;
  sub?: boolean;
  accent?: boolean;
}) {
  return (
    <div
      className={`flex justify-between ${sub ? "text-xs" : "text-sm"} ${
        accent ? "font-semibold" : ""
      }`}
      style={accent ? { color: "var(--accent)" } : undefined}
    >
      <span className={sub ? "text-[var(--muted-foreground)]" : ""}>{label}</span>
      <span className="font-mono">
        {value < 0 ? "−" : ""}
        {formatPLN(Math.abs(value))}
      </span>
    </div>
  );
}
