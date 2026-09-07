import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectDB } from "@/lib/mongodb";
import LegalPage, { LegalPageType } from "@/models/LegalPage";

type Params = { params: Promise<{ type: string }> };

export async function GET(_req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "admin")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { type } = await params;
  if (type !== "privacy" && type !== "terms")
    return NextResponse.json({ error: "Invalid type" }, { status: 400 });

  await connectDB();
  const page = await LegalPage.findOne({ type });
  return NextResponse.json(page ?? { type, title: "", content: "" });
}

export async function PUT(req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "admin")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { type } = await params;
  if (type !== "privacy" && type !== "terms")
    return NextResponse.json({ error: "Invalid type" }, { status: 400 });

  await connectDB();
  const { title, content } = await req.json();
  const page = await LegalPage.findOneAndUpdate(
    { type: type as LegalPageType },
    { title, content },
    { upsert: true, returnDocument: "after", runValidators: true }
  );
  return NextResponse.json(page);
}
