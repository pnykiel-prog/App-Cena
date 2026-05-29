import type { NextAuthConfig } from "next-auth";

// Edge-safe config — używany przez middleware. Nie wolno tu importować
// Prismy, bcrypt ani niczego node-only.
export const authConfig = {
  session: { strategy: "jwt" },
  pages: {
    signIn: "/logowanie",
    error: "/logowanie",
  },
  providers: [],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = (user as { id?: string }).id;
        token.userType = (user as { userType?: "tenant" | "admin" }).userType;
        token.role = (user as { role?: string }).role;
        token.tenantId = (user as { tenantId?: string }).tenantId;
        token.tenantSlug = (user as { tenantSlug?: string }).tenantSlug;
        token.tenantName = (user as { tenantName?: string }).tenantName;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.userType = (token.userType as "tenant" | "admin") ?? "tenant";
        session.user.role = token.role as string | undefined;
        session.user.tenantId = token.tenantId as string | undefined;
        session.user.tenantSlug = token.tenantSlug as string | undefined;
        session.user.tenantName = token.tenantName as string | undefined;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
