import { readFile, stat } from "fs/promises";
import path from "path";

// `next start` only serves the public/ files that existed when the server
// started, so anything uploaded afterwards (ticket screenshots, avatars,
// blog and news images…) 404s until the next deploy. The /uploads and
// /images/uploads route handlers fall back to this, which reads the file from
// disk at request time. Images only, and never outside the given folder.

const TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".webp": "image/webp",
};

export async function serveUpload(baseDir: string, segments: string[]): Promise<Response> {
  const notFound = () => new Response("Not found", { status: 404 });
  const type = TYPES[path.extname(segments.at(-1) ?? "").toLowerCase()];
  if (!type || segments.some((s) => s === ".." || s.includes("/") || s.includes("\\") || s.includes("\0"))) return notFound();

  const root = path.resolve(baseDir);
  const file = path.resolve(root, ...segments);
  if (!file.startsWith(root + path.sep)) return notFound();

  try {
    const info = await stat(file);
    if (!info.isFile()) return notFound();
    const body = await readFile(file);
    return new Response(new Uint8Array(body), {
      headers: {
        "Content-Type": type,
        "Content-Length": String(body.length),
        "Cache-Control": "public, max-age=0",  // same as next start's public/ files, so a deleted upload isn't kept by the CDN
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return notFound();
  }
}
