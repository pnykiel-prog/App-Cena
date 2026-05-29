"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Plus, X, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { updateNotifications } from "./actions";

type Initial = {
  emailNewLead: boolean;
  emailNewVisit: boolean;
  recipientEmails: string[];
};

export function NotificationsEditor({ initial }: { initial: Initial }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [emailNewLead, setEmailNewLead] = useState(initial.emailNewLead);
  const [emailNewVisit, setEmailNewVisit] = useState(initial.emailNewVisit);
  const [emails, setEmails] = useState<string[]>(initial.recipientEmails);
  const [newEmail, setNewEmail] = useState("");

  function addEmail() {
    const e = newEmail.trim();
    if (!e) return;
    if (!/.+@.+\..+/.test(e)) {
      toast.error("Nieprawidłowy e-mail");
      return;
    }
    if (emails.includes(e)) {
      toast.info("Już dodany");
      return;
    }
    setEmails([...emails, e]);
    setNewEmail("");
  }

  function removeEmail(e: string) {
    setEmails(emails.filter((x) => x !== e));
  }

  function submit() {
    startTransition(async () => {
      const res = await updateNotifications({
        emailNewLead,
        emailNewVisit,
        recipientEmails: emails,
      });
      if (!res.success) {
        toast.error(res.error);
        return;
      }
      toast.success("Zapisano");
      router.refresh();
    });
  }

  return (
    <div className="space-y-5 max-w-2xl">
      <div className="flex items-center justify-between rounded-md border border-[var(--border)] p-3">
        <div>
          <Label htmlFor="n-lead" className="cursor-pointer">
            Powiadom o nowym leadzie
          </Label>
          <p className="text-xs text-[var(--muted-foreground)]">
            E-mail wysyłany gdy klient zostawia kontakt po wycenie
          </p>
        </div>
        <Switch
          id="n-lead"
          checked={emailNewLead}
          onCheckedChange={setEmailNewLead}
        />
      </div>

      <div className="flex items-center justify-between rounded-md border border-[var(--border)] p-3">
        <div>
          <Label htmlFor="n-visit" className="cursor-pointer">
            Powiadom o nowej wizycie
          </Label>
          <p className="text-xs text-[var(--muted-foreground)]">
            E-mail wysyłany gdy klient prosi o umówienie wizyty
          </p>
        </div>
        <Switch
          id="n-visit"
          checked={emailNewVisit}
          onCheckedChange={setEmailNewVisit}
        />
      </div>

      <div className="space-y-3">
        <Label>Adresy odbiorców</Label>
        <p className="text-xs text-[var(--muted-foreground)]">
          E-maile, na które trafiają powiadomienia. Max 10.
        </p>

        <div className="flex gap-2">
          <Input
            type="email"
            value={newEmail}
            placeholder="manager@dom-seniora.pl"
            onChange={(e) => setNewEmail(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addEmail();
              }
            }}
          />
          <Button
            type="button"
            variant="outline"
            onClick={addEmail}
            disabled={!newEmail.trim() || emails.length >= 10}
          >
            <Plus className="h-4 w-4" />
            Dodaj
          </Button>
        </div>

        {emails.length > 0 ? (
          <ul className="flex flex-wrap gap-2">
            {emails.map((e) => (
              <li
                key={e}
                className="inline-flex items-center gap-2 bg-[var(--secondary)] text-[var(--secondary-foreground)] rounded-full px-3 py-1 text-sm"
              >
                <span>{e}</span>
                <button
                  type="button"
                  onClick={() => removeEmail(e)}
                  className="hover:text-red-600"
                  aria-label={`Usuń ${e}`}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-[var(--muted-foreground)] italic">
            Brak adresów. Powiadomienia nie będą wysyłane.
          </p>
        )}
      </div>

      <Button onClick={submit} disabled={pending}>
        <Save className="h-4 w-4" />
        {pending ? "Zapisuję..." : "Zapisz zmiany"}
      </Button>
    </div>
  );
}
