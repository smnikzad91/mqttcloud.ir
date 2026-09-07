import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectDB } from "@/lib/mongodb";
import NewsTag from "@/models/NewsTag";
import NewsItem from "@/models/NewsItem";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await connectDB();

  const names: string[] = await NewsItem.distinct("category") as string[];

  let inserted = 0;
  let skipped = 0;

  for (const name of names) {
    const exists = await NewsTag.findOne({ name });
    if (exists) { skipped++; continue; }
    await NewsTag.create({ name });
    inserted++;
  }

  return NextResponse.json({ inserted, skipped });
}
