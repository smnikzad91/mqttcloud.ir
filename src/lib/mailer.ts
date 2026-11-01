import nodemailer, { type Transporter } from "nodemailer";

const SITE = (process.env.NEXTAUTH_URL ?? "https://mqttcloud.ir").replace(/\/$/, "");

// Points at the self-hosted Postfix + OpenDKIM relay on this same server
// (127.0.0.1:25, loopback-only, no auth needed — mynetworks trusts 127.0.0.1).
// OpenDKIM signs outgoing mail for mqttcloud.ir automatically based on the
// From address (see /etc/opendkim/SigningTable on the server). Same pattern
// as tradebot's libs/mailer/index.js and devtrader.ir's mail setup.
let transporter: Transporter | null = null;

function getTransporter(): Transporter | null {
  if (transporter) return transporter;
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST) return null;

  const port = parseInt(SMTP_PORT ?? "", 10) || 587;
  const opts: Record<string, unknown> = {
    host: SMTP_HOST,
    port,
    secure: port === 465,
  };
  if (SMTP_USER && SMTP_PASS) opts.auth = { user: SMTP_USER, pass: SMTP_PASS };
  // Loopback relay only has Postfix's default self-signed cert — nothing to
  // verify on a connection that never leaves the box.
  if (SMTP_HOST === "127.0.0.1" || SMTP_HOST === "localhost") opts.ignoreTLS = true;

  transporter = nodemailer.createTransport(opts);
  return transporter;
}

export interface SendMailOptions {
  to: string;
  subject: string;
  html: string;
}

export async function sendMail({ to, subject, html }: SendMailOptions): Promise<{ status: boolean; message?: string }> {
  try {
    const t = getTransporter();
    if (!t) {
      const message = "SMTP not configured — set SMTP_HOST/SMTP_PORT in .env before mail can send.";
      console.error(message);
      return { status: false, message };
    }
    await t.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to,
      subject,
      html,
    });
    return { status: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("mailer.sendMail failed:", message);
    return { status: false, message };
  }
}

// ── Branded layout ───────────────────────────────────────────────────────────
// Table-based with inline styles, the only layout most mail clients render.
// The logo is a hosted PNG (Gmail and Outlook don't show SVG), rendered at 3x
// from src/brand/favicon.svg; the wordmark beside it is live text, so the
// brand still reads when a client blocks images.

const LOGO = `${SITE}/images/email/logo-mark.png`;
const FONT = "Tahoma, Arial, sans-serif";

const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

function emailButton(href: string, label: string) {
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin: 24px 0 8px;">
      <tr><td style="border-radius: 10px; background: #465fff;">
        <a href="${href}" style="display: inline-block; padding: 12px 26px; font-family: ${FONT}; font-size: 14px; font-weight: bold; color: #ffffff; text-decoration: none; border-radius: 10px;">${label}</a>
      </td></tr>
    </table>`;
}

function emailLayout({ preheader, body }: { preheader: string; body: string }) {
  return `<!doctype html>
<html lang="fa" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>mqttcloud.ir</title>
</head>
<body style="margin: 0; padding: 0; background: #f2f4f9;">
  <div style="display: none; max-height: 0; overflow: hidden; opacity: 0;">${preheader}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: #f2f4f9;">
    <tr><td align="center" style="padding: 32px 16px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 560px;">
        <tr><td align="right" style="padding: 0 4px 20px;">
          <a href="${SITE}" style="text-decoration: none;">
            <table role="presentation" cellpadding="0" cellspacing="0" dir="ltr"><tr>
              <td><img src="${LOGO}" width="40" height="40" alt="mqttcloud.ir" style="display: block; border: 0; border-radius: 9px;"></td>
              <td style="padding-left: 10px; font-family: Arial, sans-serif; font-size: 20px; font-weight: bold; color: #131c31;">mqttcloud<span style="color: #465fff;">.ir</span></td>
            </tr></table>
          </a>
        </td></tr>
        <tr><td dir="rtl" style="background: #ffffff; border: 1px solid #e3e7f0; border-radius: 16px; padding: 32px 28px; font-family: ${FONT}; font-size: 14px; line-height: 1.9; color: #1f2937; text-align: right;">
          ${body}
        </td></tr>
        <tr><td dir="rtl" align="center" style="padding: 20px 4px 0; font-family: ${FONT}; font-size: 12px; line-height: 1.8; color: #6b7489;">
          این ایمیل به‌صورت خودکار از <a href="${SITE}" style="color: #465fff; text-decoration: none;">mqttcloud.ir</a> ارسال شده است.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export interface DepositStatusEmailData {
  to:               string;
  firstName:        string;
  amount:           number;
  status:           "approved" | "rejected";
  adminNote?:       string;
  interceptionCode: string;
}

export function depositStatusEmail(data: Omit<DepositStatusEmailData, "to">) {
  const { firstName, amount, status, adminNote, interceptionCode } = data;
  const approved = status === "approved";
  const formattedAmount = amount.toLocaleString("fa-IR");

  const subject = approved ? "واریز کیف پول شما تایید شد" : "واریز کیف پول شما رد شد";
  const badge = approved
    ? `<span style="display: inline-block; padding: 2px 12px; border-radius: 999px; background: #ecfdf3; color: #027a48; font-size: 13px; font-weight: bold;">تایید شد</span>`
    : `<span style="display: inline-block; padding: 2px 12px; border-radius: 999px; background: #fef3f2; color: #b42318; font-size: 13px; font-weight: bold;">رد شد</span>`;
  const html = emailLayout({
    preheader: `${subject}: ${formattedAmount} تومان`,
    body: `
      <p style="margin: 0 0 16px;">${badge}</p>
      <p style="margin: 0 0 12px;">${escapeHtml(firstName)} عزیز،</p>
      <p style="margin: 0 0 12px;">
        درخواست واریز شما به مبلغ <b>${formattedAmount} تومان</b>
        (کد پیگیری: <b dir="ltr">${escapeHtml(interceptionCode)}</b>)
        ${approved
          ? "تایید شد و مبلغ آن به کیف پول شما اضافه گردید."
          : "متاسفانه رد شد."}
      </p>
      ${!approved && adminNote ? `<p style="margin: 0 0 12px; padding: 12px 14px; border-radius: 10px; background: #f8f9fc; border: 1px solid #e3e7f0;">دلیل رد درخواست: ${escapeHtml(adminNote)}</p>` : ""}
      <p style="margin: 0;">برای مشاهده جزئیات به پنل کاربری خود مراجعه کنید.</p>
      ${emailButton(`${SITE}/dashboard/finance`, "مشاهده کیف پول")}`,
  });
  return { subject, html };
}

export async function sendDepositStatusEmail(data: DepositStatusEmailData) {
  return sendMail({ to: data.to, ...depositStatusEmail(data) });
}

export interface PasswordResetEmailData {
  to:        string;
  firstName: string;
  token:     string;
}

export function passwordResetEmail({ firstName, token }: Omit<PasswordResetEmailData, "to">) {
  const link = `${SITE}/reset-password/${token}`;
  const subject = "بازیابی رمز عبور mqttcloud.ir";
  const html = emailLayout({
    preheader: "لینک تعیین رمز عبور جدید، معتبر تا ۱ ساعت",
    body: `
      <p style="margin: 0 0 12px;">${escapeHtml(firstName)} عزیز،</p>
      <p style="margin: 0;">درخواستی برای بازیابی رمز عبور حساب شما ثبت شده است. برای تعیین رمز عبور جدید روی دکمه زیر کلیک کنید:</p>
      ${emailButton(link, "تعیین رمز عبور جدید")}
      <p style="margin: 16px 0 12px; font-size: 12px; color: #6b7489;">اگر دکمه کار نکرد، این لینک را در مرورگر باز کنید:<br><a href="${link}" dir="ltr" style="color: #465fff; word-break: break-all;">${link}</a></p>
      <p style="margin: 0;">این لینک تا ۱ ساعت دیگر معتبر است. اگر این درخواست را شما ثبت نکرده‌اید، این ایمیل را نادیده بگیرید.</p>`,
  });
  return { subject, html };
}

export async function sendPasswordResetEmail(data: PasswordResetEmailData) {
  return sendMail({ to: data.to, ...passwordResetEmail(data) });
}
