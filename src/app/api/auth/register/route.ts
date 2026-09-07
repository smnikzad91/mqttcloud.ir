import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";

const AVATAR_COUNT = 37;
const IRANIAN_MOBILE = /^09[0-9]{9}$/;

function randomDefaultAvatar(): string {
  const n = Math.floor(Math.random() * AVATAR_COUNT) + 1;
  return `/images/user/user-${String(n).padStart(2, "0")}.jpg`;
}

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

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return NextResponse.json({ error: "این ایمیل قبلاً ثبت شده است" }, { status: 409 });
    }

    const existingPhone = await User.findOne({ phone });
    if (existingPhone) {
      return NextResponse.json(
        { error: "این شماره موبایل قبلاً ثبت شده است" },
        { status: 409 }
      );
    }

    const hashed = await bcrypt.hash(password, 12);
    try {
      await User.create({ firstName, lastName, email, phone, password: hashed, avatar: randomDefaultAvatar() });
    } catch (err: unknown) {
      if ((err as { code?: number }).code === 11000) {
        return NextResponse.json(
          { error: "این ایمیل یا شماره موبایل قبلاً ثبت شده است" },
          { status: 409 }
        );
      }
      throw err;
    }

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (err) {
    console.error("[register]", err);
    return NextResponse.json({ error: "خطای سرور. لطفاً دوباره تلاش کنید" }, { status: 500 });
  }
}
