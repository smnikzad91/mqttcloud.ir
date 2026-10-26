import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import PhoneOtp from "@/models/PhoneOtp";
import { sendWelcomeSms, newClientSmsId } from "@/lib/sms";

const AVATAR_COUNT = 37;
const MAX_ATTEMPTS = 5;

function randomDefaultAvatar(): string {
  const n = Math.floor(Math.random() * AVATAR_COUNT) + 1;
  return `/images/user/user-${String(n).padStart(2, "0")}.jpg`;
}

// Step 2 of signup: confirm the code and only then create the real account.
export async function POST(req: NextRequest) {
  try {
    const { phone, code } = await req.json();
    if (!phone || !code) {
      return NextResponse.json({ error: "کد تایید الزامی است" }, { status: 400 });
    }

    await connectDB();

    const pending = await PhoneOtp.findOne({ phone });
    if (!pending) {
      return NextResponse.json({ error: "کد منقضی شده است. لطفاً دوباره ثبت‌نام کنید" }, { status: 400 });
    }

    if (pending.attempts >= MAX_ATTEMPTS) {
      await pending.deleteOne();
      return NextResponse.json({ error: "تعداد تلاش بیش از حد است. لطفاً دوباره ثبت‌نام کنید" }, { status: 429 });
    }

    const codeHash = crypto.createHash("sha256").update(String(code)).digest("hex");
    if (codeHash !== pending.codeHash) {
      pending.attempts += 1;
      await pending.save();
      return NextResponse.json({ error: "کد وارد شده صحیح نیست" }, { status: 400 });
    }

    const { firstName, lastName, email, passwordHash } = pending.payload;

    let user;
    try {
      user = await User.create({
        firstName, lastName, email, phone,
        password: passwordHash,
        avatar: randomDefaultAvatar(),
        phoneVerified: true,
      });
    } catch (err: unknown) {
      if ((err as { code?: number }).code === 11000) {
        await pending.deleteOne();
        return NextResponse.json(
          { error: "این ایمیل یا شماره موبایل در این فاصله ثبت شده است" },
          { status: 409 }
        );
      }
      throw err;
    }

    await pending.deleteOne();

    sendWelcomeSms(phone, firstName, newClientSmsId("welcome")).catch(console.error);

    return NextResponse.json({ success: true, email: user.email }, { status: 201 });
  } catch (err) {
    console.error("[register/verify]", err);
    return NextResponse.json({ error: "خطای سرور. لطفاً دوباره تلاش کنید" }, { status: 500 });
  }
}
