import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { auth } from "@/auth";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { currentPassword, newPassword } = body;

  if (typeof currentPassword !== "string" || typeof newPassword !== "string") {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  if (newPassword.length < 8) {
    return NextResponse.json(
      { error: "رمز عبور باید حداقل ۸ کاراکتر باشد" },
      { status: 400 }
    );
  }

  await connectDB();
  const user = await User.findById(session.user.id).select("password");
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const match = await bcrypt.compare(currentPassword, user.password);
  if (!match) {
    return NextResponse.json(
      { error: "رمز عبور فعلی اشتباه است" },
      { status: 400 }
    );
  }

  if (await bcrypt.compare(newPassword, user.password)) {
    return NextResponse.json(
      { error: "رمز عبور جدید نمی‌تواند همان رمز فعلی باشد" },
      { status: 400 }
    );
  }

  const hashed = await bcrypt.hash(newPassword, 12);
  await User.findByIdAndUpdate(session.user.id, { password: hashed });

  return NextResponse.json({ success: true });
}
