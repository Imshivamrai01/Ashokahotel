import NextAuth, { type DefaultSession } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { connectDB } from "@/lib/db/mongoose";
import AdminUser from "@/lib/db/models/AdminUser";
import Staff from "@/lib/db/models/Staff";
import type { UserRole } from "@/types";
import { authConfig } from "@/lib/auth.config";

// Extend NextAuth session types
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: UserRole;
    } & DefaultSession["user"];
  }
  interface User {
    id: string;
    role: UserRole;
  }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        role: { label: "Role", type: "text" }, // hint for login form
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        await connectDB();

        const email = credentials.email as string;
        const password = credentials.password as string;
        const roleHint = credentials.role as string | undefined;

        // Try AdminUser first if role hint is "admin" or no hint
        if (!roleHint || roleHint === "admin") {
          const admin = await AdminUser.findOne({ email }).select("+password");
          if (admin) {
            if (!admin.isActive) throw new Error("account_inactive");
            const valid = await admin.comparePassword(password);
            if (valid) {
              return {
                id: admin._id.toString(),
                email: admin.email,
                name: admin.name,
                role: "admin" as UserRole,
              };
            }
            throw new Error("invalid_credentials");
          }
        }

        // Try Staff for all other roles
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const staffQuery: Record<string, any> = { email };
        if (roleHint && roleHint !== "admin") staffQuery.role = roleHint;

        const staff = await Staff.findOne(staffQuery).select("+password");
        if (staff) {
          if (!staff.isActive) throw new Error("account_inactive");
          const valid = await staff.comparePassword(password);
          if (valid) {
            return {
              id: staff._id.toString(),
              email: staff.email as string,
              name: staff.name as string,
              role: staff.role as UserRole,
            };
          }
          throw new Error("invalid_credentials");
        }

        throw new Error("invalid_credentials");
      },
    }),
  ],
});

// Role-based helpers (re-exported from edge-safe module)
export { ROLE_REDIRECTS, ROLE_LABELS } from "@/lib/auth-constants";
