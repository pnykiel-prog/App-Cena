"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateSubscription } from "../actions";

type Initial = {
  plan: "TRIAL" | "STARTER" | "PRO" | "ENTERPRISE";
  status: "TRIAL" | "ACTIVE" | "PAST_DUE" | "CANCELLED";
  monthlyPrice: number;
  trialEndsAt: string; // yyyy-mm-dd
};

const DEFAULT_PRICES: Record<Initial["plan"], number> = {
  TRIAL: 0,
  STARTER: 199,
  PRO: 499,
  ENTERPRISE: 1499,
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
  const [form, setForm] = useState({
    plan: initial.plan,
    status: initial.status,
    monthlyPrice: String(initial.monthlyPrice),
    trialEndsAt: initial.trialEndsAt,
  });

  function changePlan(plan: Initial["plan"]) {
    setForm((f) => ({
      ...f,
      plan,
      monthlyPrice: String(DEFAULT_PRICES[plan]),
    }));
  }

  function save() {
    startTransition(async () => {
      const res = await updateSubscription(tenantId, {
        plan: form.plan,
        status: form.status,
        monthlyPrice: Number(form.monthlyPrice),
        trialEndsAt: form.trialEndsAt || null,
      });
      if (!res.success) {
        toast.error(res.error);
        return;
      }
      toast.success("Zapisano subskrypcję");
      router.refresh();
    });
  }

  return (
    <div className="space-y-4 max-w-xl">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="s-plan">Plan</Label>
          <Select
            value={form.plan}
            onValueChange={(v) => changePlan(v as Initial["plan"])}
          >
            <SelectTrigger id="s-plan">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="TRIAL">Trial</SelectItem>
              <SelectItem value="STARTER">Starter</SelectItem>
              <SelectItem value="PRO">PRO</SelectItem>
              <SelectItem value="ENTERPRISE">Enterprise</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="s-status">Status subskrypcji</Label>
          <Select
            value={form.status}
            onValueChange={(v) =>
              setForm({ ...form, status: v as Initial["status"] })
            }
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
            onChange={(e) =>
              setForm({ ...form, monthlyPrice: e.target.value })
            }
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="s-trial">Koniec triala (opcjonalnie)</Label>
          <Input
            id="s-trial"
            type="date"
            value={form.trialEndsAt}
            onChange={(e) =>
              setForm({ ...form, trialEndsAt: e.target.value })
            }
          />
        </div>
      </div>

      <Button onClick={save} disabled={pending}>
        <Save className="h-4 w-4" />
        {pending ? "Zapisuję..." : "Zapisz subskrypcję"}
      </Button>
    </div>
  );
}
