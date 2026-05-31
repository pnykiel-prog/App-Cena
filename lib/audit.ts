// ─── Audit log — zapis metadanych akcji ───────────────────────────────────────
//
// Zapisujemy KTO / CO / KIEDY — bez treści leadów ani danych osobowych
// mieszkańców (super-admin to procesor RODO). `summary` ma być neutralnym
// opisem (np. „Dodano pokój", „Zmieniono plan na PRO"), nie zawierać PII.
//
// logAction NIGDY nie rzuca — błąd audytu nie może wywrócić głównej operacji.

import { prisma } from "@/lib/prisma";
import type { AuditAction, AuditActorType } from "@prisma/client";

export type AuditActor = {
  type: AuditActorType;
  id: string;
  email: string;
};

export type LogActionInput = {
  actor: AuditActor;
  tenantId?: string | null; // null = akcja platformowa
  action: AuditAction;
  entity: string;
  entityId?: string | null;
  summary?: string;
};

export async function logAction(input: LogActionInput): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        tenantId: input.tenantId ?? null,
        actorType: input.actor.type,
        actorId: input.actor.id,
        actorEmail: input.actor.email,
        action: input.action,
        entity: input.entity,
        entityId: input.entityId ?? null,
        summary: input.summary ?? null,
      },
    });
  } catch (e) {
    // Świadomie połykamy — audyt jest pomocniczy, nie może blokować akcji.
    console.error("[audit] logAction failed:", e instanceof Error ? e.message : e);
  }
}

// Skrót dla aktora-tenanta (z requireTenantSession: userId + opcjonalny email).
export function tenantActor(userId: string, email: string): AuditActor {
  return { type: "TENANT_USER", id: userId, email };
}

// Skrót dla aktora-superadmina (z requireAdminSession: adminId + email).
export function adminActor(adminId: string, email: string): AuditActor {
  return { type: "PLATFORM_ADMIN", id: adminId, email };
}
