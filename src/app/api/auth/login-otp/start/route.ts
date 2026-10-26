import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import LoginOtp from "@/models/LoginOtp";
import { sendOtpSms, newClientSmsId } from "@/lib/sms";

const IRANIAN_MOBILE = /^09[0-9]{9}$/;
const OTP_TTL_MS = 10 * 60 * 1000;
const RESEND_COOLDOWN_MS = 60 * 1000;

// Requests a login code for an existing account. Unlike signup, there's no
// account-enumeration concern worth hiding here — this is an intentional
// login action, and the user already typed their own phone number to get
// this far, so telling them "no account with that number" is just honest UX.
export async function POST(req: NextRequest) {
  try {
    const { phone } = await req.json();
    if (!IRANIAN_MOBILE.test(phone)) {
      return NextResponse.json(
        { error: "شماره موبایل باید با ۰۹ شروع شده و ۱۱ رقم باشد" },
        { status: 400 }
      );
    }

    await connectDB();

    const user = await User.findOne({ phone }).select("_id").lean();
    if (!user) {
      return NextResponse.json({ error: "حسابی با این شماره موبایل یافت نشد" }, { status: 404 });
    }

    const pending = await LoginOtp.findOne({ phone });
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
      { phone },
      { phone, codeHash, attempts: 0, expiresAt: new Date(Date.now() + OTP_TTL_MS), createdAt: new Date() },
      { upsert: true, setDefaultsOnInsert: true }
    );

    const sms = await sendOtpSms(phone, code, newClientSmsId("otp-login"));
    if (!sms.status) {
      // See the matching note on /api/auth/register/start — this zone's
      // Cloudflare proxy swallows 502/503/504 bodies, so 400 it is.
      return NextResponse.json({ error: "ارسال پیامک ناموفق بود. لطفاً دوباره تلاش کنید" }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[login-otp/start]", err);
    return NextResponse.json({ error: "خطای سرور. لطفاً دوباره تلاش کنید" }, { status: 500 });
  }
}
