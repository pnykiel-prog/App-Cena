import NextAuth, { type DefaultSession } from "next-auth";
import "next-auth/jwt";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { authConfig } from "@/auth.config";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      userType: "tenant" | "admin";
      role?: string;
      tenantId?: string;
      tenantSlug?: string;
      tenantName?: string;
    } & DefaultSession["user"];
  }
  interface User {
    userType?: "tenant" | "admin";
    role?: string;
    tenantId?: string;
    tenantSlug?: string;
    tenantName?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    userType?: "tenant" | "admin";
    role?: string;
    tenantId?: string;
    tenantSlug?: string;
    tenantName?: string;
  }
}

const loginSchema = z.object({
  email: z.string().email("Niepoprawny adres e-mail"),
  password: z.string().min(1, "Wpisz hasło"),
  context: z.enum(["tenant", "admin"]).default("tenant"),
});

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Hasło", type: "password" },
        context: { label: "Context", type: "text" },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;
        const { email, password, context } = parsed.data;

        if (context === "admin") {
          const admin = await prisma.platformAdmin.findUnique({ where: { email } });
          if (!admin || !admin.password) return null;
          const ok = await bcrypt.compare(password, admin.password);
          if (!ok) return null;
          await prisma.platformAdmin.update({
            where: { id: admin.id },
            data: { lastLoginAt: new Date() },
          });
          return {
            id: admin.id,
            email: admin.email,
            name: admin.name,
            userType: "admin" as const,
          };
        }

        const user = await prisma.tenantUser.findUnique({ where: { email } });
        if (!user || !user.password) return null;
        if (user.status !== "ACTIVE") return null;
        const ok = await bcrypt.compare(password, user.password);
        if (!ok) return null;

        const tenant = await prisma.tenant.findUnique({
          where: { id: user.tenantId },
          select: { id: true, slug: true, name: true, status: true },
        });
        if (!tenant || tenant.status === "CANCELLED" || tenant.status === "SUSPENDED") {
          return null;
        }

        await prisma.tenantUser.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() },
        });

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          userType: "tenant" as const,
          role: user.role,
          tenantId: tenant.id,
          tenantSlug: tenant.slug,
          tenantName: tenant.name,
        };
      },
    }),
  ],
});
