"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { formatPLN, formatRange } from "@/lib/utils";
import { barthelInterpretation } from "@/lib/barthel";
import type { QuoteResult, WidgetTenant } from "./types";
import {
  CheckCircle2,
  Mail,
  Phone,
  Calendar,
  Download,
  Lock,
  Sparkles,
} from "lucide-react";

export function ResultStep({
  result,
  tenant,
  barthelScore,
  contractMonths,
  roomLabel,
}: {
  result: QuoteResult;
  tenant: WidgetTenant;
  barthelScore: number;
  contractMonths: number;
  roomLabel: string;
}) {
  const interp = barthelInterpretation(barthelScore);
  const [contactSubmitted, setContactSubmitted] = useState(false);
  const [showVisitForm, setShowVisitForm] = useState(false);
  const [visitSubmitted, setVisitSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [sendingPdf, setSendingPdf] = useState(false);
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    consentRodo: false,
    consentMarketing: false,
  });
  const [visit, setVisit] = useState({
    name: "",
    phone: "",
    email: "",
    preferredAt: "",
    notes: "",
  });

  const emailValid = /.+@.+\..+/.test(form.email.trim());
  const phoneValid = form.phone.trim().length >= 6;
  const phoneRequired = tenant.requirePhoneOnLead;
  const canSubmitContact =
    form.consentRodo &&
    form.name.trim().length >= 2 &&
    emailValid &&
    (!phoneRequired || phoneValid);

  async function submitContact() {
    if (!form.consentRodo) {
      toast.error("Aby zobaczyć wycenę, zgódź się na przetwarzanie danych.");
      return;
    }
    if (!emailValid) {
      toast.error("Wpisz prawidłowy adres e-mail.");
      return;
    }
    if (phoneRequired && !phoneValid) {
      toast.error("Wpisz numer telefonu (jest wymagany).");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(
        `/api/widget/${tenant.slug}/quote/${result.shareToken}/contact`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        },
      );
      const json = await res.json();
      if (!json.success) {
        toast.error(json.error ?? "Nie udało się zapisać kontaktu");
        return;
      }
      toast.success("Wycena odblokowana");
      setContactSubmitted(true);
      setVisit((v) => ({
        ...v,
        name: form.name,
        phone: form.phone,
        email: form.email,
      }));
    } catch (e) {
      toast.error("Błąd połączenia");
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  }

  async function sendPdf() {
    const email = (form.email || visit.email).trim();
    if (!email || !email.includes("@")) {
      toast.error("Wpisz e-mail, na który mamy wysłać PDF.");
      return;
    }
    setSendingPdf(true);
    try {
      const res = await fetch(
        `/api/quotes/${result.shareToken}/send-pdf`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        },
      );
      const json = await res.json();
      if (!json.success) {
        toast.error(json.error ?? "Nie udało się wysłać PDF-a");
        return;
      }
      if (json.data?.skipped) {
        toast.info("PDF wygenerowany, ale wysyłka pominięta (sandbox).");
      } else if (json.data?.delivered) {
        toast.success(`PDF wysłany na ${email}`);
      } else {
        toast.success("PDF został zapisany.");
      }
    } catch (e) {
      toast.error("Błąd połączenia");
      console.error(e);
    } finally {
      setSendingPdf(false);
    }
  }

  async function submitVisit() {
    if (!visit.name.trim() || !visit.phone.trim()) {
      toast.error("Podaj imię i telefon.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(
        `/api/widget/${tenant.slug}/quote/${result.shareToken}/visit`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: visit.name,
            phone: visit.phone,
            email: visit.email || undefined,
            preferredAt: visit.preferredAt || undefined,
            notes: visit.notes || undefined,
          }),
        },
      );
      const json = await res.json();
      if (!json.success) {
        toast.error(json.error ?? "Nie udało się umówić wizyty");
        return;
      }
      toast.success("Prośba o wizytę wysłana");
      setVisitSubmitted(true);
    } catch (e) {
      toast.error("Błąd połączenia");
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  }

  const pdfDownloadUrl = `/api/quotes/${result.shareToken}/pdf`;

  // ─── GATE: przed kontaktem ────────────────────────────────────────────────
  if (!contactSubmitted) {
    return (
      <div className="space-y-6">
        <div className="text-center py-2">
          <div
            className="mx-auto h-12 w-12 rounded-full flex items-center justify-center"
            style={{ backgroundColor: "var(--brand)" }}
          >
            <Sparkles className="h-7 w-7 text-white" />
          </div>
          <h2
            className="mt-4 text-2xl font-semibold"
            style={{ color: "var(--brand)" }}
          >
            Twoja wycena jest gotowa
          </h2>
          <p className="mt-2 text-sm text-[var(--muted-foreground)]">
            Aby zobaczyć szacunkowy koszt pobytu w {tenant.name}, zostaw kontakt.
            Wycena wraz z PDF trafi też na Twój e-mail.
          </p>
        </div>

        {/* Teaser ze złamanymi widełkami — blur sygnalizuje że są gotowe */}
        <Card
          className="border-0 relative overflow-hidden"
          style={{
            background: "var(--brand)",
          }}
        >
          <CardContent className="pt-6 text-center text-white">
            <p className="text-xs uppercase tracking-wider opacity-80">
              Szacunkowy koszt miesięczny
            </p>
            <p
              className="mt-3 text-4xl md:text-5xl font-bold tracking-tight select-none"
              style={{
                filter: "blur(10px)",
                WebkitFilter: "blur(10px)",
              }}
              aria-hidden="true"
            >
              {formatRange(result.estimateMin, result.estimateMax)}
            </p>
            <p className="mt-2 text-sm opacity-80">
              {result.currency} / miesiąc · pobyt {contractMonths} mies.
            </p>
            <div className="mt-3 inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium bg-white/10">
              <Lock className="h-3 w-3" />
              Odblokuj pełną wycenę poniżej
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6 space-y-4">
            <div>
              <p className="text-sm font-semibold" style={{ color: "var(--brand)" }}>
                Zostaw kontakt
              </p>
              <p className="text-xs text-[var(--muted-foreground)] mt-1">
                E-mail jest wymagany — wyślemy na niego pełną wycenę w formie
                PDF. {phoneRequired
                  ? "Telefon też jest wymagany — manager się odezwie."
                  : "Telefon jest opcjonalny."}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="c-name">Imię i nazwisko *</Label>
              <Input
                id="c-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Jan Kowalski"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="c-email">E-mail (wymagany) *</Label>
              <Input
                id="c-email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="ty@example.pl"
              />
              <p className="text-xs text-[var(--muted-foreground)]">
                Wyślemy wycenę PDF i potwierdzenie kontaktu.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="c-phone">
                Telefon {phoneRequired ? "(wymagany) *" : "(opcjonalnie)"}
              </Label>
              <Input
                id="c-phone"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="+48 600 123 456"
              />
            </div>

            <div className="space-y-2 pt-2">
              <label className="flex items-start gap-2 text-xs text-[var(--muted-foreground)] cursor-pointer">
                <Checkbox
                  checked={form.consentRodo}
                  onCheckedChange={(v) =>
                    setForm({ ...form, consentRodo: v === true })
                  }
                  className="mt-0.5"
                />
                <span>
                  Wyrażam zgodę na przetwarzanie moich danych osobowych w celu
                  kontaktu zwrotnego przez {tenant.name} (zgoda obowiązkowa).
                </span>
              </label>
              <label className="flex items-start gap-2 text-xs text-[var(--muted-foreground)] cursor-pointer">
                <Checkbox
                  checked={form.consentMarketing}
                  onCheckedChange={(v) =>
                    setForm({ ...form, consentMarketing: v === true })
                  }
                  className="mt-0.5"
                />
                <span>
                  Chcę otrzymywać informacje o ofercie i dostępności miejsc
                  (opcjonalnie).
                </span>
              </label>
            </div>

            <Button
              type="button"
              onClick={submitContact}
              disabled={submitting || !canSubmitContact}
              style={{ backgroundColor: "var(--brand)" }}
              className="w-full text-white hover:opacity-90"
            >
              {submitting ? (
                "Odblokowuję..."
              ) : (
                <>
                  <Lock className="h-4 w-4" />
                  Pokaż wycenę
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-[var(--muted-foreground)] pt-2">
          Twoje dane są przetwarzane wyłącznie w celu kontaktu z {tenant.name}.
          Nie udostępniamy ich osobom trzecim.
        </p>
      </div>
    );
  }

  // ─── PO ODBLOKOWANIU: pełna wycena + akcje ─────────────────────────────────
  return (
    <div className="space-y-6">
      <div className="text-center py-4">
        <div
          className="mx-auto h-12 w-12 rounded-full flex items-center justify-center"
          style={{ backgroundColor: "var(--brand)" }}
        >
          <CheckCircle2 className="h-7 w-7 text-white" />
        </div>
        <h2 className="mt-4 text-2xl font-semibold" style={{ color: "var(--brand)" }}>
          Twoja wstępna wycena
        </h2>
        <p className="mt-2 text-sm text-[var(--muted-foreground)]">
          Wycena widełkowa pobytu w {tenant.name}. Wysłaliśmy ją również na{" "}
          <strong>{form.email}</strong>.
        </p>
      </div>

      <Card
        className="border-0"
        style={{
          background: `linear-gradient(135deg, var(--brand) 0%, var(--brand) 100%)`,
        }}
      >
        <CardContent className="pt-6 text-center text-white">
          <p className="text-xs uppercase tracking-wider opacity-80">
            Szacunkowy koszt miesięczny
          </p>
          <p className="mt-3 text-4xl md:text-5xl font-bold tracking-tight">
            {formatRange(result.estimateMin, result.estimateMax)}
          </p>
          <p className="mt-2 text-sm opacity-80">
            {result.currency} / miesiąc · pobyt {contractMonths} mies.
          </p>
          {result.breakdown.discountPct > 0 && (
            <p
              className="mt-3 inline-block rounded-full px-3 py-1 text-xs font-medium"
              style={{ backgroundColor: "var(--brand-accent)" }}
            >
              Uwzględniono rabat{" "}
              {(result.breakdown.discountPct * 100).toFixed(0)}%
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6 space-y-3">
          <p className="text-sm font-semibold" style={{ color: "var(--brand)" }}>
            Rozbicie szacunkowe
          </p>
          <BreakdownRow label={`Pokój — ${roomLabel}`} value={result.breakdown.basePrice} />
          {result.breakdown.careTier && (
            <BreakdownRow
              label={`Opieka — ${result.breakdown.careTier.label} (Barthel ${barthelScore}/100)`}
              value={result.breakdown.careTier.surcharge}
            />
          )}
          {result.breakdown.modifiers.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs text-[var(--muted-foreground)] mt-2">
                Modyfikatory medyczne:
              </p>
              {result.breakdown.modifiers.map((m) => (
                <BreakdownRow key={m.code} label={`• ${m.label}`} value={m.amount} sub />
              ))}
            </div>
          )}
          {result.breakdown.addons.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs text-[var(--muted-foreground)] mt-2">
                Usługi dodatkowe (ekwiwalent mies.):
              </p>
              {result.breakdown.addons.map((a) => (
                <BreakdownRow
                  key={a.code}
                  label={`• ${a.label}`}
                  value={a.monthlyEquivalent}
                  sub
                />
              ))}
            </div>
          )}
          {result.breakdown.discountAmount > 0 && (
            <BreakdownRow
              label={`Rabat za umowę ${contractMonths} mies.`}
              value={-result.breakdown.discountAmount}
              accent
            />
          )}
          <div className="pt-3 border-t border-[var(--border)] flex justify-between text-sm font-semibold">
            <span style={{ color: "var(--brand)" }}>Środek widełek:</span>
            <span>{formatPLN(result.estimateMid)} / mies.</span>
          </div>
          <p className="text-xs text-[var(--muted-foreground)] pt-2">
            <strong>Interpretacja Barthela:</strong> {interp.label} ({barthelScore}/100 pkt)
          </p>
          <div className="pt-2 flex gap-2 flex-wrap">
            <Button asChild variant="outline" size="sm">
              <a href={pdfDownloadUrl} target="_blank" rel="noopener noreferrer">
                <Download className="h-4 w-4" />
                Pobierz PDF
              </a>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={sendPdf}
              disabled={sendingPdf}
            >
              <Mail className="h-4 w-4" />
              {sendingPdf ? "Wysyłam..." : `Wyślij PDF na ${form.email}`}
            </Button>
          </div>
        </CardContent>
      </Card>

      {!showVisitForm && !visitSubmitted ? (
        <Card>
          <CardContent className="pt-6 text-center space-y-3">
            <CheckCircle2
              className="mx-auto h-10 w-10"
              style={{ color: "var(--brand)" }}
            />
            <p className="text-sm font-semibold">Dziękujemy za kontakt!</p>
            <p className="text-xs text-[var(--muted-foreground)]">
              Manager {tenant.name} odezwie się do Ciebie wkrótce. Możesz też
              od razu umówić wizytę w placówce.
            </p>
            <Button
              size="sm"
              style={{ backgroundColor: "var(--brand)" }}
              className="text-white hover:opacity-90"
              onClick={() => setShowVisitForm(true)}
            >
              <Calendar className="h-4 w-4" />
              Umów wizytę
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {showVisitForm && !visitSubmitted ? (
        <Card>
          <CardContent className="pt-6 space-y-4">
            <p className="text-sm font-semibold" style={{ color: "var(--brand)" }}>
              Umów wizytę w placówce
            </p>
            <p className="text-xs text-[var(--muted-foreground)]">
              Manager skontaktuje się aby potwierdzić termin. To wstępna prośba —
              nie zobowiązuje.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="v-name">Imię i nazwisko</Label>
                <Input
                  id="v-name"
                  value={visit.name}
                  onChange={(e) => setVisit({ ...visit, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="v-phone">Telefon</Label>
                <Input
                  id="v-phone"
                  value={visit.phone}
                  onChange={(e) => setVisit({ ...visit, phone: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="v-email">E-mail</Label>
                <Input
                  id="v-email"
                  type="email"
                  value={visit.email}
                  onChange={(e) => setVisit({ ...visit, email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="v-date">Preferowany termin</Label>
                <Input
                  id="v-date"
                  type="datetime-local"
                  value={visit.preferredAt}
                  onChange={(e) =>
                    setVisit({ ...visit, preferredAt: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="v-notes">Uwagi (opcjonalnie)</Label>
              <Textarea
                id="v-notes"
                value={visit.notes}
                onChange={(e) => setVisit({ ...visit, notes: e.target.value })}
                placeholder="Np. preferowane wcześniejsze godziny, dostępność transportu..."
              />
            </div>

            <div className="flex gap-2">
              <Button
                onClick={submitVisit}
                disabled={
                  submitting || !visit.name.trim() || !visit.phone.trim()
                }
                style={{ backgroundColor: "var(--brand)" }}
                className="text-white hover:opacity-90 flex-1"
              >
                <Calendar className="h-4 w-4" />
                {submitting ? "Wysyłam..." : "Wyślij prośbę o wizytę"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setShowVisitForm(false)}
                disabled={submitting}
              >
                Anuluj
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {visitSubmitted ? (
        <Card>
          <CardContent className="pt-6 text-center space-y-2">
            <CheckCircle2
              className="mx-auto h-10 w-10"
              style={{ color: "var(--brand)" }}
            />
            <p className="text-sm font-semibold">Prośba o wizytę wysłana</p>
            <p className="text-xs text-[var(--muted-foreground)]">
              Manager {tenant.name} odezwie się aby potwierdzić termin.
            </p>
          </CardContent>
        </Card>
      ) : null}

      <p className="text-center text-xs text-[var(--muted-foreground)] pt-2">
        Wycena ma charakter wstępny i niewiążący. Ostateczna kwota zostanie
        ustalona po konsultacji z placówką. Wynik wyceny:{" "}
        <code className="text-[10px]">{result.shareToken}</code>
      </p>
    </div>
  );
}

function BreakdownRow({
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
      style={accent ? { color: "var(--brand-accent)" } : undefined}
    >
      <span className={sub ? "text-[var(--muted-foreground)]" : ""}>{label}</span>
      <span className="font-mono">
        {value < 0 ? "−" : ""}
        {formatPLN(Math.abs(value))}
      </span>
    </div>
  );
}
