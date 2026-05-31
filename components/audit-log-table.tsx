import { Badge } from "@/components/ui/badge";

const ACTION_LABEL: Record<string, string> = {
  CREATE: "Utworzenie",
  UPDATE: "Aktualizacja",
  DELETE: "Usunięcie",
  TOGGLE: "Przełączenie",
  EXPORT: "Eksport",
  STATUS_CHANGE: "Zmiana statusu",
};

const ACTION_VARIANT: Record<
  string,
  "muted" | "success" | "warning" | "danger" | "outline"
> = {
  CREATE: "success",
  UPDATE: "muted",
  DELETE: "danger",
  TOGGLE: "outline",
  EXPORT: "warning",
  STATUS_CHANGE: "warning",
};

export type AuditRow = {
  id: string;
  createdAt: string;
  actorEmail: string;
  actorType: string;
  action: string;
  entity: string;
  summary: string | null;
  tenantName?: string | null; // tylko widok cross-tenant
};

export function AuditLogTable({
  rows,
  showTenant = false,
}: {
  rows: AuditRow[];
  showTenant?: boolean;
}) {
  if (rows.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-[var(--border)] p-8 text-center text-sm text-[var(--muted-foreground)]">
        Brak zapisów w dzienniku.
      </div>
    );
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs uppercase tracking-wider text-[var(--muted-foreground)] border-b border-[var(--border)]">
            <th className="py-2 pr-3">Data</th>
            <th className="py-2 pr-3">Akcja</th>
            <th className="py-2 pr-3">Obiekt</th>
            <th className="py-2 pr-3">Opis</th>
            {showTenant && <th className="py-2 pr-3">Placówka</th>}
            <th className="py-2 pr-3">Wykonawca</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-b border-[var(--border)] last:border-0">
              <td className="py-3 pr-3 text-xs text-[var(--muted-foreground)] whitespace-nowrap">
                {new Date(r.createdAt).toLocaleString("pl-PL")}
              </td>
              <td className="py-3 pr-3">
                <Badge variant={ACTION_VARIANT[r.action] ?? "muted"}>
                  {ACTION_LABEL[r.action] ?? r.action}
                </Badge>
              </td>
              <td className="py-3 pr-3 font-mono text-xs">{r.entity}</td>
              <td className="py-3 pr-3">{r.summary ?? "—"}</td>
              {showTenant && (
                <td className="py-3 pr-3 text-xs">
                  {r.tenantName ?? (
                    <span className="text-[var(--muted-foreground)]">platforma</span>
                  )}
                </td>
              )}
              <td className="py-3 pr-3 text-xs text-[var(--muted-foreground)]">
                {r.actorEmail}
                {r.actorType === "PLATFORM_ADMIN" && (
                  <Badge variant="outline" className="ml-1">
                    admin
                  </Badge>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
