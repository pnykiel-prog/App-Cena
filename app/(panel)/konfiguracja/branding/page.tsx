import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BrandingEditor } from "./branding-editor";
import { canFeature } from "@/lib/plan-limits";

export const metadata = { title: "Konfiguracja — Branding" };

export default async function BrandingPage() {
  const session = await auth();
  const tenantId = session!.user.tenantId!;

  const [tenant, subscription] = await Promise.all([
    prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        slug: true,
        name: true,
        legalName: true,
        nip: true,
        city: true,
        address: true,
        postalCode: true,
        phone: true,
        email: true,
        website: true,
        logoUrl: true,
        brandColor: true,
        accentColor: true,
        showRangeWidth: true,
        requirePhoneOnLead: true,
        hideBranding: true,
        priceDisplay: true,
      },
    }),
    prisma.subscription.findUnique({
      where: { tenantId },
      select: { plan: true, limitOverrides: true },
    }),
  ]);

  if (!tenant) {
    return <div>Brak danych tenanta</div>;
  }

  const canHideBranding = canFeature(subscription, "hideBranding");
  const canExactPrice = canFeature(subscription, "exactPrice");

  return (
    <Card>
      <CardHeader>
        <CardTitle>Branding placówki</CardTitle>
        <p className="text-sm text-[var(--muted-foreground)]">
          Dane placówki widoczne w widgecie i na PDF wyceny. Kolory i logo
          dziedziczone do widgetu /w/{tenant.slug}.
        </p>
      </CardHeader>
      <CardContent>
        <BrandingEditor
          initial={tenant}
          canHideBranding={canHideBranding}
          canExactPrice={canExactPrice}
        />
      </CardContent>
    </Card>
  );
}
