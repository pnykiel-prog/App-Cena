import { PrismaClient } from "@prisma/client";
import { createDbAdapter } from "@/lib/db-adapter";

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL environment variable is not set");
  }
  const adapter = createDbAdapter(connectionString);
  return new PrismaClient({ adapter });
}

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

// Leniwa inicjalizacja: klient powstaje dopiero przy pierwszym użyciu (zapytaniu),
// a nie przy imporcie modułu. Dzięki temu `next build` może prerenderować strony
// statyczne (np. "/") bez ustawionego DATABASE_URL — zmienna jest wymagana dopiero
// w runtime, gdy faktycznie odpytujemy bazę.
function getPrisma(): PrismaClient {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = createPrismaClient();
  }
  return globalForPrisma.prisma;
}

export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop, receiver) {
    return Reflect.get(getPrisma(), prop, receiver);
  },
});

export default prisma;

