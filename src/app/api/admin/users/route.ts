import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await connectDB();
  const users = await User.find().sort({ createdAt: -1 }).lean();

  return NextResponse.json(
    users.map((u) => ({
      id:            u._id,
      firstName:     u.firstName,
      lastName:      u.lastName,
      email:         u.email,
      role:          u.role,
      walletBalance: u.walletBalance,
      avatar:        u.avatar,
      phone:         u.phone,
      createdAt:     u.createdAt,
    }))
  );
}
