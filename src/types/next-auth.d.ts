import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: string;
      avatar: string;
      createdAt: string;
    } & DefaultSession["user"];
  }
  interface User {
    role?: string;
    avatar?: string;
    createdAt?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: string;
    avatar?: string;
    createdAt?: string;
  }
}
