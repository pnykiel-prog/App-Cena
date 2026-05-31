import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UpgradePrompt } from "@/components/panel/feature-gate";
import { canFeature } from "@/lib/plan-limits";
import { WebhooksManager } from "./webhooks-manager";

export const metadata = { title: "Konfiguracja — Webhooki" };

export default async function WebhookiPage() {
  const session = await auth();
  const tenantId = session!.user.tenantId!;

  const subscription = await prisma.subscription.findUnique({
    where: { tenantId },
    select: { plan: true, limitOverrides: true },
  });

  if (!canFeature(subscription, "webhookOnLead")) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Webhooki</CardTitle>
          <p className="text-sm text-[var(--muted-foreground)]">
            Wysyłaj zdarzenie do swojego systemu po każdym nowym leadzie.
          </p>
        </CardHeader>
        <CardContent>
          <UpgradePrompt
            feature="webhookOnLead"
            description="Webhooki po leadzie są dostępne w planie Enterprise."
          />
        </CardContent>
      </Card>
    );
  }

  const webhooks = await prisma.webhookEndpoint.findMany({
    where: { tenantId },
    orderBy: { createdAt: "asc" },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Webhooki</CardTitle>
        <p className="text-sm text-[var(--muted-foreground)]">
          Po każdym nowym leadzie wyślemy <code>POST</code> z podpisem
          HMAC-SHA256 (nagłówek <code>X-CareQuote-Signature</code>). Payload nie
          zawiera danych osobowych mieszkańca.
        </p>
      </CardHeader>
      <CardContent>
        <WebhooksManager
          initialItems={webhooks.map((w) => ({
            id: w.id,
            url: w.url,
            description: w.description,
            isActive: w.isActive,
            secret: w.secret,
            lastStatus: w.lastStatus,
            lastFiredAt: w.lastFiredAt?.toISOString() ?? null,
          }))}
        />
      </CardContent>
    </Card>
  );
}
