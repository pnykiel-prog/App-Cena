"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PauseCircle, PlayCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toggleTenantUser } from "../actions";

type User = {
  id: string;
  name: string;
  email: string;
  role: "OWNER" | "MANAGER" | "STAFF";
  status: "ACTIVE" | "INVITED" | "SUSPENDED";
  lastLoginAt: string | null;
};

const STATUS_VARIANT: Record<User["status"], "success" | "warning" | "danger"> = {
  ACTIVE: "success",
  INVITED: "warning",
  SUSPENDED: "danger",
};

export function TenantUsersList({
  tenantId,
  users,
}: {
  tenantId: string;
  users: User[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function toggle(u: User) {
    startTransition(async () => {
      const res = await toggleTenantUser(u.id, tenantId);
      if (!res.success) {
        toast.error(res.error);
        return;
      }
      toast.success(
        u.status === "ACTIVE" ? "User zawieszony" : "User aktywowany",
      );
      router.refresh();
    });
  }

  if (users.length === 0) {
    return (
      <p className="text-sm text-[var(--muted-foreground)] text-center py-8">
        Brak userów.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-[var(--border)]">
      {users.map((u) => (
        <li key={u.id} className="py-3 flex items-center justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-2 flex-wrap">
              <p className="font-medium text-sm">{u.name}</p>
              <Badge variant="muted">{u.role}</Badge>
              <Badge variant={STATUS_VARIANT[u.status]}>{u.status}</Badge>
            </div>
            <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
              {u.email}
              {u.lastLoginAt
                ? ` · ostatnie logowanie ${new Date(u.lastLoginAt).toLocaleString("pl-PL")}`
                : " · nigdy nie logował się"}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => toggle(u)}
            disabled={pending}
            title={u.status === "ACTIVE" ? "Zawieś" : "Aktywuj"}
          >
            {u.status === "ACTIVE" ? (
              <PauseCircle className="h-4 w-4 text-amber-600" />
            ) : (
              <PlayCircle className="h-4 w-4 text-emerald-600" />
            )}
          </Button>
        </li>
      ))}
    </ul>
  );
}
