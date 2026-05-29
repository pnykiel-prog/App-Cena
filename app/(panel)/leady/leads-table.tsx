"use client";

import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { formatPLN } from "@/lib/utils";

type Lead = {
  id: string;
  createdAt: string;
  contactName: string | null;
  status: string;
  barthelScore: number;
  roomLabel: string | null;
  contractMonths: number;
  estimateMin: number;
  estimateMax: number;
};

const STATUS_LABEL: Record<string, string> = {
  DRAFT: "Anonim",
  NEW: "Nowy",
  CONTACTED: "Kontakt",
  VISIT_SCHEDULED: "Wizyta",
  WON: "Wygrany",
  LOST: "Stracony",
  COMPLETED: "Zakończony",
  ARCHIVED: "Archiwum",
  CONVERTED_TO_VISIT: "Wizyta",
};
const STATUS_VARIANT: Record<
  string,
  "muted" | "success" | "warning" | "danger" | "outline"
> = {
  DRAFT: "outline",
  NEW: "warning",
  CONTACTED: "muted",
  VISIT_SCHEDULED: "success",
  WON: "success",
  LOST: "danger",
  COMPLETED: "muted",
  ARCHIVED: "muted",
  CONVERTED_TO_VISIT: "success",
};

export function LeadsTable({ leads }: { leads: Lead[] }) {
  const router = useRouter();

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs uppercase tracking-wider text-[var(--muted-foreground)] border-b border-[var(--border)]">
            <th className="py-2 pr-3">Data</th>
            <th className="py-2 pr-3">Kontakt</th>
            <th className="py-2 pr-3">Status</th>
            <th className="py-2 pr-3">Barthel</th>
            <th className="py-2 pr-3">Pokój</th>
            <th className="py-2 pr-3">Mies.</th>
            <th className="py-2 pr-3 text-right">Wycena</th>
          </tr>
        </thead>
        <tbody>
          {leads.map((q) => (
            <tr
              key={q.id}
              role="link"
              tabIndex={0}
              onClick={() => router.push(`/leady/${q.id}`)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  router.push(`/leady/${q.id}`);
                }
              }}
              className="border-b border-[var(--border)] last:border-0 cursor-pointer hover:bg-[var(--secondary)]/60 transition-colors focus:outline-none focus:bg-[var(--secondary)]"
            >
              <td className="py-3 pr-3 text-[var(--primary)] font-medium">
                {new Date(q.createdAt).toLocaleString("pl-PL")}
              </td>
              <td className="py-3 pr-3">
                {q.contactName ?? (
                  <span className="text-xs text-[var(--muted-foreground)] italic">
                    anonim
                  </span>
                )}
              </td>
              <td className="py-3 pr-3">
                <Badge variant={STATUS_VARIANT[q.status] ?? "muted"}>
                  {STATUS_LABEL[q.status] ?? q.status}
                </Badge>
              </td>
              <td className="py-3 pr-3">{q.barthelScore} / 100</td>
              <td className="py-3 pr-3">{q.roomLabel ?? "—"}</td>
              <td className="py-3 pr-3">{q.contractMonths}</td>
              <td className="py-3 pr-3 text-right">
                <Badge variant="muted">
                  {formatPLN(q.estimateMin)} – {formatPLN(q.estimateMax)}
                </Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
