import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { authConfig } from "./auth.config";
import { AuthService } from "@/services/auth.service";
import { UserRepository } from "@/repositories/user.repository";
import { AuditService } from "@/services/audit.service";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  secret: env.AUTH_SECRET,
  callbacks: {
    ...authConfig.callbacks,
    async signIn({ user, account, profile }) {
      if (account?.provider === "google" && profile?.email) {
        await UserRepository.upsertGoogleUser({
          email: profile.email,
          name: profile.name || "User",
          image: user?.image || profile.picture,
          googleId: profile.sub || "",
        });
      }

      // Update last login for all successful sign-ins
      if (user?.email) {
        try {
          const dbUser = await UserRepository.findByEmail(user.email);
          if (dbUser && dbUser._id) {
            await UserRepository.updateLastLogin(dbUser._id.toString());
            
            // Log successful login
            // Note: user.id might be undefined here depending on provider, so use dbUser._id
            // We pass actorOverride because auth() won't have the session yet
            AuditService.log(
              "LOGIN_SUCCESS", 
              dbUser._id.toString(), 
              "User", 
              { provider: account?.provider },
              { id: dbUser._id.toString(), email: dbUser.email }
            ).catch(err => logger.error("Failed to log login success", err as unknown));
          }
        } catch (error) {
          logger.error("Failed to update last login", error as unknown);
        }
      }

      return true;
    },
    async jwt({ token, user, account, trigger, session }) {
      if (user) {
        // First sign in
        if (account?.provider === "google") {
          // Fetch user from DB to get role and username
          const dbUser = await UserRepository.findByEmail(user.email!);
          if (dbUser) {
            token.id = dbUser._id.toString();
            token.role = dbUser.role;
            token.username = dbUser.username;
            token.picture = dbUser.avatarUrl; // Use DB avatar
          }
        } else {
          // Credentials login - user object is already populated from authorize()
          token.role = user.role;
          token.username = user.username;
          token.id = user.id;
          token.picture = user.image;
        }
        token.pictureFetched = true;
      } else if (trigger === "update" && session) {
        // Only update if explicitly triggered by client
        // This prevents hitting the DB on every single page load
        if (session.user) {
          token.role = session.user.role ?? token.role;
          token.username = session.user.username ?? token.username;
          token.picture = session.user.image ?? token.picture;
          token.name = session.user.name ?? token.name;
        }
      }
      // Removed the "else" block that was checking !token.picture and hitting DB on every request.
      // This was the cause of the slow page loads (18s) because it ran on every JWT decode.
      
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.username = token.username as string;
        session.user.image = token.picture as string; // Ensure image is passed
        session.user.name = token.name as string;
      }
      return session;
    },
  },
  providers: [
    Google({
      authorization: { params: { prompt: "select_account" } },
    }),
    Credentials({
      name: "Credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
        totp: { label: "2FA Code", type: "text" },
      },
      async authorize(credentials) {
        try {
          const user = await AuthService.validateCredentials(credentials);
          
          if (user) {
            // Check 2FA if enabled
            if (user.twoFactorEnabled) {
              const totpCode = credentials?.totp as string;
              if (!totpCode) {
                throw new Error("2FA_REQUIRED");
              }
              const { SecurityService } = await import("@/services/security.service");
              const isValid = await SecurityService.validate2FAToken(user._id.toString(), totpCode);
              if (!isValid) {
                throw new Error("2FA_INVALID");
              }
            }

            return {
              id: user._id.toString(),
              name: user.name,
              email: user.email,
              role: user.role,
              username: user.username,
              image: user.avatarUrl,
            };
          }
          
          const email = credentials?.username as string;
          AuditService.log(
            "LOGIN_FAILED", 
            undefined, 
            "User", 
            { reason: "Invalid credentials", email },
            { id: "unknown", email: email || "unknown" }
          ).catch(e => logger.error("Failed to log login failure", e as unknown));
          
          return null;
        } catch (error) {
           logger.error("Authorize error", error as unknown);
           if (error instanceof Error && (
             error.message === "Email verification required" ||
             error.message === "2FA_REQUIRED" ||
             error.message === "2FA_INVALID"
           )) {
             throw error;
           }
           return null;
        }
      },
    }),
  ],
  events: {
    async signOut(message) {
      // message has { token, session } depending on strategy. 
      // For JWT strategy, it has token.
      const token = "token" in message ? message.token : null;
      // const session = "session" in message ? message.session : null; // Unused for JWT strategy
      
      const userId = token?.sub || "unknown";
      const userEmail = token?.email || "unknown";
      
      if (userId !== "unknown" || userEmail !== "unknown") {
        await AuditService.log(
          "LOGOUT",
          userId,
          "User",
          { method: "signOut" },
          { id: userId, email: userEmail }
        ).catch(err => logger.error("Failed to log logout", err as unknown));
      }
    },
  },
});
