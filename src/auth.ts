import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import LoginOtp from "@/models/LoginOtp";
import { authConfig } from "./auth.config";

const LOGIN_OTP_MAX_ATTEMPTS = 5;

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email:    { label: "Email",    type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        await connectDB();
        const user = await User.findOne({ email: credentials.email });
        if (!user) return null;

        const valid = await bcrypt.compare(credentials.password as string, user.password);
        if (!valid) return null;

        return {
          id:        user._id.toString(),
          email:     user.email,
          name:      `${user.firstName} ${user.lastName}`,
          role:      user.role,
          avatar:    user.avatar,
          createdAt: user.createdAt?.toISOString() ?? "",
        };
      },
    }),
    // "Log in with phone" — the code is requested separately via
    // POST /api/auth/login-otp/start, which is where a specific error
    // ("no account with that number", "wait N seconds") belongs; authorize()
    // here can only return null on any failure, so (like the email/password
    // provider above) the client just shows one generic message.
    CredentialsProvider({
      id: "phone-otp",
      name: "Phone OTP",
      credentials: {
        phone: { label: "Phone", type: "text" },
        code:  { label: "Code",  type: "text" },
      },
      async authorize(credentials) {
        const phone = credentials?.phone as string;
        const code  = credentials?.code as string;
        if (!phone || !code) return null;

        await connectDB();

        const pending = await LoginOtp.findOne({ phone });
        if (!pending) return null;

        if (pending.attempts >= LOGIN_OTP_MAX_ATTEMPTS) {
          await pending.deleteOne();
          return null;
        }

        const codeHash = crypto.createHash("sha256").update(code).digest("hex");
        if (codeHash !== pending.codeHash) {
          pending.attempts += 1;
          await pending.save();
          return null;
        }

        await pending.deleteOne();

        const user = await User.findOne({ phone });
        if (!user) return null;

        return {
          id:        user._id.toString(),
          email:     user.email,
          name:      `${user.firstName} ${user.lastName}`,
          role:      user.role,
          avatar:    user.avatar,
          createdAt: user.createdAt?.toISOString() ?? "",
        };
      },
    }),
  ],
});
