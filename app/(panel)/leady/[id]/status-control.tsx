"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { updateLeadStatus } from "./actions";

const OPTIONS: { value: string; label: string }[] = [
  { value: "DRAFT", label: "Anonimowa" },
  { value: "NEW", label: "Nowy lead" },
  { value: "CONTACTED", label: "Kontakt nawiązany" },
  { value: "VISIT_SCHEDULED", label: "Wizyta umówiona" },
  { value: "WON", label: "Wygrany (klient podpisał)" },
  { value: "LOST", label: "Stracony" },
  { value: "ARCHIVED", label: "Archiwum" },
];

export function LeadStatusControl({
  leadId,
  current,
}: {
  leadId: string;
  current: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function change(value: string) {
    if (value === current) return;
    startTransition(async () => {
      const res = await updateLeadStatus(leadId, value);
      if (!res.success) {
        toast.error(res.error);
        return;
      }
      toast.success("Status zaktualizowany");
      router.refresh();
    });
  }

  return (
    <div className="space-y-2">
      <Label htmlFor="lead-status">Aktualny status</Label>
      <Select value={current} onValueChange={change} disabled={pending}>
        <SelectTrigger id="lead-status">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {OPTIONS.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <p className="text-xs text-[var(--muted-foreground)]">
        Zmiana statusu zapisuje się natychmiast.
      </p>
    </div>
  );
}
