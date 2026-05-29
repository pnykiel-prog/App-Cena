import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BrandingEditor } from "./branding-editor";

export const metadata = { title: "Konfiguracja — Branding" };

export default async function BrandingPage() {
  const session = await auth();
  const tenantId = session!.user.tenantId!;

  const tenant = await prisma.tenant.findUnique({
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
    },
  });

  if (!tenant) {
    return <div>Brak danych tenanta</div>;
  }

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
        <BrandingEditor initial={tenant} />
      </CardContent>
    </Card>
  );
}
