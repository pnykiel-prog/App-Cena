"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Save, Clock, RotateCcw, Pause, Ban, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  updateSubscription,
  extendTrial,
  resetQuota,
  setSubscriptionStatus,
} from "../actions";
import { PLAN_PRICE, PLAN_LIMITS, type Plan } from "@/lib/plan-limits";

type SubStatus = "TRIAL" | "ACTIVE" | "PAST_DUE" | "CANCELLED";

type Initial = {
  plan: Plan;
  status: SubStatus;
  monthlyPrice: number;
  trialEndsAt: string; // yyyy-mm-dd
  currentPeriodEnd: string; // yyyy-mm-dd
  quotesThisPeriod: number;
  limitOverrides: string; // sformatowany JSON lub ""
};

export function SubscriptionForm({
  tenantId,
  initial,
}: {
  tenantId: string;
  initial: Initial;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [action, startAction] = useTransition();
  const [form, setForm] = useState({
    plan: initial.plan,
    status: initial.status,
    monthlyPrice: String(initial.monthlyPrice),
    trialEndsAt: initial.trialEndsAt,
    currentPeriodEnd: initial.currentPeriodEnd,
    limitOverrides: initial.limitOverrides,
  });

  const quoteLimit = PLAN_LIMITS[form.plan].monthlyQuoteLimit;

  function changePlan(plan: Plan) {
    setForm((f) => ({ ...f, plan, monthlyPrice: String(PLAN_PRICE[plan]) }));
  }

  function save() {
    startTransition(async () => {
      const res = await updateSubscription(tenantId, {
        plan: form.plan,
        status: form.status,
        monthlyPrice: Number(form.monthlyPrice),
        trialEndsAt: form.trialEndsAt || null,
        currentPeriodEnd: form.currentPeriodEnd || null,
        limitOverrides: form.limitOverrides || null,
      });
      if (!res.success) {
        toast.error(res.error);
        return;
      }
      toast.success("Zapisano subskrypcję");
      router.refresh();
    });
  }

  function runAction(label: string, fn: () => Promise<{ success: boolean; error?: string }>) {
    startAction(async () => {
      const res = await fn();
      if (!res.success) {
        toast.error(res.error ?? "Błąd akcji");
        return;
      }
      toast.success(label);
      router.refresh();
    });
  }

  const busy = pending || action;

  return (
    <div className="space-y-5 max-w-2xl">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="s-plan">Plan</Label>
          <Select value={form.plan} onValueChange={(v) => changePlan(v as Plan)}>
            <SelectTrigger id="s-plan">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="TRIAL">Trial</SelectItem>
              <SelectItem value="STARTER">Starter</SelectItem>
              <SelectItem value="PRO">Pro</SelectItem>
              <SelectItem value="ENTERPRISE">Enterprise</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="s-status">Status subskrypcji</Label>
          <Select
            value={form.status}
            onValueChange={(v) => setForm({ ...form, status: v as SubStatus })}
          >
            <SelectTrigger id="s-status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="TRIAL">Trialing</SelectItem>
              <SelectItem value="ACTIVE">Aktywna</SelectItem>
              <SelectItem value="PAST_DUE">Zaległość</SelectItem>
              <SelectItem value="CANCELLED">Anulowana</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="s-price">Cena mies. (PLN)</Label>
          <Input
            id="s-price"
            type="number"
            min={0}
            step={1}
            value={form.monthlyPrice}
            onChange={(e) => setForm({ ...form, monthlyPrice: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="s-trial">Koniec triala</Label>
          <Input
            id="s-trial"
            type="date"
            value={form.trialEndsAt}
            onChange={(e) => setForm({ ...form, trialEndsAt: e.target.value })}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="s-period">Koniec okresu rozliczeniowego</Label>
          <Input
            id="s-period"
            type="date"
            value={form.currentPeriodEnd}
            onChange={(e) =>
              setForm({ ...form, currentPeriodEnd: e.target.value })
            }
          />
        </div>
        <div className="space-y-2">
          <Label>Wykorzystanie wycen w okresie</Label>
          <div className="flex h-9 items-center rounded-md border border-[var(--border)] px-3 text-sm text-[var(--muted-foreground)]">
            {initial.quotesThisPeriod} /{" "}
            {quoteLimit === null ? "∞" : quoteLimit}
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="s-overrides">Nadpisania limitów (JSON, opcjonalnie)</Label>
        <Textarea
          id="s-overrides"
          rows={4}
          placeholder={`np. { "monthlyQuoteLimit": 1000, "features": { "exportCsv": true } }`}
          value={form.limitOverrides}
          onChange={(e) => setForm({ ...form, limitOverrides: e.target.value })}
          className="font-mono text-xs"
        />
        <p className="text-xs text-[var(--muted-foreground)]">
          Wyjątki dla tej placówki nakładane na limity planu. Puste = brak
          wyjątków. Dozwolone klucze: monthlyQuoteLimit, maxRoomTypes,
          maxAddonServices, panelUsers, embedDomains, leadRetentionDays,
          auditLogMonths, features.
        </p>
      </div>

      <Button onClick={save} disabled={busy}>
        <Save className="h-4 w-4" />
        {pending ? "Zapisuję..." : "Zapisz subskrypcję"}
      </Button>

      <div className="border-t border-[var(--border)] pt-4">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
          Akcje szybkie
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={busy}
            onClick={() =>
              runAction("Przedłużono trial o 14 dni", () =>
                extendTrial(tenantId, 14),
              )
            }
          >
            <Clock className="h-4 w-4" />
            +14 dni trial
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={busy}
            onClick={() =>
              runAction("Zresetowano kwotę wycen", () => resetQuota(tenantId))
            }
          >
            <RotateCcw className="h-4 w-4" />
            Resetuj kwotę
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={busy}
            onClick={() =>
              runAction("Subskrypcja zawieszona", () =>
                setSubscriptionStatus(tenantId, "PAST_DUE"),
              )
            }
          >
            <Pause className="h-4 w-4" />
            Zawieś
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={busy}
            onClick={() =>
              runAction("Subskrypcja aktywowana", () =>
                setSubscriptionStatus(tenantId, "ACTIVE"),
              )
            }
          >
            <Play className="h-4 w-4" />
            Reaktywuj
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={busy}
            onClick={() =>
              runAction("Subskrypcja anulowana", () =>
                setSubscriptionStatus(tenantId, "CANCELLED"),
              )
            }
          >
            <Ban className="h-4 w-4" />
            Anuluj
          </Button>
        </div>
      </div>
    </div>
  );
}
