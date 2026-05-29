"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import {
  STEPS,
  type StepKey,
  type WidgetConfig,
  type WizardAnswers,
  type QuoteResult,
} from "./types";
import { IntroStep } from "./intro-step";
import { BarthelStep } from "./barthel-step";
import { MedicalStep } from "./medical-step";
import { RoomStep } from "./room-step";
import { AddonsStep } from "./addons-step";
import { ContractStep } from "./contract-step";
import { ResultStep } from "./result-step";
import { ResizeReporter } from "./resize-reporter";
import { scoreBarthel } from "@/lib/barthel";

export function WidgetWizard({ config }: { config: WidgetConfig }) {
  const [stepIndex, setStepIndex] = useState(0);
  const [answers, setAnswers] = useState<WizardAnswers>(() => ({
    barthelAnswers: {},
    modifiers: {},
    roomTypeId: null,
    selectedAddons: [],
    contractMonths: 12,
  }));
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<QuoteResult | null>(null);

  const stepKey: StepKey = STEPS[stepIndex].key;
  const progress = ((stepIndex + 1) / STEPS.length) * 100;
  const barthelScore = useMemo(
    () => scoreBarthel(answers.barthelAnswers),
    [answers.barthelAnswers],
  );

  const canGoNext = (() => {
    switch (stepKey) {
      case "intro":
        return true;
      case "barthel":
        return Object.keys(answers.barthelAnswers).length === 10;
      case "medical":
        return true;
      case "room":
        return !!answers.roomTypeId;
      case "addons":
        return true;
      case "contract":
        return answers.contractMonths > 0;
      case "result":
        return false;
      default:
        return false;
    }
  })();

  const handleBack = () => setStepIndex((i) => Math.max(0, i - 1));

  const handleNext = async () => {
    if (stepKey === "contract") {
      await submitQuote();
      return;
    }
    setStepIndex((i) => Math.min(STEPS.length - 1, i + 1));
  };

  async function submitQuote() {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/widget/${config.tenant.slug}/quote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          barthelAnswers: answers.barthelAnswers,
          modifiers: answers.modifiers,
          roomTypeId: answers.roomTypeId,
          addons: answers.selectedAddons,
          contractMonths: answers.contractMonths,
        }),
      });
      const json = await res.json();
      if (!json.success) {
        toast.error(json.error ?? "Nie udało się policzyć wyceny");
        return;
      }
      setResult(json.data as QuoteResult);
      setStepIndex(STEPS.length - 1);
    } catch (e) {
      toast.error("Błąd połączenia z serwerem");
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <ResizeReporter stepKey={stepKey} />
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-[var(--muted-foreground)]">
          <span>
            Krok {stepIndex + 1} z {STEPS.length} — <strong>{STEPS[stepIndex].label}</strong>
          </span>
          <span className="font-mono">{Math.round(progress)}%</span>
        </div>
        <Progress value={progress} />
      </div>

      <div className="min-h-[420px]">
        {stepKey === "intro" && (
          <IntroStep
            tenant={config.tenant}
            answers={answers}
            onChange={setAnswers}
          />
        )}
        {stepKey === "barthel" && (
          <BarthelStep
            items={config.barthelItems}
            answers={answers}
            onChange={setAnswers}
            currentScore={barthelScore}
          />
        )}
        {stepKey === "medical" && (
          <MedicalStep
            modifiers={config.medicalModifiers}
            answers={answers}
            onChange={setAnswers}
            currency={config.tenant.currency}
          />
        )}
        {stepKey === "room" && (
          <RoomStep
            roomTypes={config.roomTypes}
            answers={answers}
            onChange={setAnswers}
            currency={config.tenant.currency}
          />
        )}
        {stepKey === "addons" && (
          <AddonsStep
            addons={config.addons}
            answers={answers}
            onChange={setAnswers}
            currency={config.tenant.currency}
          />
        )}
        {stepKey === "contract" && (
          <ContractStep
            discounts={config.discounts}
            answers={answers}
            onChange={setAnswers}
          />
        )}
        {stepKey === "result" && result && (
          <ResultStep
            result={result}
            tenant={config.tenant}
            barthelScore={result.barthelScore}
            contractMonths={answers.contractMonths}
            roomLabel={
              config.roomTypes.find((r) => r.id === answers.roomTypeId)?.label ?? ""
            }
          />
        )}
      </div>

      {stepKey !== "result" && (
        <div className="flex items-center justify-between pt-4 border-t border-[var(--border)]">
          <Button
            type="button"
            variant="ghost"
            onClick={handleBack}
            disabled={stepIndex === 0 || submitting}
          >
            <ChevronLeft className="h-4 w-4" />
            Wstecz
          </Button>
          <Button
            type="button"
            onClick={handleNext}
            disabled={!canGoNext || submitting}
            style={{
              backgroundColor: "var(--brand)",
              color: "white",
            }}
            className="hover:opacity-90"
          >
            {submitting ? (
              "Liczę wycenę..."
            ) : stepKey === "contract" ? (
              <>
                <Sparkles className="h-4 w-4" />
                Pokaż wycenę
              </>
            ) : (
              <>
                Dalej
                <ChevronRight className="h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
