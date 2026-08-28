import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";
import { NextResponse } from "next/server";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  if (!req.auth?.user) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/admin/:path*",
    "/receptionist/:path*",
    "/captain/:path*",
    "/kitchen/:path*",
    "/cashier/:path*",
    "/leads/:path*",
    "/inventory/:path*",
  ],
};
