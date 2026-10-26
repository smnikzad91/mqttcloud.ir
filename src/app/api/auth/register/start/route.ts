import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import PhoneOtp from "@/models/PhoneOtp";
import { sendOtpSms, newClientSmsId } from "@/lib/sms";

const IRANIAN_MOBILE = /^09[0-9]{9}$/;
const OTP_TTL_MS = 10 * 60 * 1000;
const RESEND_COOLDOWN_MS = 60 * 1000;

// Step 1 of signup: validate + stash the pending account (password already
// hashed) under its phone number, then text a 6-digit code. The real User
// is only created in /verify once that code is confirmed — so nothing here
// occupies the unique email/phone slots a real account would need, and a
// phone that never completes verification just expires via PhoneOtp's TTL.
export async function POST(req: NextRequest) {
  try {
    const { firstName, lastName, email, phone, password } = await req.json();

    if (!firstName || !lastName || !email || !phone || !password) {
      return NextResponse.json({ error: "همه فیلدها الزامی هستند" }, { status: 400 });
    }
    if (!IRANIAN_MOBILE.test(phone)) {
      return NextResponse.json(
        { error: "شماره موبایل باید با ۰۹ شروع شده و ۱۱ رقم باشد (مثال: ۰۹۱۱۹۱۰۰۹۹۱)" },
        { status: 400 }
      );
    }
    if (password.length < 8) {
      return NextResponse.json({ error: "رمز عبور باید حداقل ۸ کاراکتر باشد" }, { status: 400 });
    }

    await connectDB();

    const existingEmail = await User.findOne({ email: email.toLowerCase() });
    if (existingEmail) {
      return NextResponse.json({ error: "این ایمیل قبلاً ثبت شده است" }, { status: 409 });
    }
    const existingPhone = await User.findOne({ phone });
    if (existingPhone) {
      return NextResponse.json({ error: "این شماره موبایل قبلاً ثبت شده است" }, { status: 409 });
    }

    // Same phone resending too fast — also covers the case of calling this
    // route again as a deliberate "resend code" action.
    const pending = await PhoneOtp.findOne({ phone });
    if (pending) {
      const elapsed = Date.now() - pending.createdAt.getTime();
      if (elapsed < RESEND_COOLDOWN_MS) {
        const waitSec = Math.ceil((RESEND_COOLDOWN_MS - elapsed) / 1000);
        return NextResponse.json({ error: `لطفاً ${waitSec} ثانیه صبر کنید و دوباره تلاش کنید` }, { status: 429 });
      }
    }

    const code = String(Math.floor(100000 + Math.random() * 900000));
    const codeHash = crypto.createHash("sha256").update(code).digest("hex");
    const passwordHash = await bcrypt.hash(password, 12);

    await PhoneOtp.findOneAndUpdate(
      { phone },
      {
        phone,
        codeHash,
        attempts: 0,
        payload: { firstName, lastName, email: email.toLowerCase(), passwordHash },
        expiresAt: new Date(Date.now() + OTP_TTL_MS),
        createdAt: new Date(),
      },
      { upsert: true, setDefaultsOnInsert: true }
    );

    const sms = await sendOtpSms(phone, code, newClientSmsId("otp-signup"));
    if (!sms.status) {
      // Cloudflare replaces 502/503/504 bodies with its own generic error
      // page on this zone, so a real 5xx here would never reach the client
      // as JSON — 400 is the honest-enough option that's never intercepted.
      return NextResponse.json({ error: "ارسال پیامک ناموفق بود. لطفاً دوباره تلاش کنید" }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[register/start]", err);
    return NextResponse.json({ error: "خطای سرور. لطفاً دوباره تلاش کنید" }, { status: 500 });
  }
}
