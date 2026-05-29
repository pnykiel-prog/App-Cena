"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatPLN } from "@/lib/utils";
import { upsertAddon, deleteAddon, toggleAddonActive } from "./actions";

type Addon = {
  id: string;
  code: string;
  label: string;
  description: string | null;
  unit: "PER_MONTH" | "PER_DAY" | "PER_HOUR" | "PER_VISIT";
  unitPrice: number;
  defaultMonthly: number | null;
  sortOrder: number;
  isActive: boolean;
};

const UNIT_LABEL: Record<Addon["unit"], string> = {
  PER_MONTH: "miesiąc (ryczałt)",
  PER_DAY: "doba",
  PER_HOUR: "godzina",
  PER_VISIT: "zabieg / wizyta",
};

const UNIT_SHORT: Record<Addon["unit"], string> = {
  PER_MONTH: "mies.",
  PER_DAY: "doba",
  PER_HOUR: "godz.",
  PER_VISIT: "zabieg",
};

type FormState = {
  code: string;
  label: string;
  description: string;
  unit: Addon["unit"];
  unitPrice: string;
  defaultMonthly: string;
  sortOrder: string;
  isActive: boolean;
};

const EMPTY: FormState = {
  code: "",
  label: "",
  description: "",
  unit: "PER_VISIT",
  unitPrice: "0",
  defaultMonthly: "",
  sortOrder: "0",
  isActive: true,
};

export function AddonsManager({ initialItems }: { initialItems: Addon[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Addon | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [pending, startTransition] = useTransition();

  function openNew() {
    setEditing(null);
    setForm({ ...EMPTY, sortOrder: String(initialItems.length + 1) });
    setOpen(true);
  }

  function openEdit(a: Addon) {
    setEditing(a);
    setForm({
      code: a.code,
      label: a.label,
      description: a.description ?? "",
      unit: a.unit,
      unitPrice: String(a.unitPrice),
      defaultMonthly: a.defaultMonthly !== null ? String(a.defaultMonthly) : "",
      sortOrder: String(a.sortOrder),
      isActive: a.isActive,
    });
    setOpen(true);
  }

  function submit() {
    startTransition(async () => {
      const dm = form.defaultMonthly.trim();
      const res = await upsertAddon(editing?.id ?? null, {
        code: form.code.trim().toUpperCase(),
        label: form.label.trim(),
        description: form.description.trim() || null,
        unit: form.unit,
        unitPrice: Number(form.unitPrice),
        defaultMonthly: dm === "" ? null : Number(dm),
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

  function handleDelete(a: Addon) {
    if (!confirm(`Usunąć usługę „${a.label}"?`)) return;
    startTransition(async () => {
      const res = await deleteAddon(a.id);
      if (!res.success) toast.error(res.error);
      else {
        toast.success("Usunięto");
        router.refresh();
      }
    });
  }

  function handleToggle(a: Addon) {
    startTransition(async () => {
      const res = await toggleAddonActive(a.id);
      if (!res.success) toast.error(res.error);
      else router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={openNew}>
          <Plus className="h-4 w-4" />
          Dodaj usługę
        </Button>
      </div>

      {initialItems.length === 0 ? (
        <p className="text-sm text-[var(--muted-foreground)] text-center py-8">
          Brak usług dodatkowych.
        </p>
      ) : (
        <ul className="divide-y divide-[var(--border)]">
          {initialItems.map((a) => (
            <li
              key={a.id}
              className="py-3 flex items-center justify-between gap-3"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2 flex-wrap">
                  <p className="font-medium text-sm">{a.label}</p>
                  <code className="text-[10px] font-mono text-[var(--muted-foreground)]">
                    {a.code}
                  </code>
                  <Badge variant="muted">{UNIT_LABEL[a.unit]}</Badge>
                  {!a.isActive && <Badge variant="warning">Nieaktywny</Badge>}
                </div>
                {a.description ? (
                  <p className="text-xs text-[var(--muted-foreground)] mt-1 line-clamp-1">
                    {a.description}
                  </p>
                ) : null}
                {a.defaultMonthly !== null && a.unit !== "PER_MONTH" ? (
                  <p className="text-xs text-[var(--muted-foreground)] mt-1">
                    Sugerowana liczba w mies.: {a.defaultMonthly}
                  </p>
                ) : null}
              </div>
              <div className="text-right">
                <p className="font-mono font-semibold text-[var(--primary)]">
                  {formatPLN(a.unitPrice)}
                </p>
                <p className="text-xs text-[var(--muted-foreground)]">
                  / {UNIT_SHORT[a.unit]}
                </p>
              </div>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleToggle(a)}
                  disabled={pending}
                >
                  {a.isActive ? (
                    <Eye className="h-4 w-4" />
                  ) : (
                    <EyeOff className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => openEdit(a)}
                  disabled={pending}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDelete(a)}
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
              {editing ? "Edytuj usługę" : "Nowa usługa dodatkowa"}
            </DialogTitle>
            <DialogDescription>
              Wybierz sposób rozliczenia: ryczałt miesięczny lub za jednostkę
              (zabieg/godz./dobę). Dla jednostkowych podaj sugerowaną liczbę w mies.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="ad-code">Kod</Label>
                <Input
                  id="ad-code"
                  value={form.code}
                  placeholder="PHYSIO_VISIT"
                  onChange={(e) =>
                    setForm({ ...form, code: e.target.value.toUpperCase() })
                  }
                  disabled={!!editing}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ad-unit">Jednostka rozliczenia</Label>
                <Select
                  value={form.unit}
                  onValueChange={(v) =>
                    setForm({ ...form, unit: v as Addon["unit"] })
                  }
                >
                  <SelectTrigger id="ad-unit">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PER_MONTH">Miesięczny ryczałt</SelectItem>
                    <SelectItem value="PER_VISIT">Za zabieg / wizytę</SelectItem>
                    <SelectItem value="PER_HOUR">Za godzinę</SelectItem>
                    <SelectItem value="PER_DAY">Za dobę</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="ad-label">Nazwa</Label>
              <Input
                id="ad-label"
                value={form.label}
                placeholder="np. Fizjoterapia indywidualna"
                onChange={(e) => setForm({ ...form, label: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="ad-desc">Opis (opcjonalnie)</Label>
              <Textarea
                id="ad-desc"
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label htmlFor="ad-price">Cena jedn. (PLN)</Label>
                <Input
                  id="ad-price"
                  type="number"
                  min={0}
                  step={10}
                  value={form.unitPrice}
                  onChange={(e) =>
                    setForm({ ...form, unitPrice: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ad-default">Sugerowana liczba / mies.</Label>
                <Input
                  id="ad-default"
                  type="number"
                  min={0}
                  value={form.defaultMonthly}
                  disabled={form.unit === "PER_MONTH"}
                  onChange={(e) =>
                    setForm({ ...form, defaultMonthly: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ad-order">Kolejność</Label>
                <Input
                  id="ad-order"
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
              <Label htmlFor="ad-active" className="cursor-pointer">
                Aktywna (widoczna w widgecie)
              </Label>
              <Switch
                id="ad-active"
                checked={form.isActive}
                onCheckedChange={(v) => setForm({ ...form, isActive: v })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
              Anuluj
            </Button>
            <Button
              onClick={submit}
              disabled={
                pending || !form.label.trim() || !form.code.trim()
              }
            >
              {pending ? "Zapisuję..." : editing ? "Zapisz" : "Dodaj"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
