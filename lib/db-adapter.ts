// Wspólna fabryka adaptera bazy dla Prisma.
//
// - Host *.neon.tech  → adapter Neon (połączenie po WebSocket/HTTPS przez @neondatabase/serverless).
//   Działa również za proxy HTTP/HTTPS (np. Claude Code on the web), gdzie surowy TCP 5432 jest blokowany.
// - Pozostałe hosty (np. lokalny 127.0.0.1) → adapter pg (klasyczne TCP).
//
// Dzięki temu ten sam kod obsługuje lokalny PostgreSQL i Neon bez zmian.

import type { SqlDriverAdapterFactory } from "@prisma/driver-adapter-utils";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaNeon } from "@prisma/adapter-neon";
import { neonConfig } from "@neondatabase/serverless";
import ws from "ws";

// W środowisku Node trzeba dostarczyć implementację WebSocket dla sterownika Neon.
if (typeof WebSocket === "undefined") {
  neonConfig.webSocketConstructor = ws;
}

export function createDbAdapter(
  connectionString: string,
): SqlDriverAdapterFactory {
  if (connectionString.includes(".neon.tech")) {
    return new PrismaNeon({ connectionString });
  }
  return new PrismaPg({ connectionString });
}
