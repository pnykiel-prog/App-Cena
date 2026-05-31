"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Eye, EyeOff, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { createApiKey, toggleApiKey, deleteApiKey } from "./actions";

type ApiKey = {
  id: string;
  name: string;
  prefix: string;
  isActive: boolean;
  lastUsedAt: string | null;
  createdAt: string;
};

export function ApiKeysManager({ initialItems }: { initialItems: ApiKey[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [pending, startTransition] = useTransition();
  // Pełny klucz pokazany jednorazowo po utworzeniu.
  const [createdKey, setCreatedKey] = useState<string | null>(null);

  function submit() {
    startTransition(async () => {
      const res = await createApiKey({ name: name.trim() });
      if (!res.success) {
        toast.error(res.error);
        return;
      }
      setCreatedKey(res.data!.key);
      setName("");
      router.refresh();
    });
  }

  function handleToggle(k: ApiKey) {
    startTransition(async () => {
      const res = await toggleApiKey(k.id);
      if (!res.success) toast.error(res.error);
      else router.refresh();
    });
  }

  function handleDelete(k: ApiKey) {
    if (!confirm(`Usunąć klucz „${k.name}”? Aplikacje używające go stracą dostęp.`))
      return;
    startTransition(async () => {
      const res = await deleteApiKey(k.id);
      if (!res.success) toast.error(res.error);
      else {
        toast.success("Usunięto klucz");
        router.refresh();
      }
    });
  }

  function closeDialog() {
    setOpen(false);
    setCreatedKey(null);
    setName("");
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" />
          Nowy klucz API
        </Button>
      </div>

      {initialItems.length === 0 ? (
        <p className="text-sm text-[var(--muted-foreground)] text-center py-8">
          Brak kluczy API.
        </p>
      ) : (
        <ul className="divide-y divide-[var(--border)]">
          {initialItems.map((k) => (
            <li key={k.id} className="py-3 flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2 flex-wrap">
                  <p className="font-medium text-sm">{k.name}</p>
                  <code className="text-xs font-mono text-[var(--muted-foreground)]">
                    {k.prefix}…
                  </code>
                  {!k.isActive && <Badge variant="warning">Nieaktywny</Badge>}
                </div>
                <p className="text-xs text-[var(--muted-foreground)] mt-1">
                  Utworzono {new Date(k.createdAt).toLocaleDateString("pl-PL")}
                  {k.lastUsedAt
                    ? ` · ostatnio użyty ${new Date(k.lastUsedAt).toLocaleString("pl-PL")}`
                    : " · jeszcze nieużywany"}
                </p>
              </div>
              <div className="flex gap-1 shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleToggle(k)}
                  disabled={pending}
                  title={k.isActive ? "Dezaktywuj" : "Aktywuj"}
                >
                  {k.isActive ? (
                    <Eye className="h-4 w-4" />
                  ) : (
                    <EyeOff className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDelete(k)}
                  disabled={pending}
                >
                  <Trash2 className="h-4 w-4 text-red-600" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Dialog
        open={open}
        onOpenChange={(o) => {
          if (!o) closeDialog();
          else setOpen(true);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {createdKey ? "Klucz utworzony" : "Nowy klucz API"}
            </DialogTitle>
            <DialogDescription>
              {createdKey
                ? "Skopiuj klucz teraz — nie pokażemy go ponownie."
                : "Nadaj nazwę, aby rozpoznać klucz później (np. „CRM produkcja”)."}
            </DialogDescription>
          </DialogHeader>

          {createdKey ? (
            <div className="space-y-3">
              <div className="rounded-md border border-[var(--border)] bg-[var(--muted)]/40 p-3">
                <code className="text-xs font-mono break-all">{createdKey}</code>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  navigator.clipboard.writeText(createdKey);
                  toast.success("Skopiowano klucz");
                }}
              >
                <Copy className="h-4 w-4" />
                Kopiuj klucz
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="ak-name">Nazwa klucza</Label>
              <Input
                id="ak-name"
                value={name}
                placeholder="np. CRM produkcja"
                onChange={(e) => setName(e.target.value)}
              />
            </div>
          )}

          <DialogFooter>
            {createdKey ? (
              <Button onClick={closeDialog}>Gotowe</Button>
            ) : (
              <>
                <Button variant="ghost" onClick={closeDialog} disabled={pending}>
                  Anuluj
                </Button>
                <Button onClick={submit} disabled={pending || !name.trim()}>
                  {pending ? "Tworzę..." : "Utwórz klucz"}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
