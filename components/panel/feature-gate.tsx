import Link from "next/link";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  PLAN_LABEL,
  PLAN_ORDER,
  PLAN_LIMITS,
  type FeatureFlags,
  type Plan,
} from "@/lib/plan-limits";

// Najniższy plan, który odblokowuje daną funkcję (do podpowiedzi „dostępne od…").
function minPlanFor(feature: keyof FeatureFlags): Plan | null {
  for (const p of PLAN_ORDER) {
    if (p === "TRIAL") continue;
    if (PLAN_LIMITS[p].features[feature]) return p;
  }
  return null;
}

// ─── UpgradePrompt — komunikat zachęcający do wyższego planu ───────────────────
//
// NIGDY nie ukrywamy funkcji po cichu (zasada z wytycznych) — pokazujemy czytelny
// powód blokady + CTA do /plan.
export function UpgradePrompt({
  feature,
  title,
  description,
  className,
}: {
  feature?: keyof FeatureFlags;
  title?: string;
  description?: string;
  className?: string;
}) {
  const minPlan = feature ? minPlanFor(feature) : null;
  return (
    <div
      className={
        "rounded-lg border border-dashed border-[var(--border)] bg-[var(--muted)]/40 p-6 text-center " +
        (className ?? "")
      }
    >
      <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-[var(--secondary)]">
        <Lock className="h-5 w-5 text-[var(--primary)]" />
      </div>
      <p className="font-semibold text-[var(--primary)]">
        {title ?? "Funkcja niedostępna w Twoim planie"}
      </p>
      <p className="mx-auto mt-1 max-w-md text-sm text-[var(--muted-foreground)]">
        {description ??
          (minPlan
            ? `Ta funkcja jest dostępna w planie ${PLAN_LABEL[minPlan]} i wyższych.`
            : "Ta funkcja wymaga wyższego planu.")}
      </p>
      <Button asChild variant="accent" size="sm" className="mt-4">
        <Link href="/plan">Zobacz plany</Link>
      </Button>
    </div>
  );
}

// ─── FeatureGate — bramka renderująca children tylko gdy funkcja dostępna ──────
//
// Tryby:
//   replace (domyślny) — gdy brak dostępu pokaż UpgradePrompt zamiast children.
//   lock — pokaż children przyciemnione + nakładkę z UpgradePrompt (read-only podgląd).
//   hide — nie renderuj nic (używać wyjątkowo; preferuj replace).
export function FeatureGate({
  allowed,
  feature,
  mode = "replace",
  title,
  description,
  children,
}: {
  allowed: boolean;
  feature?: keyof FeatureFlags;
  mode?: "replace" | "lock" | "hide";
  title?: string;
  description?: string;
  children: React.ReactNode;
}) {
  if (allowed) return <>{children}</>;
  if (mode === "hide") return null;
  if (mode === "lock") {
    return (
      <div className="relative">
        <div className="pointer-events-none select-none opacity-40">{children}</div>
        <div className="absolute inset-0 flex items-center justify-center">
          <UpgradePrompt feature={feature} title={title} description={description} />
        </div>
      </div>
    );
  }
  return <UpgradePrompt feature={feature} title={title} description={description} />;
}
