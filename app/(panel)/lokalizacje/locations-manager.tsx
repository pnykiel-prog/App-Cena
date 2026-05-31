"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, Eye, EyeOff, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { upsertLocation, deleteLocation, toggleLocationActive } from "./actions";

type Loc = {
  id: string;
  name: string;
  slug: string;
  city: string | null;
  address: string | null;
  isActive: boolean;
  rooms: number;
  quotes: number;
};

type FormState = { name: string; slug: string; city: string; address: string; isActive: boolean };
const EMPTY: FormState = { name: "", slug: "", city: "", address: "", isActive: true };

export function LocationsManager({
  initialItems,
  widgetBase,
}: {
  initialItems: Loc[];
  widgetBase: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Loc | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [pending, startTransition] = useTransition();

  function openNew() {
    setEditing(null);
    setForm(EMPTY);
    setOpen(true);
  }
  function openEdit(l: Loc) {
    setEditing(l);
    setForm({
      name: l.name,
      slug: l.slug,
      city: l.city ?? "",
      address: l.address ?? "",
      isActive: l.isActive,
    });
    setOpen(true);
  }

  function submit() {
    startTransition(async () => {
      const res = await upsertLocation(editing?.id ?? null, {
        name: form.name.trim(),
        slug: form.slug.trim().toLowerCase(),
        city: form.city.trim() || null,
        address: form.address.trim() || null,
        isActive: form.isActive,
      });
      if (!res.success) {
        toast.error(res.error);
        return;
      }
      toast.success(editing ? "Zaktualizowano" : "Dodano lokalizację");
      setOpen(false);
      router.refresh();
    });
  }

  function handleDelete(l: Loc) {
    if (!confirm(`Usunąć lokalizację „${l.name}”? Jej pokoje również zostaną usunięte.`))
      return;
    startTransition(async () => {
      const res = await deleteLocation(l.id);
      if (!res.success) toast.error(res.error);
      else {
        toast.success("Usunięto");
        router.refresh();
      }
    });
  }

  function handleToggle(l: Loc) {
    startTransition(async () => {
      const res = await toggleLocationActive(l.id);
      if (!res.success) toast.error(res.error);
      else router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={openNew}>
          <Plus className="h-4 w-4" />
          Dodaj lokalizację
        </Button>
      </div>

      {initialItems.length === 0 ? (
        <p className="text-sm text-[var(--muted-foreground)] text-center py-8">
          Brak lokalizacji. Dodaj pierwszy budynek — otrzyma własny widget i pokoje.
        </p>
      ) : (
        <ul className="divide-y divide-[var(--border)]">
          {initialItems.map((l) => (
            <li key={l.id} className="py-3 flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2 flex-wrap">
                  <p className="font-medium text-sm">{l.name}</p>
                  <code className="text-xs font-mono text-[var(--muted-foreground)]">
                    /w/{l.slug}
                  </code>
                  {!l.isActive && <Badge variant="warning">Nieaktywna</Badge>}
                </div>
                <p className="text-xs text-[var(--muted-foreground)] mt-1">
                  {l.city ? `${l.city} · ` : ""}
                  {l.rooms} {l.rooms === 1 ? "pokój" : "pokoi"} · {l.quotes} leadów
                </p>
              </div>
              <div className="flex gap-1 shrink-0">
                {widgetBase && (
                  <Button variant="ghost" size="icon" asChild>
                    <a href={`${widgetBase}/w/${l.slug}`} target="_blank" rel="noopener noreferrer" title="Otwórz widget">
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </Button>
                )}
                <Button variant="ghost" size="icon" onClick={() => handleToggle(l)} disabled={pending}>
                  {l.isActive ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                </Button>
                <Button variant="ghost" size="icon" onClick={() => openEdit(l)} disabled={pending}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => handleDelete(l)} disabled={pending}>
                  <Trash2 className="h-4 w-4 text-red-600" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edytuj lokalizację" : "Nowa lokalizacja"}</DialogTitle>
            <DialogDescription>
              Slug tworzy adres widgetu <code>/w/&#123;slug&#125;</code> i musi być
              unikalny. Pokoje dla tej lokalizacji dodasz w Konfiguracja → Pokoje.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="lo-name">Nazwa</Label>
                <Input
                  id="lo-name"
                  value={form.name}
                  placeholder="np. Dom Seniora Wiązów"
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lo-slug">Slug (adres widgetu)</Label>
                <Input
                  id="lo-slug"
                  value={form.slug}
                  placeholder="wiazow"
                  onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase() })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="lo-city">Miasto (opcjonalnie)</Label>
                <Input
                  id="lo-city"
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lo-addr">Adres (opcjonalnie)</Label>
                <Input
                  id="lo-addr"
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                />
              </div>
            </div>
            <div className="flex items-center justify-between rounded-md border border-[var(--border)] p-3">
              <Label htmlFor="lo-active" className="cursor-pointer">
                Aktywna (widget dostępny)
              </Label>
              <Switch
                id="lo-active"
                checked={form.isActive}
                onCheckedChange={(v) => setForm({ ...form, isActive: v })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
              Anuluj
            </Button>
            <Button onClick={submit} disabled={pending || !form.name.trim() || !form.slug.trim()}>
              {pending ? "Zapisuję..." : editing ? "Zapisz" : "Dodaj"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
