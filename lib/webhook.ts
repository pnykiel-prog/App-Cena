// ─── Webhooki — wysyłka zdarzeń z podpisem HMAC-SHA256 ────────────────────────
//
// Po utworzeniu leada wołamy fireLeadWebhooks(). Payload NIE zawiera danych
// osobowych mieszkańca (imię/wiek) ani treści odpowiedzi — tylko metadane wyceny
// i (jeśli zostawione za zgodą) dane kontaktowe rodziny. Endpoint weryfikuje
// nagłówek X-CareQuote-Signature = hex(HMAC_SHA256(secret, rawBody)).

import { createHmac } from "node:crypto";
import { prisma } from "@/lib/prisma";

export function signPayload(rawBody: string, secret: string): string {
  return createHmac("sha256", secret).update(rawBody).digest("hex");
}

export type LeadWebhookPayload = {
  event: "lead.created";
  quoteId: string;
  shareToken: string;
  tenantSlug: string;
  barthelScore: number;
  estimateMin: number;
  estimateMid: number;
  estimateMax: number;
  currency: string;
  hasContact: boolean;
  overLimit: boolean;
  createdAt: string;
};

// Wysyła payload na wszystkie aktywne endpointy tenanta. Nigdy nie rzuca —
// błąd dostarczenia nie może wywrócić utworzenia leada. Best-effort, krótki
// timeout, zapis ostatniego statusu do diagnostyki.
export async function fireLeadWebhooks(
  tenantId: string,
  payload: LeadWebhookPayload,
): Promise<void> {
  try {
    const endpoints = await prisma.webhookEndpoint.findMany({
      where: { tenantId, isActive: true },
      select: { id: true, url: true, secret: true },
    });
    if (endpoints.length === 0) return;

    const body = JSON.stringify(payload);

    await Promise.all(
      endpoints.map(async (ep) => {
        let status: number | null = null;
        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 5000);
          const res = await fetch(ep.url, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-CareQuote-Event": payload.event,
              "X-CareQuote-Signature": signPayload(body, ep.secret),
            },
            body,
            signal: controller.signal,
          });
          clearTimeout(timeout);
          status = res.status;
        } catch (e) {
          console.error(
            "[webhook] delivery failed:",
            e instanceof Error ? e.message : e,
          );
        }
        await prisma.webhookEndpoint
          .update({
            where: { id: ep.id },
            data: { lastStatus: status, lastFiredAt: new Date() },
          })
          .catch(() => {});
      }),
    );
  } catch (e) {
    console.error("[webhook] fireLeadWebhooks failed:", e instanceof Error ? e.message : e);
  }
}
