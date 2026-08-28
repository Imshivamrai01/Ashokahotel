import type { NextAuthConfig } from "next-auth";
import type { UserRole } from "@/types";

/**
 * Edge-compatible auth config — no Node.js-only imports.
 * Used by both middleware and the full auth.ts.
 */
export const authConfig: NextAuthConfig = {
  providers: [], // providers added in auth.ts (Node.js only)

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role: UserRole }).role as string;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        (session.user as { role: UserRole }).role = token.role as UserRole;
        session.user.name = (token.name as string) ?? "";
        session.user.email = (token.email as string) ?? "";
      }
      return session;
    },
    authorized({ auth }) {
      // Used by middleware — allow all; route-level checks are in middleware.ts
      return !!auth;
    },
  },

  pages: {
    signIn: "/login",
    error: "/login",
  },

  session: {
    strategy: "jwt",
    maxAge: 12 * 60 * 60, // 12 hours
  },
};
