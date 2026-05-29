import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { NewTenantForm } from "./new-tenant-form";

export const metadata = { title: "Super-admin — nowy tenant" };

export default function NowyTenantPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--primary)]">
          Nowy tenant
        </h1>
        <p className="text-sm text-[var(--muted-foreground)] mt-1">
          Utwórz nową placówkę z kontem OWNER-a i opcjonalnym seedem startowego cennika.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Dane placówki + OWNER</CardTitle>
          <CardDescription>
            Po utworzeniu OWNER otrzymuje pełny dostęp do panelu placówki i może
            samodzielnie dodawać kolejnych pracowników.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <NewTenantForm />
        </CardContent>
      </Card>
    </div>
  );
}
