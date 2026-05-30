// Tworzy bazę "carequote" (jeśli brak) i aplikuje DDL przez sterownik Neon
// po HTTP (port 443) — działa za proxy HTTP/HTTPS, gdzie surowy TCP 5432 jest
// blokowany (np. Claude Code on the web). To samo robi setup-neon.sh, ale ten
// wymaga psql + TCP 5432.
//
// Użycie:
//   node scripts/apply-ddl.mjs <ścieżka_do_pliku.sql>
//
// DDL wygeneruj wcześniej offline (Prisma 7):
//   npx prisma migrate diff --from-empty \
//     --to-schema prisma/schema.prisma --script > schema.sql
//
// Wymaga w .env.local: DIRECT_URL wskazującego na bazę docelową "carequote".

import { neon } from "@neondatabase/serverless";
import { readFileSync } from "node:fs";
import { config } from "dotenv";

config({ path: ".env.local" });
config({ path: ".env" });

const sqlFile = process.argv[2];
if (!sqlFile) {
  console.error("✗ Podaj ścieżkę do pliku .sql");
  process.exit(1);
}

const directUrl = process.env.DIRECT_URL;
if (!directUrl) {
  console.error("✗ Brak DIRECT_URL w środowisku");
  process.exit(1);
}

// Endpoint administracyjny → baza domyślna "neondb" (CREATE DATABASE nie może
// działać wewnątrz docelowej bazy).
const adminUrl = directUrl.replace(/\/carequote(\?|$)/, "/neondb$1");

async function main() {
  // 1) Utwórz bazę carequote jeśli nie istnieje
  const admin = neon(adminUrl);
  const existing = await admin`SELECT 1 AS ok FROM pg_database WHERE datname = 'carequote'`;
  if (existing.length > 0) {
    console.log("  ✓ Baza 'carequote' już istnieje.");
  } else {
    await admin`CREATE DATABASE carequote`;
    console.log("  ✓ Utworzono bazę 'carequote'.");
  }

  // 2) Aplikuj DDL do bazy carequote
  const sql = neon(directUrl);
  const raw = readFileSync(sqlFile, "utf8");

  // Podział na pojedyncze polecenia po średnikach na końcu linii.
  // DDL z `prisma migrate diff` nie zawiera funkcji/PL z wewnętrznymi średnikami,
  // więc prosty split jest bezpieczny.
  const statements = raw
    .split(/;\s*\n/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !s.startsWith("--"));

  console.log(`→ Wykonuję ${statements.length} poleceń DDL...`);
  let n = 0;
  for (const stmt of statements) {
    await sql.query(stmt);
    n++;
  }
  console.log(`  ✓ Wykonano ${n} poleceń DDL.`);
}

main()
  .then(() => {
    console.log("✅ DDL zaaplikowany do bazy 'carequote'.");
    process.exit(0);
  })
  .catch((e) => {
    console.error("✗ Błąd:", e.message ?? e);
    process.exit(1);
  });
