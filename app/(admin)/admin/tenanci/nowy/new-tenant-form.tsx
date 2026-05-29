"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createTenant } from "../actions";

function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/ł/g, "l")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

export function NewTenantForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [slugManual, setSlugManual] = useState(false);
  const [form, setForm] = useState({
    name: "",
    slug: "",
    city: "",
    contactEmail: "",
    ownerName: "",
    ownerEmail: "",
    ownerPassword: "",
    plan: "PRO" as "TRIAL" | "STARTER" | "PRO" | "ENTERPRISE",
    seedDefaults: true,
  });

  function onNameChange(name: string) {
    setForm((f) => ({
      ...f,
      name,
      slug: slugManual ? f.slug : slugify(name),
    }));
  }

  function submit() {
    startTransition(async () => {
      const res = await createTenant(form);
      if (!res.success) {
        toast.error(res.error);
        return;
      }
      toast.success("Tenant utworzony");
      if (res.data) {
        router.push(`/admin/tenanci/${res.data.id}`);
      } else {
        router.push("/admin/tenanci");
      }
      router.refresh();
    });
  }

  const valid =
    form.name.trim().length >= 2 &&
    form.slug.trim().length >= 2 &&
    form.contactEmail.includes("@") &&
    form.ownerName.trim().length >= 2 &&
    form.ownerEmail.includes("@") &&
    form.ownerPassword.length >= 8;

  return (
    <div className="space-y-5 max-w-2xl">
      <section className="space-y-3">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
          Placówka
        </h3>
        <div className="space-y-2">
          <Label htmlFor="t-name">Nazwa placówki</Label>
          <Input
            id="t-name"
            value={form.name}
            placeholder="Dom Seniora Słoneczna Polana"
            onChange={(e) => onNameChange(e.target.value)}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="t-slug">Slug (URL widgetu)</Label>
            <div className="flex gap-2 items-center">
              <span className="text-sm text-[var(--muted-foreground)]">/w/</span>
              <Input
                id="t-slug"
                value={form.slug}
                onChange={(e) => {
                  setSlugManual(true);
                  setForm({ ...form, slug: slugify(e.target.value) });
                }}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="t-city">Miasto</Label>
            <Input
              id="t-city"
              value={form.city}
              onChange={(e) => setForm({ ...form, city: e.target.value })}
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="t-email">E-mail kontaktowy placówki</Label>
          <Input
            id="t-email"
            type="email"
            value={form.contactEmail}
            onChange={(e) => setForm({ ...form, contactEmail: e.target.value })}
          />
        </div>
      </section>

      <Separator />

      <section className="space-y-3">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
          Konto OWNER-a
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="o-name">Imię i nazwisko</Label>
            <Input
              id="o-name"
              value={form.ownerName}
              onChange={(e) => setForm({ ...form, ownerName: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="o-email">E-mail</Label>
            <Input
              id="o-email"
              type="email"
              value={form.ownerEmail}
              onChange={(e) => setForm({ ...form, ownerEmail: e.target.value })}
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="o-pass">Hasło startowe (min. 8 znaków)</Label>
          <Input
            id="o-pass"
            type="text"
            value={form.ownerPassword}
            onChange={(e) =>
              setForm({ ...form, ownerPassword: e.target.value })
            }
          />
          <p className="text-xs text-[var(--muted-foreground)]">
            Przekaż OWNER-owi bezpiecznym kanałem. Może je zmienić w panelu.
          </p>
        </div>
      </section>

      <Separator />

      <section className="space-y-3">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
          Subskrypcja
        </h3>
        <div className="space-y-2">
          <Label htmlFor="t-plan">Plan startowy</Label>
          <Select
            value={form.plan}
            onValueChange={(v) =>
              setForm({ ...form, plan: v as typeof form.plan })
            }
          >
            <SelectTrigger id="t-plan">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="TRIAL">Trial (14 dni)</SelectItem>
              <SelectItem value="STARTER">Starter (199 zł / mies.)</SelectItem>
              <SelectItem value="PRO">PRO (499 zł / mies.)</SelectItem>
              <SelectItem value="ENTERPRISE">Enterprise (1499 zł / mies.)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center justify-between rounded-md border border-[var(--border)] p-3">
          <div>
            <Label htmlFor="seed" className="cursor-pointer">
              Wstaw startowy cennik
            </Label>
            <p className="text-xs text-[var(--muted-foreground)]">
              3 pokoje, 5 progów Barthela, 9 modyfikatorów, 6 usług, 4 rabaty
              (do edycji przez OWNER-a)
            </p>
          </div>
          <Switch
            id="seed"
            checked={form.seedDefaults}
            onCheckedChange={(v) => setForm({ ...form, seedDefaults: v })}
          />
        </div>
      </section>

      <Button onClick={submit} disabled={pending || !valid}>
        <Save className="h-4 w-4" />
        {pending ? "Tworzę tenanta..." : "Utwórz tenanta"}
      </Button>
    </div>
  );
}
