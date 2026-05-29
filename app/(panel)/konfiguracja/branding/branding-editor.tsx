"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { updateBranding } from "./actions";

type Initial = {
  slug: string;
  name: string;
  legalName: string | null;
  nip: string | null;
  city: string | null;
  address: string | null;
  postalCode: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  logoUrl: string | null;
  brandColor: string;
  accentColor: string;
  showRangeWidth: number;
  requirePhoneOnLead: boolean;
};

export function BrandingEditor({ initial }: { initial: Initial }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState({
    name: initial.name,
    legalName: initial.legalName ?? "",
    nip: initial.nip ?? "",
    city: initial.city ?? "",
    address: initial.address ?? "",
    postalCode: initial.postalCode ?? "",
    phone: initial.phone ?? "",
    email: initial.email ?? "",
    website: initial.website ?? "",
    logoUrl: initial.logoUrl ?? "",
    brandColor: initial.brandColor,
    accentColor: initial.accentColor,
    rangePct: String((initial.showRangeWidth * 100).toFixed(0)),
    requirePhoneOnLead: initial.requirePhoneOnLead,
  });

  function submit() {
    startTransition(async () => {
      const res = await updateBranding({
        name: form.name.trim(),
        legalName: form.legalName.trim() || null,
        nip: form.nip.trim() || null,
        city: form.city.trim() || null,
        address: form.address.trim() || null,
        postalCode: form.postalCode.trim() || null,
        phone: form.phone.trim() || null,
        email: form.email.trim() || null,
        website: form.website.trim() || null,
        logoUrl: form.logoUrl.trim() || null,
        brandColor: form.brandColor,
        accentColor: form.accentColor,
        showRangeWidth: Number(form.rangePct) / 100,
        requirePhoneOnLead: form.requirePhoneOnLead,
      });
      if (!res.success) {
        toast.error(res.error);
        return;
      }
      toast.success("Zapisano");
      router.refresh();
    });
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
      <div className="space-y-5">
        <section className="space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
            Dane placówki
          </h3>
          <div className="space-y-2">
            <Label htmlFor="b-name">Nazwa</Label>
            <Input
              id="b-name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="b-legal">Pełna nazwa prawna</Label>
              <Input
                id="b-legal"
                value={form.legalName}
                onChange={(e) =>
                  setForm({ ...form, legalName: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="b-nip">NIP</Label>
              <Input
                id="b-nip"
                value={form.nip}
                onChange={(e) => setForm({ ...form, nip: e.target.value })}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="b-addr">Adres</Label>
            <Input
              id="b-addr"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="b-zip">Kod pocztowy</Label>
              <Input
                id="b-zip"
                value={form.postalCode}
                onChange={(e) =>
                  setForm({ ...form, postalCode: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="b-city">Miasto</Label>
              <Input
                id="b-city"
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="b-phone">Telefon</Label>
              <Input
                id="b-phone"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="b-email">E-mail</Label>
              <Input
                id="b-email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="b-web">Strona WWW</Label>
            <Input
              id="b-web"
              value={form.website}
              placeholder="https://"
              onChange={(e) => setForm({ ...form, website: e.target.value })}
            />
          </div>
        </section>

        <Separator />

        <section className="space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
            Wygląd widgetu
          </h3>
          <div className="space-y-2">
            <Label htmlFor="b-logo">URL logo</Label>
            <Input
              id="b-logo"
              value={form.logoUrl}
              placeholder="https://placówka.pl/logo.png"
              onChange={(e) => setForm({ ...form, logoUrl: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="b-brand">Kolor wiodący</Label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={form.brandColor}
                  onChange={(e) =>
                    setForm({ ...form, brandColor: e.target.value })
                  }
                  className="h-10 w-12 rounded-md border border-[var(--border)] cursor-pointer"
                />
                <Input
                  id="b-brand"
                  value={form.brandColor}
                  onChange={(e) =>
                    setForm({ ...form, brandColor: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="b-accent">Kolor akcentu</Label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={form.accentColor}
                  onChange={(e) =>
                    setForm({ ...form, accentColor: e.target.value })
                  }
                  className="h-10 w-12 rounded-md border border-[var(--border)] cursor-pointer"
                />
                <Input
                  id="b-accent"
                  value={form.accentColor}
                  onChange={(e) =>
                    setForm({ ...form, accentColor: e.target.value })
                  }
                />
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="b-range">
              Szerokość widełek wyceny (±{(Number(form.rangePct) / 2).toFixed(1)}%)
            </Label>
            <Input
              id="b-range"
              type="number"
              min={0}
              max={50}
              step={1}
              value={form.rangePct}
              onChange={(e) => setForm({ ...form, rangePct: e.target.value })}
            />
            <p className="text-xs text-[var(--muted-foreground)]">
              Określa szerokość przedziału cenowego pokazywanego klientowi.
              Domyślnie 10% (czyli ±5% od środka).
            </p>
          </div>
        </section>

        <Separator />

        <section className="space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
            Wymagania formularza kontaktu
          </h3>
          <p className="text-sm text-[var(--muted-foreground)]">
            Aby klient zobaczył wycenę, musi zostawić <strong>e-mail</strong>{" "}
            (zawsze wymagany). Telefon jest zawsze widoczny w formularzu — Ty
            decydujesz, czy ma być obowiązkowy.
          </p>
          <div className="flex items-center justify-between rounded-md border border-[var(--border)] p-3">
            <div>
              <Label htmlFor="b-phone-req" className="cursor-pointer">
                Telefon obowiązkowy
              </Label>
              <p className="text-xs text-[var(--muted-foreground)]">
                Włącz, jeśli numer telefonu jest wymagany do otrzymania wyceny.
              </p>
            </div>
            <Switch
              id="b-phone-req"
              checked={form.requirePhoneOnLead}
              onCheckedChange={(v) =>
                setForm({ ...form, requirePhoneOnLead: v })
              }
            />
          </div>
        </section>

        <Button onClick={submit} disabled={pending}>
          <Save className="h-4 w-4" />
          {pending ? "Zapisuję..." : "Zapisz zmiany"}
        </Button>
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
          Podgląd
        </h3>
        <div
          className="rounded-xl border border-[var(--border)] p-5 shadow-sm bg-white"
          style={
            {
              "--brand": form.brandColor,
              "--brand-accent": form.accentColor,
            } as React.CSSProperties
          }
        >
          <div className="flex items-center gap-3 mb-4">
            {form.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={form.logoUrl}
                alt={form.name}
                className="h-10 w-10 rounded-lg object-cover"
              />
            ) : (
              <div
                className="h-10 w-10 rounded-lg flex items-center justify-center text-white font-bold"
                style={{ backgroundColor: "var(--brand)" }}
              >
                {form.name[0]}
              </div>
            )}
            <div>
              <p className="font-semibold" style={{ color: "var(--brand)" }}>
                {form.name}
              </p>
              <p className="text-xs text-[var(--muted-foreground)]">
                {form.city || "Miasto"}
              </p>
            </div>
          </div>
          <p
            className="text-xs uppercase tracking-wider font-semibold mb-2"
            style={{ color: "var(--brand-accent)" }}
          >
            Wycena pobytu
          </p>
          <button
            type="button"
            className="w-full rounded-md py-2 text-sm font-medium text-white"
            style={{ backgroundColor: "var(--brand)" }}
          >
            Dalej
          </button>
          <button
            type="button"
            className="w-full rounded-md py-2 text-sm font-medium text-white mt-2"
            style={{ backgroundColor: "var(--brand-accent)" }}
          >
            Pokaż wycenę
          </button>
        </div>

        <p className="text-xs text-[var(--muted-foreground)]">
          Widget na żywo: {" "}
          <a
            href={`/w/${initial.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
            style={{ color: "var(--accent)" }}
          >
            /w/{initial.slug}
          </a>
        </p>
      </div>
    </div>
  );
}
