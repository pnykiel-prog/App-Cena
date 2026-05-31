"use client";

import { formatPLN } from "@/lib/utils";
import type { WidgetRoom, WizardAnswers } from "./types";
import { Check } from "lucide-react";
import { useT } from "./i18n";

export function RoomStep({
  roomTypes,
  answers,
  onChange,
  currency,
}: {
  roomTypes: WidgetRoom[];
  answers: WizardAnswers;
  onChange: (a: WizardAnswers) => void;
  currency: string;
}) {
  const t = useT();
  const CAPACITY_LABEL = t.room.capacity;
  return (
    <div className="space-y-6">
      <div>
        <h2
          className="text-xl font-semibold tracking-tight"
          style={{ color: "var(--brand)" }}
        >
          {t.room.title}
        </h2>
        <p className="mt-2 text-sm text-[var(--muted-foreground)]">{t.room.desc}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {roomTypes.map((r) => {
          const active = answers.roomTypeId === r.id;
          return (
            <button
              key={r.id}
              type="button"
              onClick={() => onChange({ ...answers, roomTypeId: r.id })}
              className="text-left rounded-xl border-2 p-5 transition-all bg-white relative"
              style={{
                borderColor: active ? "var(--brand)" : "var(--border)",
                boxShadow: active ? "0 4px 14px rgba(30,58,95,0.15)" : undefined,
              }}
            >
              {active && (
                <span
                  className="absolute top-3 right-3 flex h-6 w-6 items-center justify-center rounded-full text-white"
                  style={{ backgroundColor: "var(--brand)" }}
                >
                  <Check className="h-3.5 w-3.5" />
                </span>
              )}
              <p
                className="text-xs uppercase tracking-wider font-semibold"
                style={{ color: "var(--brand-accent)" }}
              >
                {CAPACITY_LABEL[r.capacity]}
              </p>
              <p
                className="mt-2 font-semibold text-base"
                style={{ color: "var(--brand)" }}
              >
                {r.label}
              </p>
              {r.description ? (
                <p className="mt-2 text-xs text-[var(--muted-foreground)]">
                  {r.description}
                </p>
              ) : null}
              <div className="mt-4 pt-4 border-t border-[var(--border)]">
                <p className="text-xs text-[var(--muted-foreground)]">{t.room.basePrice}</p>
                <p
                  className="mt-1 text-2xl font-bold"
                  style={{ color: "var(--brand)" }}
                >
                  {formatPLN(r.basePrice)}
                </p>
                <p className="text-xs text-[var(--muted-foreground)]">
                  {t.room.perMonth(currency)}
                </p>
              </div>
              {r.available > 0 ? (
                <p className="mt-3 text-xs text-emerald-700 font-medium">
                  ● {r.available} {r.available === 1 ? "miejsce" : "miejsc"} dostępnych
                </p>
              ) : (
                <p className="mt-3 text-xs text-amber-700 font-medium">
                  ● lista rezerwowa
                </p>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
