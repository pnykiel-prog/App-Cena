import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export const metadata = { title: "Konfiguracja — przegląd" };

const TILES = [
  { href: "/konfiguracja/pokoje", label: "Pokoje", key: "rooms" as const },
  { href: "/konfiguracja/opieka", label: "Progi opieki", key: "tiers" as const },
  { href: "/konfiguracja/medyczne", label: "Modyfikatory", key: "modifiers" as const },
  { href: "/konfiguracja/uslugi", label: "Usługi dodatkowe", key: "addons" as const },
  { href: "/konfiguracja/rabaty", label: "Rabaty kontraktowe", key: "discounts" as const },
];

export default async function KonfiguracjaPage() {
  const session = await auth();
  const tenantId = session!.user.tenantId!;

  const [rooms, tiers, modifiers, addons, discounts] = await Promise.all([
    prisma.roomType.count({ where: { tenantId } }),
    prisma.careTier.count({ where: { tenantId } }),
    prisma.medicalModifier.count({ where: { tenantId } }),
    prisma.addonService.count({ where: { tenantId } }),
    prisma.contractDiscount.count({ where: { tenantId } }),
  ]);

  const counts = { rooms, tiers, modifiers, addons, discounts };

  return (
    <div className="space-y-4">
      <p className="text-sm text-[var(--muted-foreground)]">
        Wybierz sekcję z menu po lewej, żeby edytować poszczególne elementy
        cennika. Każda zmiana jest natychmiast widoczna w widgecie.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {TILES.map((t) => (
          <Link key={t.href} href={t.href}>
            <Card className="hover:border-[var(--primary)] transition-colors h-full">
              <CardHeader>
                <CardTitle className="text-base flex items-center justify-between">
                  {t.label}
                  <ArrowRight className="h-4 w-4 text-[var(--muted-foreground)]" />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-semibold text-[var(--primary)]">
                  {counts[t.key]}
                </p>
                <p className="text-xs text-[var(--muted-foreground)] mt-1">
                  pozycji w cenniku
                </p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
