// Generator feedu iCal (.ics, RFC 5545) z wizytami tenanta.
// Kalendarz tylko-do-odczytu — subskrybowany przez Google/Outlook/Apple Calendar.

import { randomBytes } from "node:crypto";
import {
  visitKindLabel,
  visitPreferenceLabel,
} from "@/lib/visit-options";

export function generateFeedToken(): string {
  return "cal_" + randomBytes(24).toString("hex");
}

const STATUS_LABEL: Record<string, string> = {
  REQUESTED: "Zgłoszona",
  CONFIRMED: "Potwierdzona",
  COMPLETED: "Odbyta",
  CANCELLED: "Anulowana",
  NO_SHOW: "Niestawienie",
};

// Data → format UTC iCal: YYYYMMDDTHHMMSSZ
function toIcsDate(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}` +
    `T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`
  );
}

// Data → format DATE (cały dzień): YYYYMMDD
function toIcsDay(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}`;
}

// Escapowanie tekstu wg RFC 5545 (przecinki, średniki, backslash, nowe linie).
function esc(s: string | null | undefined): string {
  if (!s) return "";
  return s
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

// Zawijanie linii do 75 oktetów (RFC 5545) — kontynuacja spacją.
function fold(line: string): string {
  if (line.length <= 75) return line;
  const chunks: string[] = [];
  let i = 0;
  while (i < line.length) {
    chunks.push((i === 0 ? "" : " ") + line.slice(i, i + (i === 0 ? 75 : 74)));
    i += i === 0 ? 75 : 74;
  }
  return chunks.join("\r\n");
}

export type VisitForIcs = {
  id: string;
  contactName: string;
  contactPhone: string;
  contactEmail: string | null;
  kind: string;
  preferredDay: string | null;
  preferredTime: string | null;
  preferredAt: Date | null;
  notes: string | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
};

export function buildIcsFeed(
  tenantName: string,
  appHost: string,
  visits: VisitForIcs[],
): string {
  const now = toIcsDate(new Date());
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//CareQuote//Wizyty//PL",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    fold(`X-WR-CALNAME:${esc(`Wizyty — ${tenantName}`)}`),
    "X-PUBLISHED-TTL:PT1H",
  ];

  for (const v of visits) {
    const kindLabel = visitKindLabel(v.kind);
    const pref = visitPreferenceLabel(v.preferredDay, v.preferredTime);
    const summary = `${kindLabel}: ${v.contactName}`;
    const descParts = [
      `Telefon: ${v.contactPhone}`,
      v.contactEmail ? `E-mail: ${v.contactEmail}` : "",
      `Preferowany termin: ${pref}`,
      v.notes ? `Uwagi: ${v.notes}` : "",
      `Status: ${STATUS_LABEL[v.status] ?? v.status}`,
    ].filter(Boolean);

    const ev: string[] = [
      "BEGIN:VEVENT",
      fold(`UID:visit-${v.id}@${appHost}`),
      `DTSTAMP:${now}`,
    ];

    if (v.preferredAt) {
      // Manager ustalił dokładny termin → wydarzenie o konkretnej godzinie (1h).
      const start = new Date(v.preferredAt);
      const end = new Date(start.getTime() + 60 * 60 * 1000);
      ev.push(`DTSTART:${toIcsDate(start)}`, `DTEND:${toIcsDate(end)}`);
    } else {
      // Brak dokładnej daty → wydarzenie całodniowe w dniu zgłoszenia (przypomnienie
      // do oddzwonienia/umówienia). Preferencja dnia/pory jest w opisie.
      ev.push(`DTSTART;VALUE=DATE:${toIcsDay(new Date(v.createdAt))}`);
    }

    ev.push(
      fold(`SUMMARY:${esc(summary)}`),
      fold(`DESCRIPTION:${esc(descParts.join("\n"))}`),
      `STATUS:${v.status === "CANCELLED" ? "CANCELLED" : "CONFIRMED"}`,
      `LAST-MODIFIED:${toIcsDate(new Date(v.updatedAt))}`,
      "END:VEVENT",
    );
    lines.push(...ev);
  }

  lines.push("END:VCALENDAR");
  return lines.join("\r\n") + "\r\n";
}
