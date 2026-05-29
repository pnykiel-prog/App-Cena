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
import { upsertRoomType, deleteRoomType, toggleRoomActive } from "./actions";

type Room = {
  id: string;
  capacity: "SINGLE" | "DOUBLE" | "TRIPLE";
  label: string;
  description: string | null;
  basePrice: number;
  available: number;
  sortOrder: number;
  isActive: boolean;
  quotesCount: number;
};

const CAPACITY_LABEL: Record<Room["capacity"], string> = {
  SINGLE: "1 osoba",
  DOUBLE: "2 osoby",
  TRIPLE: "3 osoby",
};

type FormState = {
  capacity: Room["capacity"];
  label: string;
  description: string;
  basePrice: string;
  available: string;
  sortOrder: string;
  isActive: boolean;
};

const EMPTY: FormState = {
  capacity: "SINGLE",
  label: "",
  description: "",
  basePrice: "0",
  available: "0",
  sortOrder: "0",
  isActive: true,
};

export function RoomsManager({ initialRooms }: { initialRooms: Room[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Room | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [pending, startTransition] = useTransition();

  function openNew() {
    setEditing(null);
    setForm({ ...EMPTY, sortOrder: String(initialRooms.length + 1) });
    setOpen(true);
  }

  function openEdit(r: Room) {
    setEditing(r);
    setForm({
      capacity: r.capacity,
      label: r.label,
      description: r.description ?? "",
      basePrice: String(r.basePrice),
      available: String(r.available),
      sortOrder: String(r.sortOrder),
      isActive: r.isActive,
    });
    setOpen(true);
  }

  function submit() {
    startTransition(async () => {
      const res = await upsertRoomType(editing?.id ?? null, {
        capacity: form.capacity,
        label: form.label.trim(),
        description: form.description.trim() || null,
        basePrice: Number(form.basePrice),
        available: Number(form.available),
        sortOrder: Number(form.sortOrder),
        isActive: form.isActive,
      });
      if (!res.success) {
        toast.error(res.error);
        return;
      }
      toast.success(editing ? "Pokój zaktualizowany" : "Pokój dodany");
      setOpen(false);
      router.refresh();
    });
  }

  function handleDelete(r: Room) {
    if (
      !confirm(
        r.quotesCount > 0
          ? `Pokój ma ${r.quotesCount} powiązanych wycen — zostanie dezaktywowany zamiast usunięty. Kontynuować?`
          : `Usunąć pokój „${r.label}"?`,
      )
    )
      return;
    startTransition(async () => {
      const res = await deleteRoomType(r.id);
      if (!res.success) {
        toast.error(res.error);
        return;
      }
      toast.success(r.quotesCount > 0 ? "Pokój dezaktywowany" : "Pokój usunięty");
      router.refresh();
    });
  }

  function handleToggle(r: Room) {
    startTransition(async () => {
      const res = await toggleRoomActive(r.id);
      if (!res.success) {
        toast.error(res.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={openNew}>
          <Plus className="h-4 w-4" />
          Dodaj pokój
        </Button>
      </div>

      {initialRooms.length === 0 ? (
        <p className="text-sm text-[var(--muted-foreground)] text-center py-8">
          Brak pokoi w cenniku. Dodaj pierwszy.
        </p>
      ) : (
        <ul className="divide-y divide-[var(--border)]">
          {initialRooms.map((r) => (
            <li
              key={r.id}
              className="py-3 flex items-center justify-between gap-3"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2 flex-wrap">
                  <p className="font-medium text-sm">{r.label}</p>
                  <Badge variant="muted">{CAPACITY_LABEL[r.capacity]}</Badge>
                  {!r.isActive && <Badge variant="warning">Nieaktywny</Badge>}
                </div>
                {r.description ? (
                  <p className="text-xs text-[var(--muted-foreground)] mt-1 line-clamp-1">
                    {r.description}
                  </p>
                ) : null}
                <p className="text-xs text-[var(--muted-foreground)] mt-1">
                  {r.available} miejsc · pozycja {r.sortOrder}
                </p>
              </div>
              <div className="text-right">
                <p className="font-mono font-semibold text-[var(--primary)]">
                  {formatPLN(r.basePrice)}
                </p>
                <p className="text-xs text-[var(--muted-foreground)]">/ mies.</p>
              </div>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleToggle(r)}
                  title={r.isActive ? "Wyłącz" : "Włącz"}
                  disabled={pending}
                >
                  {r.isActive ? (
                    <Eye className="h-4 w-4" />
                  ) : (
                    <EyeOff className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => openEdit(r)}
                  disabled={pending}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDelete(r)}
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
              {editing ? "Edytuj pokój" : "Nowy typ pokoju"}
            </DialogTitle>
            <DialogDescription>
              Cena bazowa to miesięczny koszt obejmujący pobyt, wyżywienie i
              podstawową opiekę.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="capacity">Wielkość</Label>
                <Select
                  value={form.capacity}
                  onValueChange={(v) =>
                    setForm({ ...form, capacity: v as Room["capacity"] })
                  }
                >
                  <SelectTrigger id="capacity">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SINGLE">1 osoba</SelectItem>
                    <SelectItem value="DOUBLE">2 osoby</SelectItem>
                    <SelectItem value="TRIPLE">3 osoby</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="sortOrder">Kolejność</Label>
                <Input
                  id="sortOrder"
                  type="number"
                  min={0}
                  value={form.sortOrder}
                  onChange={(e) =>
                    setForm({ ...form, sortOrder: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="label">Nazwa</Label>
              <Input
                id="label"
                value={form.label}
                placeholder="np. Pokój 1-osobowy z balkonem"
                onChange={(e) => setForm({ ...form, label: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Opis (opcjonalnie)</Label>
              <Textarea
                id="description"
                value={form.description}
                placeholder="Krótki opis widoczny w widgecie"
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="basePrice">Cena bazowa (PLN / mies.)</Label>
                <Input
                  id="basePrice"
                  type="number"
                  min={0}
                  step={100}
                  value={form.basePrice}
                  onChange={(e) =>
                    setForm({ ...form, basePrice: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="available">Dostępnych miejsc</Label>
                <Input
                  id="available"
                  type="number"
                  min={0}
                  value={form.available}
                  onChange={(e) =>
                    setForm({ ...form, available: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="flex items-center justify-between rounded-md border border-[var(--border)] p-3">
              <div>
                <Label htmlFor="isActive" className="cursor-pointer">
                  Aktywny
                </Label>
                <p className="text-xs text-[var(--muted-foreground)]">
                  Widoczny w widgecie
                </p>
              </div>
              <Switch
                id="isActive"
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
              {pending ? "Zapisuję..." : editing ? "Zapisz zmiany" : "Dodaj pokój"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
