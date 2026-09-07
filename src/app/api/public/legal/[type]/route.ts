import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import LegalPage from "@/models/LegalPage";

type Params = { params: Promise<{ type: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { type } = await params;
  if (type !== "privacy" && type !== "terms")
    return NextResponse.json({ error: "Invalid type" }, { status: 400 });

  await connectDB();
  const page = await LegalPage.findOne({ type });
  return NextResponse.json(page ?? { type, title: "", content: "" });
}
