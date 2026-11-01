import path from "path";
import { serveUpload } from "@/lib/serveUpload";

// Avatars added after the server started (see src/lib/serveUpload.ts).
export async function GET(_req: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const { path: segments } = await params;
  return serveUpload(path.join(process.cwd(), "public", "images", "uploads"), segments);
}
