import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatPLN } from "@/lib/utils";
import { Plus, ExternalLink } from "lucide-react";
import { TenantsList } from "./tenants-list";

export const metadata = { title: "Super-admin — Tenanci" };

export default async function TenanciPage() {
  const tenants = await prisma.tenant.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      subscription: true,
      _count: { select: { quotes: true, visits: true, users: true } },
    },
  });

  const data = tenants.map((t) => ({
    id: t.id,
    slug: t.slug,
    name: t.name,
    city: t.city,
    status: t.status,
    plan: t.subscription?.plan ?? null,
    subStatus: t.subscription?.status ?? null,
    monthlyPrice: t.subscription?.monthlyPrice ?? 0,
    leads: t._count.quotes,
    visits: t._count.visits,
    users: t._count.users,
    createdAt: t.createdAt.toISOString(),
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--primary)]">
            Tenanci ({tenants.length})
          </h1>
          <p className="text-sm text-[var(--muted-foreground)] mt-1">
            Wszystkie placówki podłączone do platformy.
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/tenanci/nowy">
            <Plus className="h-4 w-4" />
            Nowy tenant
          </Link>
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          <TenantsList tenants={data} />
        </CardContent>
      </Card>
    </div>
  );
}
