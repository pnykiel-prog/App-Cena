import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UpgradePrompt } from "@/components/panel/feature-gate";
import { canFeature } from "@/lib/plan-limits";
import { ApiKeysManager } from "./api-keys-manager";

export const metadata = { title: "Konfiguracja — Integracje (REST API)" };

export default async function IntegracjePage() {
  const session = await auth();
  const tenantId = session!.user.tenantId!;

  const subscription = await prisma.subscription.findUnique({
    where: { tenantId },
    select: { plan: true, limitOverrides: true },
  });

  if (!canFeature(subscription, "restApi")) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Integracje — REST API</CardTitle>
          <p className="text-sm text-[var(--muted-foreground)]">
            Pobieraj leady programowo przez REST API.
          </p>
        </CardHeader>
        <CardContent>
          <UpgradePrompt
            feature="restApi"
            description="REST API i klucze API są dostępne w planie Enterprise."
          />
        </CardContent>
      </Card>
    );
  }

  const keys = await prisma.apiKey.findMany({
    where: { tenantId },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      name: true,
      prefix: true,
      isActive: true,
      lastUsedAt: true,
      createdAt: true,
    },
  });

  const base = process.env.NEXT_PUBLIC_APP_URL ?? "";

  return (
    <Card>
      <CardHeader>
        <CardTitle>Integracje — REST API</CardTitle>
        <p className="text-sm text-[var(--muted-foreground)]">
          Uwierzytelnianie nagłówkiem <code>Authorization: Bearer cq_…</code>.
          Klucz pokazujemy tylko raz — zapisz go bezpiecznie.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        <ApiKeysManager
          initialItems={keys.map((k) => ({
            id: k.id,
            name: k.name,
            prefix: k.prefix,
            isActive: k.isActive,
            lastUsedAt: k.lastUsedAt?.toISOString() ?? null,
            createdAt: k.createdAt.toISOString(),
          }))}
        />

        <div className="rounded-lg border border-[var(--border)] bg-[var(--muted)]/40 p-4 text-xs">
          <p className="font-semibold text-[var(--primary)] mb-2">Przykład użycia</p>
          <pre className="overflow-x-auto whitespace-pre-wrap font-mono text-[11px]">
{`curl ${base}/api/v1/leads \\
  -H "Authorization: Bearer cq_twoj_klucz"

# pojedynczy lead
curl ${base}/api/v1/leads/{id} \\
  -H "Authorization: Bearer cq_twoj_klucz"`}
          </pre>
        </div>
      </CardContent>
    </Card>
  );
}
