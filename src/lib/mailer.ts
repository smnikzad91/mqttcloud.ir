import nodemailer, { type Transporter } from "nodemailer";

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
