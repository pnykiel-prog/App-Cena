// Weryfikacja zawartości bazy carequote przez sterownik Neon (HTTP).
//   node scripts/verify-db.mjs
import { neon } from "@neondatabase/serverless";
import { config } from "dotenv";

config({ path: ".env.local" });
config({ path: ".env" });

const sql = neon(process.env.DIRECT_URL);

const tables = [
  "PlatformAdmin",
  "Tenant",
  "Subscription",
  "TenantUser",
  "NotificationSetting",
  "RoomType",
  "CareTier",
  "MedicalModifier",
  "AddonService",
  "ContractDiscount",
  "Quote",
  "VisitBooking",
];

const counts = {};
for (const t of tables) {
  const r = await sql.query(`SELECT count(*)::int AS c FROM "${t}"`);
  counts[t] = r[0].c;
}
console.table(counts);
