"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, Eye, EyeOff, Copy } from "lucide-react";
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
import { upsertWebhook, deleteWebhook, toggleWebhookActive } from "./actions";

type Webhook = {
  id: string;
  url: string;
  description: string | null;
  isActive: boolean;
  secret: string;
  lastStatus: number | null;
  lastFiredAt: string | null;
};

type FormState = { url: string; description: string; isActive: boolean };
const EMPTY: FormState = { url: "", description: "", isActive: true };

export function WebhooksManager({ initialItems }: { initialItems: Webhook[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Webhook | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [pending, startTransition] = useTransition();
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});

  function openNew() {
    setEditing(null);
    setForm(EMPTY);
    setOpen(true);
  }

  function openEdit(w: Webhook) {
    setEditing(w);
    setForm({ url: w.url, description: w.description ?? "", isActive: w.isActive });
    setOpen(true);
  }

  function submit() {
    startTransition(async () => {
      const res = await upsertWebhook(editing?.id ?? null, {
        url: form.url.trim(),
        description: form.description.trim() || null,
        isActive: form.isActive,
      });
      if (!res.success) {
        toast.error(res.error);
        return;
      }
      toast.success(editing ? "Zaktualizowano" : "Dodano webhook");
      setOpen(false);
      router.refresh();
    });
  }

  function handleDelete(w: Webhook) {
    if (!confirm(`Usunąć webhook ${w.url}?`)) return;
    startTransition(async () => {
      const res = await deleteWebhook(w.id);
      if (!res.success) toast.error(res.error);
      else {
        toast.success("Usunięto");
        router.refresh();
      }
    });
  }

  function handleToggle(w: Webhook) {
    startTransition(async () => {
      const res = await toggleWebhookActive(w.id);
      if (!res.success) toast.error(res.error);
      else router.refresh();
    });
  }

  function copySecret(secret: string) {
    navigator.clipboard.writeText(secret);
    toast.success("Skopiowano sekret");
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={openNew}>
          <Plus className="h-4 w-4" />
          Dodaj webhook
        </Button>
      </div>

      {initialItems.length === 0 ? (
        <p className="text-sm text-[var(--muted-foreground)] text-center py-8">
          Brak skonfigurowanych webhooków.
        </p>
      ) : (
        <ul className="divide-y divide-[var(--border)]">
          {initialItems.map((w) => (
            <li key={w.id} className="py-3 flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2 flex-wrap">
                  <code className="text-sm font-mono break-all">{w.url}</code>
                  {!w.isActive && <Badge variant="warning">Nieaktywny</Badge>}
                  {w.lastStatus !== null && (
                    <Badge
                      variant={
                        w.lastStatus >= 200 && w.lastStatus < 300
                          ? "success"
                          : "danger"
                      }
                    >
                      HTTP {w.lastStatus}
                    </Badge>
                  )}
                </div>
                {w.description && (
                  <p className="text-xs text-[var(--muted-foreground)] mt-1">
                    {w.description}
                  </p>
                )}
                <div className="mt-1 flex items-center gap-2 text-xs text-[var(--muted-foreground)]">
                  <span className="font-mono">
                    {revealed[w.id] ? w.secret : "whsec_••••••••••••"}
                  </span>
                  <button
                    type="button"
                    className="hover:text-[var(--primary)]"
                    onClick={() =>
                      setRevealed((r) => ({ ...r, [w.id]: !r[w.id] }))
                    }
                  >
                    {revealed[w.id] ? "ukryj" : "pokaż"}
                  </button>
                  <button
                    type="button"
                    className="hover:text-[var(--primary)] inline-flex items-center gap-0.5"
                    onClick={() => copySecret(w.secret)}
                  >
                    <Copy className="h-3 w-3" /> kopiuj
                  </button>
                  {w.lastFiredAt && (
                    <span>
                      · ostatnio: {new Date(w.lastFiredAt).toLocaleString("pl-PL")}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex gap-1 shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleToggle(w)}
                  disabled={pending}
                >
                  {w.isActive ? (
                    <Eye className="h-4 w-4" />
                  ) : (
                    <EyeOff className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => openEdit(w)}
                  disabled={pending}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDelete(w)}
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
            <DialogTitle>{editing ? "Edytuj webhook" : "Nowy webhook"}</DialogTitle>
            <DialogDescription>
              Podaj URL, na który wyślemy <code>POST</code> po nowym leadzie.
              Sekret HMAC wygenerujemy automatycznie — użyj go do weryfikacji
              nagłówka <code>X-CareQuote-Signature</code>.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="wh-url">URL endpointu</Label>
              <Input
                id="wh-url"
                value={form.url}
                placeholder="https://twoj-system.pl/webhooki/carequote"
                onChange={(e) => setForm({ ...form, url: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="wh-desc">Opis (opcjonalnie)</Label>
              <Input
                id="wh-desc"
                value={form.description}
                placeholder="np. integracja z CRM"
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
            <div className="flex items-center justify-between rounded-md border border-[var(--border)] p-3">
              <Label htmlFor="wh-active" className="cursor-pointer">
                Aktywny
              </Label>
              <Switch
                id="wh-active"
                checked={form.isActive}
                onCheckedChange={(v) => setForm({ ...form, isActive: v })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
              Anuluj
            </Button>
            <Button onClick={submit} disabled={pending || !form.url.trim()}>
              {pending ? "Zapisuję..." : editing ? "Zapisz" : "Dodaj"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
