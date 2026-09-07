import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Announcement from "@/models/Announcement";

export async function GET() {
  await connectDB();
  const item = await Announcement.findOne({ active: true }).sort({ order: 1, createdAt: -1 });
  return NextResponse.json(item ?? null);
}
