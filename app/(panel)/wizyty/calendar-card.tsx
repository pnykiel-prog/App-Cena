"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Calendar, Copy, RefreshCw, Power } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { UpgradePrompt } from "@/components/panel/feature-gate";
import { enableCalendarFeed, disableCalendarFeed } from "./actions";

export function CalendarCard({
  canUse,
  feedUrl,
  isActive,
}: {
  canUse: boolean;
  feedUrl: string | null;
  isActive: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();

  function run(fn: () => Promise<{ success: boolean; error?: string }>, ok: string) {
    start(async () => {
      const res = await fn();
      if (!res.success) {
        toast.error(res.error ?? "Błąd");
        return;
      }
      toast.success(ok);
      router.refresh();
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-[var(--muted-foreground)]" />
          Synchronizacja z kalendarzem
        </CardTitle>
        <p className="text-sm text-[var(--muted-foreground)]">
          Subskrybuj wizyty w Google Calendar, Outlooku lub Apple Calendar.
          Kalendarz tylko-do-odczytu, automatycznie aktualizowany.
        </p>
      </CardHeader>
      <CardContent>
        {!canUse ? (
          <UpgradePrompt
            feature="calendarGoogle"
            description="Synchronizacja z kalendarzem jest dostępna w planie Pro i wyższych."
          />
        ) : feedUrl && isActive ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Badge variant="success">Aktywna</Badge>
              <span className="text-xs text-[var(--muted-foreground)]">
                Wklej poniższy adres jako „subskrypcja kalendarza" / „z URL".
              </span>
            </div>
            <div className="rounded-md border border-[var(--border)] bg-[var(--muted)]/40 p-3">
              <code className="text-xs font-mono break-all">{feedUrl}</code>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  navigator.clipboard.writeText(feedUrl);
                  toast.success("Skopiowano adres feedu");
                }}
              >
                <Copy className="h-4 w-4" />
                Kopiuj adres
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={pending}
                onClick={() =>
                  run(enableCalendarFeed, "Wygenerowano nowy adres feedu")
                }
              >
                <RefreshCw className="h-4 w-4" />
                Regeneruj (rotacja)
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={pending}
                onClick={() => run(disableCalendarFeed, "Wyłączono feed")}
              >
                <Power className="h-4 w-4" />
                Wyłącz
              </Button>
            </div>
            <p className="text-xs text-[var(--muted-foreground)]">
              Uwaga: adres zawiera tajny token — udostępniaj go tylko zaufanym
              osobom. Regeneracja unieważnia poprzedni adres.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-[var(--muted-foreground)]">
              Włącz, aby otrzymać adres subskrypcji kalendarza z Twoimi wizytami.
            </p>
            <Button
              disabled={pending}
              onClick={() => run(enableCalendarFeed, "Włączono synchronizację")}
            >
              <Calendar className="h-4 w-4" />
              {pending ? "Włączam..." : "Włącz synchronizację"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
