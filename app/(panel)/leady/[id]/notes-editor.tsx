"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Save } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { updateLeadNotes } from "./actions";

export function LeadNotesEditor({
  leadId,
  initial,
}: {
  leadId: string;
  initial: string;
}) {
  const router = useRouter();
  const [notes, setNotes] = useState(initial);
  const [pending, startTransition] = useTransition();

  function save() {
    startTransition(async () => {
      const res = await updateLeadNotes(leadId, { notes: notes.trim() || null });
      if (!res.success) {
        toast.error(res.error);
        return;
      }
      toast.success("Notatki zapisane");
      router.refresh();
    });
  }

  const dirty = notes !== initial;

  return (
    <div className="space-y-3">
      <Textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Notatki z rozmowy, ustalenia, kolejne kroki..."
        rows={6}
      />
      <Button onClick={save} disabled={pending || !dirty}>
        <Save className="h-4 w-4" />
        {pending ? "Zapisuję..." : "Zapisz notatki"}
      </Button>
    </div>
  );
}
