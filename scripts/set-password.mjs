// Zmiana hasła konta CareQuote bezpośrednio w bazie (aplikacja nie ma jeszcze
// ekranu zmiany hasła). Hasła są hashowane bcryptem — tak samo jak w seedzie i
// w logice logowania (lib/auth.ts).
//
// Użycie:
//   node scripts/set-password.mjs <email> <noweHaslo>
//   node scripts/set-password.mjs --all <noweHaslo>     # to samo hasło dla wszystkich kont
//
// Wymaga w .env.local: DIRECT_URL wskazującego na bazę "carequote".

import { neon } from "@neondatabase/serverless";
import bcrypt from "bcryptjs";
import { config } from "dotenv";

config({ path: ".env.local" });
config({ path: ".env" });

const sql = neon(process.env.DIRECT_URL);

const [arg1, arg2] = process.argv.slice(2);
if (!arg1 || !arg2) {
  console.error("Użycie: node scripts/set-password.mjs <email|--all> <noweHaslo>");
  process.exit(1);
}

// Konto może być w PlatformAdmin (super-admin) albo TenantUser (panel placówki).
async function setFor(email, hash) {
  const admin = await sql.query(
    `UPDATE "PlatformAdmin" SET password=$1 WHERE email=$2 RETURNING email`,
    [hash, email],
  );
  if (admin.length) return `PlatformAdmin: ${email}`;
  const user = await sql.query(
    `UPDATE "TenantUser" SET password=$1 WHERE email=$2 RETURNING email`,
    [hash, email],
  );
  if (user.length) return `TenantUser: ${email}`;
  return `⚠ nie znaleziono konta: ${email}`;
}

async function main() {
  const newPassword = arg2;
  const hash = await bcrypt.hash(newPassword, 10);

  let emails;
  if (arg1 === "--all") {
    const admins = await sql.query(`SELECT email FROM "PlatformAdmin"`);
    const users = await sql.query(`SELECT email FROM "TenantUser"`);
    emails = [...admins, ...users].map((r) => r.email);
  } else {
    emails = [arg1];
  }

  console.log(`→ Ustawiam nowe hasło dla ${emails.length} konta/kont...`);
  for (const email of emails) {
    console.log("  ✓ " + (await setFor(email, hash)));
  }
  console.log("✅ Gotowe. Zaloguj się nowym hasłem.");
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("✗ Błąd:", e.message ?? e);
    process.exit(1);
  });
