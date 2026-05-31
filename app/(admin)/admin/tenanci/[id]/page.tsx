import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { TenantBasicForm } from "./tenant-basic-form";
import { SubscriptionForm } from "./subscription-form";
import { TenantUsersList } from "./tenant-users-list";

export const metadata = { title: "Super-admin — tenant" };

const STATUS_VARIANT: Record<string, "muted" | "success" | "warning" | "danger"> = {
  TRIAL: "warning",
  ACTIVE: "success",
  SUSPENDED: "danger",
  CANCELLED: "muted",
};

export default async function TenantDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const tenant = await prisma.tenant.findUnique({
    where: { id },
    include: {
      subscription: true,
      users: { orderBy: { createdAt: "asc" } },
      _count: {
        select: { quotes: true, visits: true, roomTypes: true, addons: true },
      },
    },
  });
  if (!tenant) notFound();

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <Link
            href="/admin/tenanci"
            className="inline-flex items-center gap-1 text-xs text-[var(--muted-foreground)] hover:text-[var(--primary)]"
          >
            <ArrowLeft className="h-3 w-3" />
            Wszyscy tenanci
          </Link>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-[var(--primary)]">
            {tenant.name}
          </h1>
          <p className="text-sm text-[var(--muted-foreground)]">
            /{tenant.slug} · utworzono{" "}
            {new Date(tenant.createdAt).toLocaleDateString("pl-PL")}
          </p>
          <div className="mt-2 flex items-center gap-2">
            <Badge variant={STATUS_VARIANT[tenant.status]}>{tenant.status}</Badge>
            {tenant.subscription ? (
              <Badge variant="muted">{tenant.subscription.plan}</Badge>
            ) : null}
          </div>
        </div>
        <Button asChild variant="outline">
          <a
            href={`/w/${tenant.slug}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <ExternalLink className="h-4 w-4" />
            Otwórz widget
          </a>
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <Stat label="Leady" value={tenant._count.quotes} />
        <Stat label="Wizyty" value={tenant._count.visits} />
        <Stat label="Pokoje" value={tenant._count.roomTypes} />
        <Stat label="Usługi" value={tenant._count.addons} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Dane placówki</CardTitle>
          <CardDescription>
            Podstawowe dane edytowane przez super-admina. Szczegółowy branding,
            cennik i powiadomienia konfiguruje OWNER w panelu tenanta.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TenantBasicForm
            tenantId={tenant.id}
            initial={{
              name: tenant.name,
              city: tenant.city ?? "",
              email: tenant.email ?? "",
              phone: tenant.phone ?? "",
              status: tenant.status,
            }}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Subskrypcja</CardTitle>
          <CardDescription>
            Plan i status abonamentu. MRR liczone z aktywnych subskrypcji.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SubscriptionForm
            tenantId={tenant.id}
            initial={{
              plan: tenant.subscription?.plan ?? "TRIAL",
              status: tenant.subscription?.status ?? "TRIAL",
              monthlyPrice: tenant.subscription?.monthlyPrice ?? 0,
              trialEndsAt: tenant.subscription?.trialEndsAt
                ? tenant.subscription.trialEndsAt.toISOString().slice(0, 10)
                : "",
              currentPeriodEnd: tenant.subscription?.currentPeriodEnd
                ? tenant.subscription.currentPeriodEnd.toISOString().slice(0, 10)
                : "",
              quotesThisPeriod: tenant.subscription?.quotesThisPeriod ?? 0,
              limitOverrides: tenant.subscription?.limitOverrides
                ? JSON.stringify(tenant.subscription.limitOverrides, null, 2)
                : "",
            }}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Userzy tenanta ({tenant.users.length})</CardTitle>
          <CardDescription>
            Konta logujące się do panelu placówki. Zawieszenie blokuje
            logowanie.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TenantUsersList
            tenantId={tenant.id}
            users={tenant.users.map((u) => ({
              id: u.id,
              name: u.name,
              email: u.email,
              role: u.role,
              status: u.status,
              lastLoginAt: u.lastLoginAt?.toISOString() ?? null,
            }))}
          />
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <p className="text-xs uppercase tracking-wider text-[var(--muted-foreground)]">
          {label}
        </p>
        <p className="mt-1 text-2xl font-semibold text-[var(--primary)]">
          {value}
        </p>
      </CardContent>
    </Card>
  );
}
