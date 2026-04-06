import { DefaultSession } from "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  /**
   * Returned by `useSession`, `getSession` and received as a prop on the `SessionProvider` React Context
   */
  interface Session {
    user: {
      role: string;
      username?: string | null;
    } & DefaultSession["user"];
  }

  interface User {
    role: string;
    username?: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role: string;
    username?: string | null;
    pictureFetched?: boolean;
  }
}
