"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, Eye, EyeOff } from "lucide-react";
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
import { formatPLN } from "@/lib/utils";
import { upsertCareTier, deleteCareTier, toggleCareTierActive } from "./actions";

type Tier = {
  id: string;
  label: string;
  minBarthel: number;
  maxBarthel: number;
  monthlySurcharge: number;
  sortOrder: number;
  isActive: boolean;
};

type FormState = {
  label: string;
  minBarthel: string;
  maxBarthel: string;
  monthlySurcharge: string;
  sortOrder: string;
  isActive: boolean;
};

const EMPTY: FormState = {
  label: "",
  minBarthel: "0",
  maxBarthel: "20",
  monthlySurcharge: "0",
  sortOrder: "0",
  isActive: true,
};

export function TiersManager({ initialTiers }: { initialTiers: Tier[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Tier | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [pending, startTransition] = useTransition();

  function openNew() {
    setEditing(null);
    setForm({ ...EMPTY, sortOrder: String(initialTiers.length + 1) });
    setOpen(true);
  }

  function openEdit(t: Tier) {
    setEditing(t);
    setForm({
      label: t.label,
      minBarthel: String(t.minBarthel),
      maxBarthel: String(t.maxBarthel),
      monthlySurcharge: String(t.monthlySurcharge),
      sortOrder: String(t.sortOrder),
      isActive: t.isActive,
    });
    setOpen(true);
  }

  function submit() {
    startTransition(async () => {
      const res = await upsertCareTier(editing?.id ?? null, {
        label: form.label.trim(),
        minBarthel: Number(form.minBarthel),
        maxBarthel: Number(form.maxBarthel),
        monthlySurcharge: Number(form.monthlySurcharge),
        sortOrder: Number(form.sortOrder),
        isActive: form.isActive,
      });
      if (!res.success) {
        toast.error(res.error);
        return;
      }
      toast.success(editing ? "Próg zaktualizowany" : "Próg dodany");
      setOpen(false);
      router.refresh();
    });
  }

  function handleDelete(t: Tier) {
    if (!confirm(`Usunąć próg „${t.label}"?`)) return;
    startTransition(async () => {
      const res = await deleteCareTier(t.id);
      if (!res.success) {
        toast.error(res.error);
        return;
      }
      toast.success("Próg usunięty");
      router.refresh();
    });
  }

  function handleToggle(t: Tier) {
    startTransition(async () => {
      const res = await toggleCareTierActive(t.id);
      if (!res.success) toast.error(res.error);
      else router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={openNew}>
          <Plus className="h-4 w-4" />
          Dodaj próg
        </Button>
      </div>

      {initialTiers.length === 0 ? (
        <p className="text-sm text-[var(--muted-foreground)] text-center py-8">
          Brak progów. Dodaj pierwszy, aby widget mógł liczyć dopłaty.
        </p>
      ) : (
        <ul className="divide-y divide-[var(--border)]">
          {initialTiers.map((t) => (
            <li key={t.id} className="py-3 flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2 flex-wrap">
                  <p className="font-medium text-sm">{t.label}</p>
                  <Badge variant="muted">
                    Barthel {t.minBarthel}–{t.maxBarthel}
                  </Badge>
                  {!t.isActive && <Badge variant="warning">Nieaktywny</Badge>}
                </div>
              </div>
              <div className="text-right">
                <p className="font-mono font-semibold text-[var(--accent)]">
                  + {formatPLN(t.monthlySurcharge)}
                </p>
                <p className="text-xs text-[var(--muted-foreground)]">/ mies.</p>
              </div>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleToggle(t)}
                  disabled={pending}
                >
                  {t.isActive ? (
                    <Eye className="h-4 w-4" />
                  ) : (
                    <EyeOff className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => openEdit(t)}
                  disabled={pending}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDelete(t)}
                  disabled={pending}
                >
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
            <DialogTitle>
              {editing ? "Edytuj próg" : "Nowy próg opieki"}
            </DialogTitle>
            <DialogDescription>
              Próg mapuje wynik Barthela (0–100) na miesięczną dopłatę. Zakresy
              progów nie mogą się pokrywać.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="tier-label">Nazwa progu</Label>
              <Input
                id="tier-label"
                value={form.label}
                placeholder="np. Pełna niesamodzielność"
                onChange={(e) => setForm({ ...form, label: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="min-b">Barthel od</Label>
                <Input
                  id="min-b"
                  type="number"
                  min={0}
                  max={100}
                  value={form.minBarthel}
                  onChange={(e) => setForm({ ...form, minBarthel: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="max-b">Barthel do</Label>
                <Input
                  id="max-b"
                  type="number"
                  min={0}
                  max={100}
                  value={form.maxBarthel}
                  onChange={(e) => setForm({ ...form, maxBarthel: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="surcharge">Dopłata mies. (PLN)</Label>
                <Input
                  id="surcharge"
                  type="number"
                  min={0}
                  step={100}
                  value={form.monthlySurcharge}
                  onChange={(e) =>
                    setForm({ ...form, monthlySurcharge: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tier-order">Kolejność</Label>
                <Input
                  id="tier-order"
                  type="number"
                  min={0}
                  value={form.sortOrder}
                  onChange={(e) => setForm({ ...form, sortOrder: e.target.value })}
                />
              </div>
            </div>

            <div className="flex items-center justify-between rounded-md border border-[var(--border)] p-3">
              <Label htmlFor="tier-active" className="cursor-pointer">
                Aktywny
              </Label>
              <Switch
                id="tier-active"
                checked={form.isActive}
                onCheckedChange={(v) => setForm({ ...form, isActive: v })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
              Anuluj
            </Button>
            <Button onClick={submit} disabled={pending || !form.label.trim()}>
              {pending ? "Zapisuję..." : editing ? "Zapisz" : "Dodaj"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
