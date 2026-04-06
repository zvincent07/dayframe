import type { NextAuthConfig } from "next-auth";
import { NextResponse } from "next/server";
import { hasPermission } from "@/permissions";
import { logger } from "@/lib/logger";

export const authConfig = {
  pages: {
    signIn: "/", // We want the login to be on the home page as requested
  },
  callbacks: {
    authorized({ auth, request }) {
      const { nextUrl } = request;
      const isLoggedIn = !!auth?.user;
      const isOnUser = nextUrl.pathname.startsWith("/user");
      const isOnAdmin = nextUrl.pathname.startsWith("/admin");
      const isOnMentor = nextUrl.pathname.startsWith("/mentor");

      if (isOnUser) {
        if (isLoggedIn) {
          // Allow admins and mentors to also view user pages if they want to.
          // Don't forcefully kick them out of the /user dashboard.
          return true;
        }
        return NextResponse.rewrite(new URL("/404", nextUrl));
      }

      if (isOnAdmin) {
        if (isLoggedIn && hasPermission(auth.user, "view:settings")) return true;
        return NextResponse.rewrite(new URL("/404", nextUrl));
      }

      if (isOnMentor) {
        if (isLoggedIn && hasPermission(auth.user, "view:assigned-journal")) return true;
        return NextResponse.rewrite(new URL("/404", nextUrl));
      }

      if (isLoggedIn) {
        if (nextUrl.pathname === "/" || nextUrl.pathname === "/login") {
          if (hasPermission(auth.user, "view:settings")) {
            return NextResponse.redirect(new URL("/admin/dashboard", nextUrl));
          }
          if (hasPermission(auth.user, "view:assigned-journal")) {
            return NextResponse.redirect(new URL("/mentor", nextUrl));
          }
          
          const defaultStartPage = request.cookies?.get("df_default_start_page")?.value;
          const target = defaultStartPage === "dashboard" ? "/user/dashboard" : "/user/today";
          
          return NextResponse.redirect(new URL(target, nextUrl));
        }
      }
      return true;
    },
    // Add simple jwt/session callbacks for Middleware to access role
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.role = token.role as string;
      }
      return session;
    },
  },
  session: {
    strategy: "jwt",
    maxAge: 7 * 24 * 60 * 60, // 7 days
  },
  providers: [], // Providers are configured in auth.ts to support Edge runtime compatibility
  logger: {
    error(code, ...message) {
      if (code instanceof Error && code.name === "CredentialsSignin") {
        // Suppress expected auth error
        return;
      }
      logger.error("NextAuth error", { code, message });
    },
  },
} satisfies NextAuthConfig;
