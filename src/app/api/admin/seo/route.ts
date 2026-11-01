import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectDB } from "@/lib/mongodb";
import PageSeo from "@/models/PageSeo";
import { PAGE_SEO_DEFAULTS, SEO_PAGES, TITLE_SUFFIX, isSeoPage } from "@/lib/pageSeo";
import { cleanKeywords, seoFieldsError } from "@/lib/seoFields";

// Per-page search metadata for the public site (src/lib/pageSeo.ts).

async function requireAdmin() {
  const session = await auth();
  return session?.user?.id && session.user.role === "admin";
}

/** Every editable page with its effective values, defaults and whether an override exists. */
export async function GET() {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await connectDB();
  const saved = await PageSeo.find({ page: { $in: SEO_PAGES } }).lean();
  const byPage = new Map(saved.map((s) => [s.page, s]));

  return NextResponse.json(
    SEO_PAGES.map((page) => {
      const d = PAGE_SEO_DEFAULTS[page];
      const s = byPage.get(page);
      return {
        page,
        path: d.path,
        titleSuffix: d.absoluteTitle ? "" : TITLE_SUFFIX,
        title: s?.title ?? d.title,
        description: s?.description ?? d.description,
        keywords: s?.keywords ?? d.keywords,
        custom: !!s,
        updatedAt: s?.updatedAt ?? null,
        defaults: { title: d.title, description: d.description, keywords: d.keywords },
      };
    })
  );
}

/** Save one page's override. */
export async function PUT(req: Request) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const page = String(body.page ?? "");
  const title = String(body.title ?? "").trim();
  const description = String(body.description ?? "").trim();
  const keywords = cleanKeywords(body.keywords);

  if (!isSeoPage(page)) return NextResponse.json({ error: "Unknown page." }, { status: 400 });
  if (!title || !description) return NextResponse.json({ error: "Title and description are required." }, { status: 400 });
  const invalid = seoFieldsError(title, description, keywords);
  if (invalid) return NextResponse.json({ error: invalid }, { status: 400 });

  await connectDB();
  const saved = await PageSeo.findOneAndUpdate(
    { page },
    { page, title, description, keywords },
    { upsert: true, returnDocument: "after", runValidators: true }
  ).lean();
  return NextResponse.json({ page, title: saved?.title, description: saved?.description, keywords: saved?.keywords, custom: true, updatedAt: saved?.updatedAt });
}

/** Drop a page's override, so it goes back to the defaults. */
export async function DELETE(req: Request) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const page = new URL(req.url).searchParams.get("page") ?? "";
  if (!isSeoPage(page)) return NextResponse.json({ error: "Unknown page." }, { status: 400 });

  await connectDB();
  await PageSeo.deleteOne({ page });
  return NextResponse.json({ ok: true });
}
