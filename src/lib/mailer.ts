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

export interface DepositStatusEmailData {
  to:               string;
  firstName:        string;
  amount:           number;
  status:           "approved" | "rejected";
  adminNote?:       string;
  interceptionCode: string;
}

export async function sendDepositStatusEmail(data: DepositStatusEmailData) {
  const { to, firstName, amount, status, adminNote, interceptionCode } = data;
  const approved = status === "approved";
  const formattedAmount = amount.toLocaleString("fa-IR");

  const subject = approved ? "واریز کیف پول شما تایید شد" : "واریز کیف پول شما رد شد";
  const html = `
    <div dir="rtl" style="font-family: Tahoma, Arial, sans-serif; font-size: 14px; line-height: 1.8; color: #1f2937;">
      <p>${firstName} عزیز،</p>
      <p>
        درخواست واریز شما به مبلغ <b>${formattedAmount} تومان</b>
        (کد پیگیری: <b>${interceptionCode}</b>)
        ${approved
          ? "تایید شد و مبلغ آن به کیف پول شما اضافه گردید."
          : "متاسفانه رد شد."}
      </p>
      ${!approved && adminNote ? `<p>دلیل رد درخواست: ${adminNote}</p>` : ""}
      <p>برای مشاهده جزئیات به پنل کاربری خود مراجعه کنید.</p>
    </div>
  `;

  return sendMail({ to, subject, html });
}

export interface PasswordResetEmailData {
  to:        string;
  firstName: string;
  token:     string;
}

export async function sendPasswordResetEmail({ to, firstName, token }: PasswordResetEmailData) {
  const link = `${SITE}/reset-password/${token}`;
  const subject = "بازیابی رمز عبور mqttcloud.ir";
  const html = `
    <div dir="rtl" style="font-family: Tahoma, Arial, sans-serif; font-size: 14px; line-height: 1.8; color: #1f2937;">
      <p>${firstName} عزیز،</p>
      <p>درخواستی برای بازیابی رمز عبور حساب شما ثبت شده است. برای تعیین رمز عبور جدید روی لینک زیر کلیک کنید:</p>
      <p><a href="${link}" style="color: #465fff;">${link}</a></p>
      <p>این لینک تا ۱ ساعت دیگر معتبر است. اگر این درخواست را شما ثبت نکرده‌اید، این ایمیل را نادیده بگیرید.</p>
    </div>
  `;

  return sendMail({ to, subject, html });
}
