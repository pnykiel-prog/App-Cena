"use client";

import { useState, useTransition, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ExternalLink, Pencil, PauseCircle, PlayCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatPLN } from "@/lib/utils";
import { setTenantStatus } from "./actions";

type Tenant = {
  id: string;
  slug: string;
  name: string;
  city: string | null;
  status: "TRIAL" | "ACTIVE" | "SUSPENDED" | "CANCELLED";
  plan: "TRIAL" | "STARTER" | "PRO" | "ENTERPRISE" | null;
  subStatus: string | null;
  monthlyPrice: number;
  leads: number;
  visits: number;
  users: number;
  createdAt: string;
};

const STATUS_VARIANT: Record<Tenant["status"], "muted" | "success" | "warning" | "danger"> = {
  TRIAL: "warning",
  ACTIVE: "success",
  SUSPENDED: "danger",
  CANCELLED: "muted",
};

export function TenantsList({ tenants }: { tenants: Tenant[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [planFilter, setPlanFilter] = useState<string>("all");
  const [pending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return tenants.filter((t) => {
      if (statusFilter !== "all" && t.status !== statusFilter) return false;
      if (planFilter !== "all" && t.plan !== planFilter) return false;
      if (q) {
        return (
          t.name.toLowerCase().includes(q) ||
          t.slug.toLowerCase().includes(q) ||
          (t.city?.toLowerCase().includes(q) ?? false)
        );
      }
      return true;
    });
  }, [tenants, query, statusFilter, planFilter]);

  function toggleStatus(t: Tenant) {
    const next = t.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE";
    const verb = next === "SUSPENDED" ? "zawiesić" : "aktywować";
    if (!confirm(`Czy na pewno ${verb} tenanta „${t.name}"?`)) return;
    startTransition(async () => {
      const res = await setTenantStatus(t.id, next);
      if (!res.success) {
        toast.error(res.error);
        return;
      }
      toast.success(next === "SUSPENDED" ? "Zawieszono" : "Aktywowano");
      router.refresh();
    });
  }

  function goToTenant(id: string) {
    router.push(`/admin/tenanci/${id}`);
  }

  // Klikanie w przyciski akcji (otwórz widget, edytuj, suspend) nie powinno
  // jednocześnie nawigować na detail page wiersza.
  function stopRow(e: React.MouseEvent | React.KeyboardEvent) {
    e.stopPropagation();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <Input
          placeholder="Szukaj nazwy, sluga lub miasta..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="flex-1"
        />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="sm:w-44">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Wszystkie statusy</SelectItem>
            <SelectItem value="TRIAL">Trial</SelectItem>
            <SelectItem value="ACTIVE">Aktywny</SelectItem>
            <SelectItem value="SUSPENDED">Zawieszony</SelectItem>
            <SelectItem value="CANCELLED">Anulowany</SelectItem>
          </SelectContent>
        </Select>
        <Select value={planFilter} onValueChange={setPlanFilter}>
          <SelectTrigger className="sm:w-44">
            <SelectValue placeholder="Plan" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Wszystkie plany</SelectItem>
            <SelectItem value="TRIAL">Trial</SelectItem>
            <SelectItem value="STARTER">Starter</SelectItem>
            <SelectItem value="PRO">Pro</SelectItem>
            <SelectItem value="ENTERPRISE">Enterprise</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-[var(--muted-foreground)] text-center py-12">
          Brak tenantów spełniających kryteria.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider text-[var(--muted-foreground)] border-b border-[var(--border)]">
                <th className="py-2 pr-3">Tenant</th>
                <th className="py-2 pr-3">Status</th>
                <th className="py-2 pr-3">Plan / MRR</th>
                <th className="py-2 pr-3 text-right">Leady / wizyty / userzy</th>
                <th className="py-2 pr-3 text-right">Akcje</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((t) => (
                <tr
                  key={t.id}
                  role="link"
                  tabIndex={0}
                  onClick={() => goToTenant(t.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      goToTenant(t.id);
                    }
                  }}
                  className="border-b border-[var(--border)] last:border-0 cursor-pointer hover:bg-[var(--secondary)]/60 transition-colors focus:outline-none focus:bg-[var(--secondary)]"
                >
                  <td className="py-3 pr-3">
                    <span className="font-medium text-[var(--primary)]">
                      {t.name}
                    </span>
                    <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
                      /{t.slug} · {t.city ?? "—"}
                    </p>
                  </td>
                  <td className="py-3 pr-3">
                    <Badge variant={STATUS_VARIANT[t.status]}>{t.status}</Badge>
                  </td>
                  <td className="py-3 pr-3">
                    {t.plan ? (
                      <>
                        <Badge variant="muted">{t.plan}</Badge>
                        <p className="text-xs text-[var(--muted-foreground)] mt-1">
                          {formatPLN(t.monthlyPrice)} / mies.
                        </p>
                      </>
                    ) : (
                      <span className="text-xs text-[var(--muted-foreground)]">—</span>
                    )}
                  </td>
                  <td className="py-3 pr-3 text-right text-xs text-[var(--muted-foreground)]">
                    {t.leads} / {t.visits} / {t.users}
                  </td>
                  <td className="py-3 pr-3" onClick={stopRow}>
                    <div className="flex gap-1 justify-end">
                      <Button
                        asChild
                        variant="ghost"
                        size="icon"
                        title="Otwórz widget w nowej karcie"
                      >
                        <a
                          href={`/w/${t.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={stopRow}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </Button>
                      <Button asChild variant="ghost" size="icon" title="Edytuj">
                        <Link
                          href={`/admin/tenanci/${t.id}`}
                          onClick={stopRow}
                        >
                          <Pencil className="h-4 w-4" />
                        </Link>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          stopRow(e);
                          toggleStatus(t);
                        }}
                        disabled={pending || t.status === "CANCELLED"}
                        title={t.status === "ACTIVE" ? "Zawieś" : "Aktywuj"}
                      >
                        {t.status === "ACTIVE" ? (
                          <PauseCircle className="h-4 w-4 text-amber-600" />
                        ) : (
                          <PlayCircle className="h-4 w-4 text-emerald-600" />
                        )}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
