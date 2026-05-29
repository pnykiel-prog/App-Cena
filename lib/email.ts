// Resend wrapper z graceful fallback dla developmentu.
// Gdy RESEND_API_KEY nie jest realny (zaczyna się od "re_your" lub jest pusty),
// loguje wysyłkę zamiast crashować — łatwiej testować bez konta Resend.

import { Resend } from "resend";
import { formatPLN } from "@/lib/utils";

const apiKey = process.env.RESEND_API_KEY ?? "";
const fromAddress = process.env.RESEND_FROM ?? "office@bonamcuram.com";
const fromName = process.env.NEXT_PUBLIC_APP_NAME ?? "CareQuote";

function isRealKey(): boolean {
  return apiKey.length > 10 && !apiKey.startsWith("re_your");
}

const resend = isRealKey() ? new Resend(apiKey) : null;

export type EmailResult = {
  delivered: boolean;
  skipped: boolean;
  id?: string;
  error?: string;
};

async function send(
  to: string[],
  subject: string,
  html: string,
  attachments?: Array<{ filename: string; content: Buffer }>,
): Promise<EmailResult> {
  if (!resend) {
    console.warn(
      `[email:skipped] to=${to.join(",")} subject="${subject}" attachments=${attachments?.length ?? 0}`,
    );
    return { delivered: false, skipped: true };
  }
  try {
    const res = await resend.emails.send({
      from: `${fromName} <${fromAddress}>`,
      to,
      subject,
      html,
      attachments: attachments?.map((a) => ({
        filename: a.filename,
        content: a.content,
      })),
    });
    if (res.error) {
      console.error("[email:error]", res.error);
      return { delivered: false, skipped: false, error: res.error.message };
    }
    return { delivered: true, skipped: false, id: res.data?.id };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    console.error("[email:exception]", msg);
    return { delivered: false, skipped: false, error: msg };
  }
}

// ─── Szablon: nowy lead → manager ─────────────────────────────────────────────

export type NewLeadEmailInput = {
  tenant: { name: string };
  recipientEmails: string[];
  quote: {
    shareToken: string;
    barthelScore: number;
    estimateMin: number;
    estimateMax: number;
    estimateMid: number;
    contractMonths: number;
    roomLabel: string | null;
  };
  contact: {
    name: string;
    phone: string;
    email: string | null;
    consentMarketing: boolean;
  };
  panelUrl: string;
  publicQuoteUrl: string;
};

export async function sendNewLeadEmail(
  input: NewLeadEmailInput,
): Promise<EmailResult> {
  if (input.recipientEmails.length === 0) {
    return { delivered: false, skipped: true };
  }
  const subject = `Nowy lead z widgetu — ${input.contact.name} (${formatPLN(input.quote.estimateMid)}/mies.)`;
  const html = `
    <div style="font-family: -apple-system, Segoe UI, sans-serif; max-width: 540px; color: #1f2937;">
      <h2 style="color: #1e3a5f; margin: 0 0 12px;">Nowy lead — ${escapeHtml(input.tenant.name)}</h2>
      <p style="margin: 0 0 16px;">Rodzina wypełniła ankietę w Twoim widgecie i zostawiła kontakt.</p>

      <div style="background: #f0f4f9; padding: 14px; border-radius: 8px; margin: 12px 0;">
        <p style="margin: 0 0 6px; font-weight: 600;">Wycena:</p>
        <p style="margin: 0; font-size: 18px; color: #1e3a5f; font-weight: 700;">
          ${formatPLN(input.quote.estimateMin)} – ${formatPLN(input.quote.estimateMax)} / mies.
        </p>
        <p style="margin: 6px 0 0; font-size: 12px; color: #6b7280;">
          ${input.quote.roomLabel ?? "—"} · Barthel ${input.quote.barthelScore}/100 · pobyt ${input.quote.contractMonths} mies.
        </p>
      </div>

      <div style="background: white; border: 1px solid #e5e7eb; padding: 14px; border-radius: 8px; margin: 12px 0;">
        <p style="margin: 0 0 8px; font-weight: 600;">Kontakt:</p>
        <p style="margin: 0;">${escapeHtml(input.contact.name)}</p>
        <p style="margin: 4px 0;">tel. <a href="tel:${escapeHtml(input.contact.phone)}">${escapeHtml(input.contact.phone)}</a></p>
        ${input.contact.email ? `<p style="margin: 4px 0;">e-mail <a href="mailto:${escapeHtml(input.contact.email)}">${escapeHtml(input.contact.email)}</a></p>` : ""}
        ${input.contact.consentMarketing ? '<p style="margin: 8px 0 0; font-size: 11px; color: #059669;">✓ Zgoda marketingowa</p>' : ""}
      </div>

      <p style="margin: 24px 0 6px;">
        <a href="${input.panelUrl}" style="background: #1e3a5f; color: white; padding: 10px 18px; border-radius: 6px; text-decoration: none; font-weight: 600;">Otwórz w panelu</a>
      </p>
      <p style="margin: 0 0 24px;">
        <a href="${input.publicQuoteUrl}" style="color: #C9A84C; font-size: 12px;">Podgląd wyceny (link publiczny)</a>
      </p>

      <p style="font-size: 11px; color: #9ca3af; border-top: 1px solid #e5e7eb; padding-top: 12px; margin-top: 20px;">
        Powiadomienie z platformy CareQuote.
      </p>
    </div>
  `;
  return send(input.recipientEmails, subject, html);
}

// ─── Szablon: PDF wyceny → klient ────────────────────────────────────────────

export type QuotePdfEmailInput = {
  tenant: { name: string };
  to: string;
  pdf: Buffer;
  shareUrl: string;
};

export async function sendQuotePdfToCustomer(
  input: QuotePdfEmailInput,
): Promise<EmailResult> {
  const subject = `Twoja wstępna wycena — ${input.tenant.name}`;
  const html = `
    <div style="font-family: -apple-system, Segoe UI, sans-serif; max-width: 540px; color: #1f2937;">
      <h2 style="color: #1e3a5f; margin: 0 0 12px;">Wycena pobytu w ${escapeHtml(input.tenant.name)}</h2>
      <p>Dziękujemy za skorzystanie z naszej wstępnej wyceny.</p>
      <p>W załączniku znajdziesz pełną wycenę widełkową w formie PDF. Możesz też ją otworzyć
      online pod adresem: <br><a href="${input.shareUrl}">${input.shareUrl}</a></p>
      <p>Z chęcią porozmawiamy o szczegółach — manager skontaktuje się z Tobą wkrótce.</p>
      <p style="font-size: 11px; color: #9ca3af; border-top: 1px solid #e5e7eb; padding-top: 12px; margin-top: 20px;">
        Wycena ma charakter wstępny i niewiążący.
      </p>
    </div>
  `;
  return send([input.to], subject, html, [
    { filename: "wycena.pdf", content: input.pdf },
  ]);
}

// ─── Szablon: wizyta → manager + klient ──────────────────────────────────────

export type VisitEmailInput = {
  tenant: { name: string };
  managerEmails: string[];
  customer: { name: string; phone: string; email: string | null };
  preferredAt: Date | null;
  notes: string | null;
  panelUrl: string;
};

export async function sendVisitBookingEmails(
  input: VisitEmailInput,
): Promise<{ manager: EmailResult; customer: EmailResult }> {
  const dateStr = input.preferredAt
    ? input.preferredAt.toLocaleString("pl-PL", { dateStyle: "long", timeStyle: "short" } as Intl.DateTimeFormatOptions)
    : "do uzgodnienia";

  const managerHtml = `
    <div style="font-family: -apple-system, Segoe UI, sans-serif; max-width: 540px; color: #1f2937;">
      <h2 style="color: #1e3a5f; margin: 0 0 12px;">Prośba o umówienie wizyty</h2>
      <p>${escapeHtml(input.customer.name)} prosi o umówienie wizyty w ${escapeHtml(input.tenant.name)}.</p>
      <div style="background: #f0f4f9; padding: 14px; border-radius: 8px; margin: 12px 0;">
        <p style="margin: 0;"><strong>Preferowany termin:</strong> ${dateStr}</p>
        <p style="margin: 6px 0 0;">Tel.: <a href="tel:${escapeHtml(input.customer.phone)}">${escapeHtml(input.customer.phone)}</a></p>
        ${input.customer.email ? `<p style="margin: 4px 0 0;">E-mail: <a href="mailto:${escapeHtml(input.customer.email)}">${escapeHtml(input.customer.email)}</a></p>` : ""}
        ${input.notes ? `<p style="margin: 8px 0 0;"><strong>Uwagi:</strong> ${escapeHtml(input.notes)}</p>` : ""}
      </div>
      <p>
        <a href="${input.panelUrl}" style="background: #1e3a5f; color: white; padding: 10px 18px; border-radius: 6px; text-decoration: none; font-weight: 600;">Otwórz wizytę w panelu</a>
      </p>
    </div>
  `;

  const customerHtml = `
    <div style="font-family: -apple-system, Segoe UI, sans-serif; max-width: 540px; color: #1f2937;">
      <h2 style="color: #1e3a5f; margin: 0 0 12px;">Potwierdzenie zgłoszenia wizyty</h2>
      <p>Dziękujemy! Twoja prośba o wizytę w ${escapeHtml(input.tenant.name)} została odnotowana.</p>
      <p><strong>Preferowany termin:</strong> ${dateStr}</p>
      <p>Manager skontaktuje się z Tobą wkrótce, aby potwierdzić termin.</p>
      <p style="font-size: 11px; color: #9ca3af; border-top: 1px solid #e5e7eb; padding-top: 12px; margin-top: 20px;">
        Powiadomienie z platformy CareQuote.
      </p>
    </div>
  `;

  const managerRes =
    input.managerEmails.length > 0
      ? await send(
          input.managerEmails,
          `Nowa prośba o wizytę — ${input.customer.name}`,
          managerHtml,
        )
      : { delivered: false, skipped: true };

  const customerRes = input.customer.email
    ? await send(
        [input.customer.email],
        `Potwierdzenie zgłoszenia wizyty — ${input.tenant.name}`,
        customerHtml,
      )
    : { delivered: false, skipped: true };

  return { manager: managerRes, customer: customerRes };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
