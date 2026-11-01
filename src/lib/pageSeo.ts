import type { Metadata } from "next";
import { connection } from "next/server";
import { connectDB } from "@/lib/mongodb";
import PageSeo from "@/models/PageSeo";

// Search metadata (title, description, keywords) for the public pages that
// admins can edit in /admin/seo-settings. The defaults are what each page
// shipped with; an admin override (PageSeo) replaces them field by field.

const SITE = "https://mqttcloud.ir";
export const TITLE_SUFFIX = " | mqttcloud.ir";

export const SEO_PAGES = ["home", "pricing", "faq", "blog", "news", "contact", "privacy", "terms"] as const;
export type SeoPageKey = (typeof SEO_PAGES)[number];

export interface PageSeoValues {
  title: string;
  description: string;
  keywords: string[];
}

interface PageConfig extends PageSeoValues {
  path: string;
  /** The home title is used as-is; every other title gets TITLE_SUFFIX from the root layout template. */
  absoluteTitle?: boolean;
}

export const PAGE_SEO_DEFAULTS: Record<SeoPageKey, PageConfig> = {
  home: {
    path: "/",
    absoluteTitle: true,
    title: "بروکر MQTT ایرانی و ابری برای اینترنت اشیا | mqttcloud.ir",
    description: "سرور MQTT آماده برای پروژه‌های اینترنت اشیا (IoT): ESP32، آردوینو، رزبری‌پای و نرم‌افزار خود را در چند دقیقه با TLS وصل کنید. پلن رایگان، داشبورد فارسی و پرداخت ریالی با کارت بانکی.",
    keywords: ["بروکر MQTT", "سرور MQTT", "بروکر MQTT ایرانی", "MQTT ابری", "سرور MQTT رایگان", "MQTT broker", "اینترنت اشیا", "IoT", "سرور اینترنت اشیا", "پلتفرم IoT", "ESP32 MQTT", "اتصال ESP32 به اینترنت", "آردوینو MQTT", "رزبری پای MQTT", "پروتکل MQTT", "آموزش MQTT", "جایگزین Mosquitto", "mqttcloud"],
  },
  pricing: {
    path: "/pricing",
    title: "تعرفه بروکر MQTT؛ پلن رایگان و پرداخت ریالی",
    description: "قیمت سرور MQTT ابری به تومان: پلن رایگان با ۱ اکانت و ۲ دستگاه، پلن پایه ۴۹۹ هزار و استارتر ۹۹۹ هزار تومان برای ۳۰ روز. پرداخت با کارت‌های بانکی ایران، بدون پرداخت ارزی.",
    keywords: ["قیمت بروکر MQTT", "تعرفه سرور MQTT", "سرور MQTT رایگان", "خرید سرور MQTT", "قیمت سرور اینترنت اشیا", "mqttcloud"],
  },
  faq: {
    path: "/faq",
    title: "سوالات متداول درباره بروکر MQTT",
    description: "پاسخ سوال‌های رایج درباره mqttcloud.ir: آدرس و پورت اتصال، MQTT 3.1.1، شناسه دستگاه (Client ID)، تاپیک‌ها، محدودیت پلن‌ها، پرداخت و تمدید.",
    keywords: ["سوالات MQTT", "پورت MQTT", "Client ID", "تاپیک MQTT", "بروکر MQTT", "mqttcloud"],
  },
  blog: {
    path: "/blog",
    title: "آموزش MQTT و اینترنت اشیا",
    description: "آموزش MQTT به فارسی: اتصال ESP32 و آردوینو به بروکر، نمونه کد پایتون و Node.js، تاپیک‌ها و QoS و عیب‌یابی اتصال. راهنمای عملی برای پروژه‌های IoT.",
    keywords: ["آموزش MQTT", "آموزش اینترنت اشیا", "ESP32 MQTT", "آردوینو MQTT", "پایتون MQTT", "Node.js MQTT", "QoS MQTT", "mqttcloud"],
  },
  news: {
    path: "/news",
    title: "اخبار",
    description: "آخرین اخبار، به‌روزرسانی‌ها و اطلاعیه‌های mqttcloud.ir. از جدیدترین امکانات بروکر MQTT مطلع شوید.",
    keywords: ["اخبار MQTT", "اخبار mqttcloud", "به‌روزرسانی محصول", "اطلاعیه"],
  },
  contact: {
    path: "/contact",
    title: "تماس با پشتیبانی",
    description: "سوالی درباره بروکر MQTT، پلن‌ها یا اتصال دستگاه‌ها دارید؟ از طریق فرم تماس یا تیکت پشتیبانی، به زبان فارسی با تیم mqttcloud.ir در ارتباط باشید.",
    keywords: ["پشتیبانی MQTT", "تماس با mqttcloud", "پشتیبانی اینترنت اشیا", "mqttcloud"],
  },
  privacy: {
    path: "/privacy",
    title: "حریم خصوصی",
    description: "سیاست حریم خصوصی mqttcloud.ir — چگونه اطلاعات شما را جمع‌آوری، استفاده و حفاظت می‌کنیم.",
    keywords: [],
  },
  terms: {
    path: "/terms",
    title: "شرایط استفاده",
    description: "شرایط و ضوابط استفاده از خدمات mqttcloud.ir.",
    keywords: [],
  },
};

export const isSeoPage = (key: string): key is SeoPageKey => (SEO_PAGES as readonly string[]).includes(key);

/** The page's current values: the admin override where set, else the defaults. */
export async function getPageSeo(key: SeoPageKey): Promise<PageSeoValues> {
  const fallback = PAGE_SEO_DEFAULTS[key];
  try {
    await connectDB();
    const saved = await PageSeo.findOne({ page: key }).lean<PageSeoValues>();
    return {
      title: saved?.title || fallback.title,
      description: saved?.description || fallback.description,
      keywords: saved?.keywords?.length ? saved.keywords : fallback.keywords,
    };
  } catch {
    // Never let a database hiccup take a public page's metadata down.
    return { title: fallback.title, description: fallback.description, keywords: fallback.keywords };
  }
}

/** Full Next.js metadata for a page: title, description, keywords, canonical, Open Graph and Twitter. */
export async function pageMetadata(key: SeoPageKey): Promise<Metadata> {
  // Render at request time, so an admin's change shows on the next load instead of
  // being frozen into a page that was pre-rendered at build time.
  await connection();
  const { path, absoluteTitle } = PAGE_SEO_DEFAULTS[key];
  const { title, description, keywords } = await getPageSeo(key);
  const url = path === "/" ? SITE : `${SITE}${path}`;
  const shareTitle = absoluteTitle ? title : `${title}${TITLE_SUFFIX}`;
  return {
    title: absoluteTitle ? { absolute: title } : title,
    description,
    keywords: keywords.length ? keywords : undefined,
    alternates: { canonical: url },
    openGraph: {
      title: shareTitle,
      description,
      url,
      type: "website",
      images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: shareTitle }],
    },
    twitter: {
      card: "summary_large_image",
      title: shareTitle,
      description,
      images: ["/opengraph-image"],
    },
  };
}
