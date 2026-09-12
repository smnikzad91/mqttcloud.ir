import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import { sendPasswordResetEmail } from "@/lib/mailer";

const TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    if (!email) {
      return NextResponse.json({ error: "ایمیل الزامی است" }, { status: 400 });
    }

    await connectDB();

    const user = await User.findOne({ email: String(email).toLowerCase().trim() });

    // Always return the same response, whether or not the email is registered,
    // so this endpoint can't be used to enumerate accounts.
    if (user) {
      const token = crypto.randomBytes(32).toString("hex");
      const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

      user.resetPasswordTokenHash = tokenHash;
      user.resetPasswordExpires   = new Date(Date.now() + TOKEN_TTL_MS);
      await user.save();

      sendPasswordResetEmail({ to: user.email, firstName: user.firstName, token }).catch(console.error);
    }

    return NextResponse.json({
      success: true,
      message: "اگر این ایمیل در سامانه ثبت شده باشد، لینک بازیابی رمز عبور برای آن ارسال شد.",
    });
  } catch (err) {
    console.error("[forgot-password]", err);
    return NextResponse.json({ error: "خطای سرور. لطفاً دوباره تلاش کنید" }, { status: 500 });
  }
}
