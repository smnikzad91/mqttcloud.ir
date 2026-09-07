import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import ContactMessage from "@/models/ContactMessage";

export async function POST(req: Request) {
  const body = await req.json();
  const { name, email, subject, message } = body ?? {};

  if (!name?.trim() || !email?.trim() || !subject?.trim() || !message?.trim())
    return NextResponse.json({ error: "All fields are required." }, { status: 400 });

  await connectDB();
  const item = await ContactMessage.create({ name, email, subject, message });
  return NextResponse.json(item, { status: 201 });
}
