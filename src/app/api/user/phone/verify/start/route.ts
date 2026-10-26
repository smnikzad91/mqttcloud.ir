import { NextResponse } from "next/server";
import crypto from "crypto";
import { auth } from "@/auth";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import LoginOtp from "@/models/LoginOtp";
import { sendOtpSms, newClientSmsId } from "@/lib/sms";

const OTP_TTL_MS = 10 * 60 * 1000;
const RESEND_COOLDOWN_MS = 60 * 1000;

// Sends a verification code to the signed-in user's own phone (never a
// phone supplied by the request — this proves the account holder controls
// the number already on file, not an arbitrary one). Reuses LoginOtp:
// same shape (hashed code, attempts, TTL) as the "log in with phone" flow,
// just consumed by a different confirm step.
export async function POST() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();

  const user = await User.findById(session.user.id).select("phone phoneVerified");
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!user.phone) return NextResponse.json({ error: "شماره موبایلی برای حساب شما ثبت نشده است" }, { status: 400 });
  if (user.phoneVerified) return NextResponse.json({ ok: true, alreadyVerified: true });

  const pending = await LoginOtp.findOne({ phone: user.phone });
  if (pending) {
    const elapsed = Date.now() - pending.createdAt.getTime();
    if (elapsed < RESEND_COOLDOWN_MS) {
      const waitSec = Math.ceil((RESEND_COOLDOWN_MS - elapsed) / 1000);
      return NextResponse.json({ error: `لطفاً ${waitSec} ثانیه صبر کنید و دوباره تلاش کنید` }, { status: 429 });
    }
  }

  const code = String(Math.floor(100000 + Math.random() * 900000));
  const codeHash = crypto.createHash("sha256").update(code).digest("hex");

  await LoginOtp.findOneAndUpdate(
    { phone: user.phone },
    { phone: user.phone, codeHash, attempts: 0, expiresAt: new Date(Date.now() + OTP_TTL_MS), createdAt: new Date() },
    { upsert: true, setDefaultsOnInsert: true }
  );

  const sms = await sendOtpSms(user.phone, code, newClientSmsId("phoneverify"));
  if (!sms.status) {
    // See the matching note in /api/auth/register/start — this zone's
    // Cloudflare proxy swallows 502/503/504 bodies, so 400 it is.
    return NextResponse.json({ error: "ارسال پیامک ناموفق بود. لطفاً دوباره تلاش کنید" }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
