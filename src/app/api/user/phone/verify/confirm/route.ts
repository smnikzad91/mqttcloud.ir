import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { auth } from "@/auth";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import LoginOtp from "@/models/LoginOtp";

const MAX_ATTEMPTS = 5;

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { code } = await req.json();
  if (!code) return NextResponse.json({ error: "کد تایید الزامی است" }, { status: 400 });

  await connectDB();

  const user = await User.findById(session.user.id).select("phone phoneVerified");
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!user.phone) return NextResponse.json({ error: "شماره موبایلی برای حساب شما ثبت نشده است" }, { status: 400 });
  if (user.phoneVerified) return NextResponse.json({ ok: true, alreadyVerified: true });

  const pending = await LoginOtp.findOne({ phone: user.phone });
  if (!pending) {
    return NextResponse.json({ error: "کد منقضی شده است. لطفاً دوباره درخواست دهید" }, { status: 400 });
  }

  if (pending.attempts >= MAX_ATTEMPTS) {
    await pending.deleteOne();
    return NextResponse.json({ error: "تعداد تلاش بیش از حد است. لطفاً دوباره درخواست دهید" }, { status: 429 });
  }

  const codeHash = crypto.createHash("sha256").update(String(code)).digest("hex");
  if (codeHash !== pending.codeHash) {
    pending.attempts += 1;
    await pending.save();
    return NextResponse.json({ error: "کد وارد شده صحیح نیست" }, { status: 400 });
  }

  await pending.deleteOne();

  user.phoneVerified = true;
  await user.save();

  return NextResponse.json({ ok: true });
}
