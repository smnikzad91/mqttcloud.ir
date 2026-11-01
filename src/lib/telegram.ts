import https from "https";
import { SocksProxyAgent } from "socks-proxy-agent";

const TOKEN   = process.env.TELEGRAM_BOT_TOKEN;
const CHANNEL = process.env.TELEGRAM_CHANNEL;
const PROXY   = process.env.TELEGRAM_PROXY;
const SITE    = (process.env.NEXTAUTH_URL ?? "https://mqttcloud.ir").replace(/\/$/, "");

function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

interface SendOptions {
  replyMarkup?: object;
}

async function call(endpoint: string, body: Record<string, unknown>): Promise<Record<string, unknown>> {
  if (!TOKEN || !CHANNEL) throw new Error("Telegram bot token or channel is not configured");
  const payload = JSON.stringify(body);
  const agent   = PROXY ? new SocksProxyAgent(PROXY) : undefined;
  const data = await new Promise<Record<string, unknown>>((resolve, reject) => {
    const req = https.request(
      `https://api.telegram.org/bot${TOKEN}/${endpoint}`,
      { agent, method: "POST", headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(payload) } },
      (res) => {
        let raw = "";
        res.on("data", (d) => (raw += d));
        res.on("end", () => {
          try { resolve(JSON.parse(raw)); } catch { resolve({}); }
        });
      }
    );
    req.on("error", reject);
    req.write(payload);
    req.end();
  });
  if (!data.ok) throw new Error((data.description as string) ?? "Telegram API error");
  return data;
}

async function pinMessage(messageId: number): Promise<void> {
  await call("pinChatMessage", {
    chat_id:              CHANNEL,
    message_id:           messageId,
    disable_notification: true,
  });
}

async function sendMessage(text: string, options: SendOptions = {}): Promise<number | null> {
  const body: Record<string, unknown> = {
    chat_id: CHANNEL, text, parse_mode: "HTML",
    link_preview_options: { is_disabled: true },
  };
  if (options.replyMarkup) body.reply_markup = options.replyMarkup;
  const res = await call("sendMessage", body);
  return (res.result as Record<string, unknown>)?.message_id as number ?? null;
}

async function sendPhoto(photoUrl: string, caption: string, options: SendOptions = {}): Promise<number | null> {
  const body: Record<string, unknown> = {
    chat_id: CHANNEL, photo: photoUrl, caption, parse_mode: "HTML",
  };
  if (options.replyMarkup) body.reply_markup = options.replyMarkup;
  const res = await call("sendPhoto", body);
  return (res.result as Record<string, unknown>)?.message_id as number ?? null;
}

// Posts without their own cover go out with a branded banner (new logo +
// "خبر جدید" / "مقاله جدید" / "اعلان"), rendered once from the brand files and
// served from public/images/telegram/. A photo caption is capped at 1024
// characters (vs 4096 for a text message), so long text is trimmed to fit.
const CAPTION_MAX = 1024;
const BANNER = {
  news:         `${SITE}/images/telegram/news.png`,
  blog:         `${SITE}/images/telegram/blog.png`,
  announcement: `${SITE}/images/telegram/announcement.png`,
};

const absolute = (url: string) => (url.startsWith("http") ? url : `${SITE}${url}`);

/** Shorten plain text to `max` characters (before HTML-escaping, so no entity is cut). */
function clip(s: string, max: number) {
  return s.length <= max ? s : `${s.slice(0, Math.max(0, max - 1)).trimEnd()}…`;
}

/** Send as a photo post; if Telegram can't fetch the image, still publish the text. */
async function sendPost(photoUrl: string, caption: string, options: SendOptions = {}): Promise<number | null> {
  try {
    return await sendPhoto(photoUrl, caption, options);
  } catch (err) {
    console.error("telegram sendPhoto failed, falling back to text:", err instanceof Error ? err.message : err);
    return sendMessage(caption, options);
  }
}

export interface NewsPayload {
  id:          string;
  slug?:       string;
  title:       string;
  hashtags?:   string[];
  coverImage?: string;
}

export interface BlogPayload {
  slug:        string;
  title:       string;
  category:    string;
  excerpt:     string;
  hashtags:    string[];
  readTime?:   string;
  coverImage?: string;
}

export interface AnnouncementPayload {
  text:      string;
  emoji?:    string;
  link?:     string;
  linkText?: string;
}

export async function notifyNews(news: NewsPayload) {
  const url    = `${SITE}/news/${news.slug || news.id}`;
  const markup = { inline_keyboard: [[{ text: "📰 مطالعه خبر", url }]] };
  const tags   = (news.hashtags ?? []).map((t) => `#${t.replace(/\s+/g, "_")}`).join(" ");

  const lines = [
    `📰 <b>خبر جدید!</b>`,
    ``,
    `📌 <b>${escapeHtml(news.title)}</b>`,
    tags ? `🏷 ${tags}` : null,
  ].filter((l) => l !== null).join("\n");

  await sendPost(news.coverImage ? absolute(news.coverImage) : BANNER.news, lines, { replyMarkup: markup });
}

export async function notifyBlog(p: BlogPayload) {
  const tags   = p.hashtags.map((t) => `#${t.replace(/\s+/g, "_")}`).join(" ");
  const url    = `${SITE}/blog/${p.slug}`;
  const markup = { inline_keyboard: [[{ text: "📖 مطالعه مقاله", url }]] };
  const build = (excerpt: string) => [
    `✍️ <b>مقاله جدید منتشر شد!</b>`,
    ``,
    `📌 <b>${escapeHtml(p.title)}</b>`,
    `🗂 <i>${escapeHtml(p.category)}</i>`,
    p.readTime ? `⏱ ${escapeHtml(p.readTime)}` : null,
    ``,
    `💬 ${escapeHtml(excerpt)}`,
    tags ? `\n🏷 ${tags}` : null,
  ].filter((l) => l !== null).join("\n");
  // The excerpt is the only part that can run long; give it whatever room the rest leaves.
  const room = CAPTION_MAX - build("").length - 20;
  const text = build(clip(p.excerpt, room));

  await sendPost(p.coverImage ? absolute(p.coverImage) : BANNER.blog, text, { replyMarkup: markup });
}

export async function notifyAnnouncement(a: AnnouncementPayload) {
  const emoji  = a.emoji ?? "📣";
  const markup = a.link
    ? { inline_keyboard: [[{ text: a.linkText || "بیشتر بدانید", url: a.link }]] }
    : undefined;

  const text = [
    `🔔 <b>اعلان جدید!</b>`,
    ``,
    `${emoji} <b>${escapeHtml(clip(a.text, CAPTION_MAX - 80))}</b>`,
  ].join("\n");

  const msgId = await sendPost(BANNER.announcement, text, { replyMarkup: markup }).catch(console.error);
  if (msgId) await pinMessage(msgId).catch(console.error);
}
