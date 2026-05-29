"use server";

import { auth } from "@/lib/auth";

export async function requireAdminSession() {
  const session = await auth();
  if (!session?.user || session.user.userType !== "admin") {
    throw new Error("Brak autoryzacji super-admina");
  }
  return {
    adminId: session.user.id,
    email: session.user.email ?? "",
  };
}
