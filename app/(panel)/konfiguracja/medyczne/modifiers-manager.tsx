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
import { upsertModifier, deleteModifier, toggleModifierActive } from "./actions";

type Modifier = {
  id: string;
  code: string;
  label: string;
  kind: "COGNITIVE" | "MEDICAL" | "BEHAVIORAL" | "MOBILITY";
  description: string | null;
  monthlySurcharge: number;
  isToggle: boolean;
  sortOrder: number;
  isActive: boolean;
};

const KIND_LABEL: Record<Modifier["kind"], string> = {
  COGNITIVE: "Poznawcze",
  MEDICAL: "Medyczne",
  BEHAVIORAL: "Behawioralne",
  MOBILITY: "Mobilność",
};

type FormState = {
  code: string;
  label: string;
  kind: Modifier["kind"];
  description: string;
  monthlySurcharge: string;
  isToggle: boolean;
  sortOrder: string;
  isActive: boolean;
};

const EMPTY: FormState = {
  code: "",
  label: "",
  kind: "MEDICAL",
  description: "",
  monthlySurcharge: "0",
  isToggle: true,
  sortOrder: "0",
  isActive: true,
};

export function ModifiersManager({
  initialItems,
}: {
  initialItems: Modifier[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Modifier | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [pending, startTransition] = useTransition();

  function openNew() {
    setEditing(null);
    setForm({ ...EMPTY, sortOrder: String(initialItems.length + 1) });
    setOpen(true);
  }

  function openEdit(m: Modifier) {
    setEditing(m);
    setForm({
      code: m.code,
      label: m.label,
      kind: m.kind,
      description: m.description ?? "",
      monthlySurcharge: String(m.monthlySurcharge),
      isToggle: m.isToggle,
      sortOrder: String(m.sortOrder),
      isActive: m.isActive,
    });
    setOpen(true);
  }

  function submit() {
    startTransition(async () => {
      const res = await upsertModifier(editing?.id ?? null, {
        code: form.code.trim().toUpperCase(),
        label: form.label.trim(),
        kind: form.kind,
        description: form.description.trim() || null,
        monthlySurcharge: Number(form.monthlySurcharge),
        isToggle: form.isToggle,
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

  function handleDelete(m: Modifier) {
    if (!confirm(`Usunąć „${m.label}"?`)) return;
    startTransition(async () => {
      const res = await deleteModifier(m.id);
      if (!res.success) toast.error(res.error);
      else {
        toast.success("Usunięto");
        router.refresh();
      }
    });
  }

  function handleToggle(m: Modifier) {
    startTransition(async () => {
      const res = await toggleModifierActive(m.id);
      if (!res.success) toast.error(res.error);
      else router.refresh();
    });
  }

  // Grupuj po kind
  const groups = initialItems.reduce<Record<string, Modifier[]>>((acc, m) => {
    (acc[m.kind] ??= []).push(m);
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={openNew}>
          <Plus className="h-4 w-4" />
          Dodaj modyfikator
        </Button>
      </div>

      {initialItems.length === 0 ? (
        <p className="text-sm text-[var(--muted-foreground)] text-center py-8">
          Brak modyfikatorów.
        </p>
      ) : (
        <div className="space-y-4">
          {Object.entries(groups).map(([kind, items]) => (
            <div key={kind} className="space-y-1">
              <p className="text-xs uppercase tracking-wider font-semibold text-[var(--muted-foreground)]">
                {KIND_LABEL[kind as Modifier["kind"]] ?? kind}
              </p>
              <ul className="divide-y divide-[var(--border)]">
                {items.map((m) => (
                  <li
                    key={m.id}
                    className="py-3 flex items-center justify-between gap-3"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2 flex-wrap">
                        <p className="font-medium text-sm">{m.label}</p>
                        <code className="text-[10px] font-mono text-[var(--muted-foreground)]">
                          {m.code}
                        </code>
                        {!m.isActive && (
                          <Badge variant="warning">Nieaktywny</Badge>
                        )}
                      </div>
                      {m.description ? (
                        <p className="text-xs text-[var(--muted-foreground)] mt-1 line-clamp-1">
                          {m.description}
                        </p>
                      ) : null}
                    </div>
                    <div className="text-right">
                      <p className="font-mono font-semibold text-[var(--primary)]">
                        + {formatPLN(m.monthlySurcharge)}
                      </p>
                      <p className="text-xs text-[var(--muted-foreground)]">/ mies.</p>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleToggle(m)}
                        disabled={pending}
                      >
                        {m.isActive ? (
                          <Eye className="h-4 w-4" />
                        ) : (
                          <EyeOff className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEdit(m)}
                        disabled={pending}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(m)}
                        disabled={pending}
                      >
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editing ? "Edytuj modyfikator" : "Nowy modyfikator medyczny"}
            </DialogTitle>
            <DialogDescription>
              Kod identyfikuje modyfikator w API (np. DEMENTIA). Powinien być
              krótki i jednoznaczny.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="mod-code">Kod</Label>
                <Input
                  id="mod-code"
                  value={form.code}
                  placeholder="DEMENTIA"
                  onChange={(e) =>
                    setForm({ ...form, code: e.target.value.toUpperCase() })
                  }
                  disabled={!!editing}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="mod-kind">Kategoria</Label>
                <Select
                  value={form.kind}
                  onValueChange={(v) =>
                    setForm({ ...form, kind: v as Modifier["kind"] })
                  }
                >
                  <SelectTrigger id="mod-kind">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="COGNITIVE">Poznawcze</SelectItem>
                    <SelectItem value="MEDICAL">Medyczne</SelectItem>
                    <SelectItem value="BEHAVIORAL">Behawioralne</SelectItem>
                    <SelectItem value="MOBILITY">Mobilność</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="mod-label">Nazwa</Label>
              <Input
                id="mod-label"
                value={form.label}
                placeholder="np. Otępienie / choroba Alzheimera"
                onChange={(e) => setForm({ ...form, label: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="mod-desc">Opis (opcjonalnie)</Label>
              <Textarea
                id="mod-desc"
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="mod-surch">Dopłata mies. (PLN)</Label>
                <Input
                  id="mod-surch"
                  type="number"
                  min={0}
                  step={50}
                  value={form.monthlySurcharge}
                  onChange={(e) =>
                    setForm({ ...form, monthlySurcharge: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="mod-order">Kolejność</Label>
                <Input
                  id="mod-order"
                  type="number"
                  min={0}
                  value={form.sortOrder}
                  onChange={(e) => setForm({ ...form, sortOrder: e.target.value })}
                />
              </div>
            </div>

            <div className="flex items-center justify-between rounded-md border border-[var(--border)] p-3">
              <Label htmlFor="mod-active" className="cursor-pointer">
                Aktywny (widoczny w widgecie)
              </Label>
              <Switch
                id="mod-active"
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
