"use server";

import { auth } from "@/lib/auth";

export async function requireTenantSession() {
  const session = await auth();
  if (!session?.user || session.user.userType !== "tenant" || !session.user.tenantId) {
    throw new Error("Brak autoryzacji tenanta");
  }
  return {
    tenantId: session.user.tenantId,
    tenantSlug: session.user.tenantSlug ?? "",
    userId: session.user.id,
    email: session.user.email ?? "",
    role: session.user.role,
  };
}
