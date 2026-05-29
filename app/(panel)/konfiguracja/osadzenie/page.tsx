import { auth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmbedSnippet } from "./embed-snippet";

export const metadata = { title: "Konfiguracja — Osadzenie widgetu" };

export default async function OsadzeniePage() {
  const session = await auth();
  const slug = session!.user.tenantSlug ?? "";
  const widgetUrl =
    process.env.NEXT_PUBLIC_WIDGET_URL ?? "http://localhost:3001";

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Osadzenie widgetu na stronie</CardTitle>
          <p className="text-sm text-[var(--muted-foreground)]">
            Skopiuj jeden z poniższych snippetów i wklej go na stronę WWW
            placówki. Widget pokaże się w miejscu wklejenia.
          </p>
        </CardHeader>
        <CardContent>
          <EmbedSnippet slug={slug} widgetUrl={widgetUrl} />
        </CardContent>
      </Card>
    </div>
  );
}
