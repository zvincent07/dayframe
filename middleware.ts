import NextAuth from "next-auth";
import { authConfig } from "./src/auth.config";
import { NextResponse } from "next/server";
import crypto from "crypto";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  // Add pathname to headers for server components to read
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-pathname", req.nextUrl.pathname);

  const res = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
  const existing = req.cookies.get("df_csrf")?.value;
  if (!existing) {
    const token = crypto.randomBytes(32).toString("base64url");
    res.cookies.set("df_csrf", token, {
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
      path: "/",
    });
  }
  return res;
});

export const config = {
  // https://nextjs.org/docs/app/building-your-application/routing/middleware#matcher
  matcher: ['/((?!api|_next/static|_next/image|.*\\.png$).*)'],
};
