import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";

const SECTIONS = [
  { href: "/konfiguracja", label: "Przegląd", end: true },
  { href: "/konfiguracja/pokoje", label: "Pokoje" },
  { href: "/konfiguracja/opieka", label: "Opieka (Barthel)" },
  { href: "/konfiguracja/medyczne", label: "Modyfikatory medyczne" },
  { href: "/konfiguracja/uslugi", label: "Usługi dodatkowe" },
  { href: "/konfiguracja/rabaty", label: "Rabaty" },
  { href: "/konfiguracja/branding", label: "Branding" },
  { href: "/konfiguracja/powiadomienia", label: "Powiadomienia" },
  { href: "/konfiguracja/osadzenie", label: "Osadzenie widgetu" },
];

export default function KonfiguracjaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--primary)]">
          Konfiguracja
        </h1>
        <p className="text-sm text-[var(--muted-foreground)] mt-1">
          Edytuj cennik, branding i ustawienia widoczne w widgecie.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[260px_1fr] gap-6">
        <Card className="h-fit md:sticky md:top-20">
          <CardContent className="p-2">
            <nav className="flex flex-col">
              {SECTIONS.map((s) => (
                <Link
                  key={s.href}
                  href={s.href}
                  className="px-3 py-2 text-sm rounded-md hover:bg-[var(--secondary)] transition-colors"
                >
                  {s.label}
                </Link>
              ))}
            </nav>
          </CardContent>
        </Card>

        <div>{children}</div>
      </div>
    </div>
  );
}
