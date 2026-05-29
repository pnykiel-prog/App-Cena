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
import { upsertDiscount, deleteDiscount, toggleDiscountActive } from "./actions";

type Discount = {
  id: string;
  label: string;
  minMonths: number;
  discountPct: number;
  sortOrder: number;
  isActive: boolean;
};

type FormState = {
  label: string;
  minMonths: string;
  discountPctPercent: string; // user input as percent (0-50)
  sortOrder: string;
  isActive: boolean;
};

const EMPTY: FormState = {
  label: "",
  minMonths: "12",
  discountPctPercent: "5",
  sortOrder: "0",
  isActive: true,
};

export function DiscountsManager({
  initialItems,
}: {
  initialItems: Discount[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Discount | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [pending, startTransition] = useTransition();

  function openNew() {
    setEditing(null);
    setForm({ ...EMPTY, sortOrder: String(initialItems.length + 1) });
    setOpen(true);
  }

  function openEdit(d: Discount) {
    setEditing(d);
    setForm({
      label: d.label,
      minMonths: String(d.minMonths),
      discountPctPercent: String((d.discountPct * 100).toFixed(1)),
      sortOrder: String(d.sortOrder),
      isActive: d.isActive,
    });
    setOpen(true);
  }

  function submit() {
    startTransition(async () => {
      const res = await upsertDiscount(editing?.id ?? null, {
        label: form.label.trim(),
        minMonths: Number(form.minMonths),
        discountPct: Number(form.discountPctPercent) / 100,
        sortOrder: Number(form.sortOrder),
        isActive: form.isActive,
      });
      if (!res.success) {
        toast.error(res.error);
        return;
      }
      toast.success(editing ? "Zaktualizowano" : "Dodano");
      setOpen(false);
      router.refresh();
    });
  }

  function handleDelete(d: Discount) {
    if (!confirm(`Usunąć rabat „${d.label}"?`)) return;
    startTransition(async () => {
      const res = await deleteDiscount(d.id);
      if (!res.success) toast.error(res.error);
      else {
        toast.success("Usunięto");
        router.refresh();
      }
    });
  }

  function handleToggle(d: Discount) {
    startTransition(async () => {
      const res = await toggleDiscountActive(d.id);
      if (!res.success) toast.error(res.error);
      else router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={openNew}>
          <Plus className="h-4 w-4" />
          Dodaj rabat
        </Button>
      </div>

      {initialItems.length === 0 ? (
        <p className="text-sm text-[var(--muted-foreground)] text-center py-8">
          Brak rabatów.
        </p>
      ) : (
        <ul className="divide-y divide-[var(--border)]">
          {initialItems.map((d) => (
            <li
              key={d.id}
              className="py-3 flex items-center justify-between gap-3"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2 flex-wrap">
                  <p className="font-medium text-sm">{d.label}</p>
                  <Badge variant="muted">od {d.minMonths} mies.</Badge>
                  {!d.isActive && <Badge variant="warning">Nieaktywny</Badge>}
                </div>
              </div>
              <div className="text-right">
                <p className="font-mono font-semibold text-emerald-700">
                  − {(d.discountPct * 100).toFixed(0)}%
                </p>
              </div>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleToggle(d)}
                  disabled={pending}
                >
                  {d.isActive ? (
                    <Eye className="h-4 w-4" />
                  ) : (
                    <EyeOff className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => openEdit(d)}
                  disabled={pending}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDelete(d)}
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
              {editing ? "Edytuj rabat" : "Nowy rabat kontraktowy"}
            </DialogTitle>
            <DialogDescription>
              Rabat naliczany od sumy: pokój + opieka + modyfikatory + usługi.
              Maksymalnie 50%.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="d-label">Nazwa</Label>
              <Input
                id="d-label"
                value={form.label}
                placeholder="np. Umowa na 24 miesiące"
                onChange={(e) => setForm({ ...form, label: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label htmlFor="d-months">Min. mies.</Label>
                <Input
                  id="d-months"
                  type="number"
                  min={1}
                  value={form.minMonths}
                  onChange={(e) => setForm({ ...form, minMonths: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="d-pct">Rabat (%)</Label>
                <Input
                  id="d-pct"
                  type="number"
                  min={0}
                  max={50}
                  step={0.5}
                  value={form.discountPctPercent}
                  onChange={(e) =>
                    setForm({ ...form, discountPctPercent: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="d-order">Kolejność</Label>
                <Input
                  id="d-order"
                  type="number"
                  min={0}
                  value={form.sortOrder}
                  onChange={(e) =>
                    setForm({ ...form, sortOrder: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="flex items-center justify-between rounded-md border border-[var(--border)] p-3">
              <Label htmlFor="d-active" className="cursor-pointer">
                Aktywny
              </Label>
              <Switch
                id="d-active"
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
