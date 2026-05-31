"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Download, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { exportLeadsCsv } from "./actions";

// Eksport CSV. Bramka funkcyjna jest po stronie serwera (exportLeadsCsv sprawdza
// canFeature). Gdy plan nie pozwala, akcja zwraca błąd → pokazujemy toast + CTA.
export function ExportButton({ enabled }: { enabled: boolean }) {
  const [pending, start] = useTransition();

  function run() {
    start(async () => {
      const res = await exportLeadsCsv();
      if (!res.success) {
        toast.error(res.error, {
          action: {
            label: "Zobacz plany",
            onClick: () => {
              window.location.href = "/plan";
            },
          },
        });
        return;
      }
      const { csv, filename } = res.data!;
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Wyeksportowano leady do CSV");
    });
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={run}
      disabled={pending}
      title={enabled ? "Eksportuj do CSV" : "Dostępne w planie Pro+"}
    >
      {enabled ? <Download className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
      {pending ? "Eksportuję..." : "Eksport CSV"}
    </Button>
  );
}
