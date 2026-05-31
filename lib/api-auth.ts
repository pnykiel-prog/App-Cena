// ─── Uwierzytelnianie REST API kluczem ────────────────────────────────────────
//
// Klucz: "cq_" + 32 losowe bajty (hex). Przechowujemy tylko SHA-256 (keyHash,
// unikalny → lookup O(1)). Klucze API są wysokoentropijne, więc SHA-256 jest
// bezpieczny i szybki (inaczej niż hasła, które wymagają bcrypt/argon).

import { createHash, randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";

const KEY_PREFIX = "cq_";

export function generateApiKey(): { plain: string; hash: string; prefix: string } {
  const plain = KEY_PREFIX + randomBytes(32).toString("hex");
  return {
    plain,
    hash: hashApiKey(plain),
    prefix: plain.slice(0, 11), // "cq_" + 8 znaków do identyfikacji w UI
  };
}

export function hashApiKey(plain: string): string {
  return createHash("sha256").update(plain).digest("hex");
}

export type ApiAuthResult =
  | { ok: true; tenantId: string; keyId: string }
  | { ok: false; status: 401; error: string };

// Weryfikuje nagłówek Authorization: Bearer cq_... Zwraca tenantId właściciela
// klucza. Aktualizuje lastUsedAt (best-effort).
export async function authenticateApiKey(req: Request): Promise<ApiAuthResult> {
  const header = req.headers.get("authorization") ?? "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) {
    return { ok: false, status: 401, error: "Brak nagłówka Authorization: Bearer <klucz>" };
  }
  const plain = match[1].trim();
  if (!plain.startsWith(KEY_PREFIX)) {
    return { ok: false, status: 401, error: "Nieprawidłowy format klucza API" };
  }

  const key = await prisma.apiKey.findUnique({
    where: { keyHash: hashApiKey(plain) },
    select: { id: true, tenantId: true, isActive: true },
  });
  if (!key || !key.isActive) {
    return { ok: false, status: 401, error: "Nieprawidłowy lub nieaktywny klucz API" };
  }

  await prisma.apiKey
    .update({ where: { id: key.id }, data: { lastUsedAt: new Date() } })
    .catch(() => {});

  return { ok: true, tenantId: key.tenantId, keyId: key.id };
}
