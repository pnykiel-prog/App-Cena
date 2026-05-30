// Tworzy bazę "carequote" w projekcie Neon przez sterownik HTTP (@neondatabase/serverless),
// działający na porcie 443 — przydatne, gdy surowy TCP 5432 jest zablokowany (np. proxy/CI).
//
// Wymaga connection stringu z uprawnieniami do CREATE DATABASE, wskazującego na ISTNIEJĄCĄ
// bazę (np. domyślną "neondb"). Podaj go w zmiennej ADMIN_DATABASE_URL, np.:
//   ADMIN_DATABASE_URL="postgresql://USER:PASS@HOST-pooler.../neondb?sslmode=require" \
//     node scripts/create-neon-db.mjs
//
// Nazwę tworzonej bazy można nadpisać przez TARGET_DB (domyślnie "carequote").
import { neon } from "@neondatabase/serverless";

const ADMIN_URL = process.env.ADMIN_DATABASE_URL;
const TARGET_DB = process.env.TARGET_DB ?? "carequote";

if (!ADMIN_URL) {
  console.error(
    "✗ Brak ADMIN_DATABASE_URL. Ustaw connection string do istniejącej bazy (np. neondb) " +
      "z uprawnieniem CREATE DATABASE.",
  );
  process.exit(1);
}

if (!/^[a-z_][a-z0-9_]*$/i.test(TARGET_DB)) {
  console.error(`✗ Niepoprawna nazwa bazy: ${TARGET_DB}`);
  process.exit(1);
}

const sql = neon(ADMIN_URL);

const existing = await sql.query(
  "SELECT 1 FROM pg_database WHERE datname = $1",
  [TARGET_DB],
);

if (existing.length > 0) {
  console.log(`ℹ Baza "${TARGET_DB}" już istnieje — pomijam tworzenie.`);
} else {
  // CREATE DATABASE nie może być w transakcji; HTTP-query Neona jest autocommit.
  await sql.query(`CREATE DATABASE ${TARGET_DB}`);
  console.log(`✓ Utworzono bazę "${TARGET_DB}".`);
}

const dbs = await sql.query(
  "SELECT datname FROM pg_database WHERE datistemplate = false ORDER BY 1",
);
console.log("Bazy w projekcie:", dbs.map((r) => r.datname).join(", "));
