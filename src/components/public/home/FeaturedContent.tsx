import type { ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Calendar, Clock, ShieldCheck, Sparkles, Zap } from "lucide-react";
import { Reveal } from "@/components/public/shared/Reveal";
import { stripHash } from "@/components/public/shared/contentTaxonomy";
import type { FeaturedBlog, FeaturedNews } from "./types";
import { formatDate } from "./utils";

export default function FeaturedContent({
  featuredBlog,
  featuredNews,
}: {
  featuredBlog?: FeaturedBlog | null;
  featuredNews?: FeaturedNews | null;
}) {
  if (!featuredBlog && !featuredNews) return null;
  const both = Boolean(featuredBlog && featuredNews);

  return (
    <section id="featured" className="scroll-mt-24 py-16 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Reveal className="mb-8 flex justify-center sm:mb-10">
          <span className="inline-flex items-center gap-2 rounded-full border border-success-500/30 bg-success-500/10 px-4 py-1.5 text-xs font-extrabold text-success-600 dark:text-success-400">
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            محتوای ویژه
          </span>
        </Reveal>

        <div className={`grid grid-cols-1 gap-5 sm:gap-8 ${both ? "md:grid-cols-2" : "mx-auto max-w-3xl"}`}>
          {featuredBlog && (
            <Reveal delay={0.05}>
              <FeatureCard
                href={`/blog/${featuredBlog.slug}`}
                image={featuredBlog.coverImage}
                title={featuredBlog.title}
                excerpt={featuredBlog.excerpt}
                category={stripHash(featuredBlog.category)}
                badge="پست ویژه"
                tone="brand"
                fallbackIcon={<ShieldCheck className="h-8 w-8 text-theme-cyan-500" aria-hidden="true" />}
                meta={<><Clock className="h-4 w-4 text-brand-500" aria-hidden="true" />{featuredBlog.readTime} مطالعه</>}
                cta="مطالعه مقاله"
              />
            </Reveal>
          )}
          {featuredNews && (
            <Reveal delay={0.12}>
              <FeatureCard
                href={`/news/${featuredNews.id}`}
                image={featuredNews.image}
                title={featuredNews.title}
                excerpt={featuredNews.body}
                category={stripHash(featuredNews.category)}
                badge="تازه‌ترین"
                tone="orange"
                fallbackIcon={<Zap className="h-8 w-8 text-warning-300" aria-hidden="true" />}
                meta={featuredNews.publishedAt ? <><Calendar className="h-4 w-4 text-orange-500" aria-hidden="true" />{formatDate(featuredNews.publishedAt)}</> : null}
                cta="مشاهده خبر"
              />
            </Reveal>
          )}
        </div>
      </div>
    </section>
  );
}

function FeatureCard({
  href,
  image,
  title,
  excerpt,
  category,
  badge,
  tone,
  fallbackIcon,
  meta,
  cta,
}: {
  href: string;
  image?: string;
  title: string;
  excerpt: string;
  category: string;
  badge: string;
  tone: "brand" | "orange";
  fallbackIcon: ReactNode;
  meta: ReactNode;
  cta: string;
}) {
  const t = tone === "brand"
    ? { border: "hover:border-brand-500", gradient: "via-brand-500 to-theme-cyan-500", chip: "bg-brand-500/15 text-brand-600 dark:text-theme-cyan-500", title: "group-hover:text-brand-600 dark:group-hover:text-theme-cyan-500", cta: "text-brand-600 dark:text-theme-cyan-500", badge: "bg-success-500/15 text-success-600 dark:text-success-400" }
    : { border: "hover:border-orange-500", gradient: "via-theme-purple-500 to-orange-500", chip: "bg-orange-500/15 text-orange-600 dark:text-orange-400", title: "group-hover:text-orange-500", cta: "text-orange-500", badge: "bg-warning-500/15 text-warning-600 dark:text-warning-300" };

  return (
    <Link href={href} className={`group flex h-full flex-col overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-theme-sm transition-colors duration-300 dark:border-white/10 dark:bg-gray-900 ${t.border}`}>
      <div className={`relative flex h-44 w-full items-center justify-center overflow-hidden bg-gradient-to-tr from-brand-950 sm:h-48 ${t.gradient}`}>
        {image ? (
          <Image src={image} alt={title} fill sizes="(max-width: 768px) 100vw, 50vw" className="object-cover transition-transform duration-500 group-hover:scale-105" />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-white/25 bg-gray-950/40 backdrop-blur-md transition-transform duration-500 group-hover:scale-110">
            {fallbackIcon}
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col justify-between p-5 sm:p-7">
        <div>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className={`rounded-full px-3 py-1 text-xs font-bold ${t.chip}`}>{category}</span>
            <span className={`rounded-full px-3 py-1 text-xs font-bold ${t.badge}`}>{badge}</span>
          </div>
          <h3 className={`text-lg font-black text-gray-900 transition-colors dark:text-white sm:text-xl ${t.title}`}>{title}</h3>
          <p className="mt-2.5 line-clamp-2 text-sm leading-relaxed text-gray-600 dark:text-gray-300">{excerpt}</p>
        </div>
        <div className="mt-6 flex items-center justify-between border-t border-gray-100 pt-4 text-xs font-bold text-gray-500 dark:border-white/10 dark:text-gray-400">
          <span className="inline-flex items-center gap-1.5">{meta}</span>
          <span className={`inline-flex items-center gap-1 ${t.cta}`}>
            {cta}
            <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-1" aria-hidden="true" />
          </span>
        </div>
      </div>
    </Link>
  );
}
