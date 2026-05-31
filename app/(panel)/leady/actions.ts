"use server";

import { prisma } from "@/lib/prisma";
import { requireTenantSession } from "@/lib/tenant-actions";
import { actionError, actionOk, type ActionResult } from "@/lib/action-result";
import { canFeature } from "@/lib/plan-limits";

const STATUS_LABEL: Record<string, string> = {
  DRAFT: "Anonim",
  NEW: "Nowy",
  CONTACTED: "Kontakt",
  VISIT_SCHEDULED: "Wizyta",
  WON: "Wygrany",
  LOST: "Stracony",
  COMPLETED: "Zakończony",
  ARCHIVED: "Archiwum",
  CONVERTED_TO_VISIT: "Wizyta",
};

function csvCell(v: string | number | null): string {
  const s = v === null || v === undefined ? "" : String(v);
  // Cytuj i escapuj — chroni przed przecinkami/cudzysłowami w danych.
  return `"${s.replace(/"/g, '""')}"`;
}

// Eksport leadów do CSV — funkcja Pro+. Zwraca treść CSV jako string
// (klient tworzy plik do pobrania). Gated przez canFeature(exportCsv).
export async function exportLeadsCsv(): Promise<ActionResult<{ csv: string; filename: string }>> {
  const { tenantId } = await requireTenantSession();

  const subscription = await prisma.subscription.findUnique({
    where: { tenantId },
    select: { plan: true, limitOverrides: true },
  });
  if (!canFeature(subscription, "exportCsv")) {
    return actionError(
      "Eksport leadów jest dostępny w planie Pro i wyższych. Przejdź na wyższy plan.",
    );
  }

  const quotes = await prisma.quote.findMany({
    where: { tenantId },
    orderBy: { createdAt: "desc" },
    include: { roomType: { select: { label: true } } },
  });

  const header = [
    "Data",
    "Status",
    "Kontakt",
    "Telefon",
    "E-mail",
    "Barthel",
    "Próg opieki",
    "Pokój",
    "Miesiące",
    "Wycena od",
    "Wycena do",
    "Po limicie",
  ];

  const rows = quotes.map((q) =>
    [
      csvCell(new Date(q.createdAt).toLocaleString("pl-PL")),
      csvCell(STATUS_LABEL[q.status] ?? q.status),
      csvCell(q.contactName),
      csvCell(q.contactPhone),
      csvCell(q.contactEmail),
      csvCell(q.barthelScore),
      csvCell(q.careTierLabel),
      csvCell(q.roomType?.label ?? null),
      csvCell(q.contractMonths),
      csvCell(q.estimateMin),
      csvCell(q.estimateMax),
      csvCell(q.overLimit ? "tak" : "nie"),
    ].join(","),
  );

  // BOM dla poprawnego otwarcia polskich znaków w Excelu.
  const csv = "﻿" + [header.map(csvCell).join(","), ...rows].join("\r\n");
  const filename = `leady-${new Date().toISOString().slice(0, 10)}.csv`;

  return actionOk({ csv, filename });
}
