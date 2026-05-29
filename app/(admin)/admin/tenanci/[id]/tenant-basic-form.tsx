"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Save, PauseCircle, PlayCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateTenantBasic, setTenantStatus } from "../actions";

type Initial = {
  name: string;
  city: string;
  email: string;
  phone: string;
  status: "TRIAL" | "ACTIVE" | "SUSPENDED" | "CANCELLED";
};

export function TenantBasicForm({
  tenantId,
  initial,
}: {
  tenantId: string;
  initial: Initial;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState(initial);

  function save() {
    startTransition(async () => {
      const res = await updateTenantBasic(tenantId, {
        name: form.name.trim(),
        city: form.city.trim() || null,
        email: form.email.trim() || null,
        phone: form.phone.trim() || null,
      });
      if (!res.success) {
        toast.error(res.error);
        return;
      }
      toast.success("Zapisano");
      router.refresh();
    });
  }

  function changeStatus(next: Initial["status"]) {
    if (next === form.status) return;
    if (!confirm(`Zmienić status na ${next}?`)) return;
    startTransition(async () => {
      const res = await setTenantStatus(tenantId, next);
      if (!res.success) {
        toast.error(res.error);
        return;
      }
      toast.success(`Status: ${next}`);
      setForm({ ...form, status: next });
      router.refresh();
    });
  }

  return (
    <div className="space-y-4 max-w-xl">
      <div className="space-y-2">
        <Label htmlFor="bn">Nazwa</Label>
        <Input
          id="bn"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="bc">Miasto</Label>
          <Input
            id="bc"
            value={form.city}
            onChange={(e) => setForm({ ...form, city: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="bp">Telefon</Label>
          <Input
            id="bp"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="be">E-mail</Label>
        <Input
          id="be"
          type="email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="bs">Status tenanta</Label>
        <Select
          value={form.status}
          onValueChange={(v) => changeStatus(v as Initial["status"])}
        >
          <SelectTrigger id="bs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="TRIAL">Trial</SelectItem>
            <SelectItem value="ACTIVE">Aktywny</SelectItem>
            <SelectItem value="SUSPENDED">Zawieszony</SelectItem>
            <SelectItem value="CANCELLED">Anulowany</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-[var(--muted-foreground)]">
          Status SUSPENDED / CANCELLED ukrywa widget /w/[slug] (404).
        </p>
      </div>

      <Button onClick={save} disabled={pending}>
        <Save className="h-4 w-4" />
        {pending ? "Zapisuję..." : "Zapisz dane"}
      </Button>
    </div>
  );
}
