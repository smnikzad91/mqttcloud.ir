import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectDB } from "@/lib/mongodb";
import SiteSeo from "@/models/SiteSeo";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "admin")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await connectDB();
  const seo = await SiteSeo.findOne();
  return NextResponse.json(seo ?? { title: "", description: "", keywords: [] });
}

export async function PUT(req: Request) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "admin")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await connectDB();
  const { title, description, keywords } = await req.json();
  const seo = await SiteSeo.findOneAndUpdate(
    {},
    { title, description, keywords },
    { upsert: true, returnDocument: "after", runValidators: true, setDefaultsOnInsert: true }
  );
  return NextResponse.json(seo);
}
