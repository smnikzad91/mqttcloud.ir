import crypto from "crypto";

// Client for notifycloud.ir's SMS API — the same gateway nodepass.ir uses for
// its own alerts. POST /api/v1/sms, Bearer NOTIFYCLOUD_SMS_API_KEY, billed per
// message to that key's balance. `clientSmsId` is our own idempotency key.
const BASE = "https://notifycloud.ir/api/v1";
const SITE = (process.env.NEXTAUTH_URL ?? "https://mqttcloud.ir").replace(/\/$/, "");
const DOMAIN = new URL(SITE).hostname;

export interface SendSmsResult {
  status: boolean;
  message?: string;
}

export async function sendSms(to: string, text: string, clientSmsId: string): Promise<SendSmsResult> {
  const apiKey = process.env.NOTIFYCLOUD_SMS_API_KEY;
  if (!apiKey) {
    const message = "NOTIFYCLOUD_SMS_API_KEY is not set — SMS not sent.";
    console.error(message);
    return { status: false, message };
  }

  try {
    const res = await fetch(`${BASE}/sms`, {
      method: "POST",
      headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
      body: JSON.stringify({ number: to, text, clientSmsId }),
    });
    const data = await res.json();
    if (!res.ok) {
      console.error("sendSms failed:", data.error ?? data);
      return { status: false, message: data.error ?? "SMS send failed" };
    }
    return { status: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("sendSms error:", message);
    return { status: false, message };
  }
}

// Android's SMS Retriever API and iOS's Security Code AutoFill both look for
// a line of the form "@<domain> #<code>" to auto-detect and offer one-tap
// fill of a verification code — this must be the OTP's own literal text.
export function sendOtpSms(phone: string, code: string, clientSmsId: string) {
  const text = `کد تایید شما در mqttcloud.ir: ${code}\nاین کد را به کسی ندهید.\n@${DOMAIN} #${code}`;
  return sendSms(phone, text, clientSmsId);
}

export function sendWelcomeSms(phone: string, firstName: string, clientSmsId: string) {
  const text = `${firstName} عزیز، به mqttcloud.ir خوش آمدید!\nحساب شما با موفقیت فعال شد. برای شروع به پنل کاربری خود مراجعه کنید: ${SITE}/dashboard`;
  return sendSms(phone, text, clientSmsId);
}

const PLAN_NAME_FA: Record<string, string> = {
  free: "رایگان",
  basic: "پایه",
  starter: "استارتر",
  enterprise: "پیشرفته",
};

export function sendPlanChangedSms(phone: string, planKey: string, clientSmsId: string) {
  const name = PLAN_NAME_FA[planKey] ?? planKey;
  const text = `پلن شما در mqttcloud.ir به «${name}» تغییر کرد.\nمدیریت اشتراک: ${SITE}/dashboard/subscription`;
  return sendSms(phone, text, clientSmsId);
}

export function sendPlanExpiringSoonSms(phone: string, planKey: string, daysLeft: number, clientSmsId: string) {
  const name = PLAN_NAME_FA[planKey] ?? planKey;
  const text = `پلن «${name}» شما در mqttcloud.ir تا ${daysLeft} روز دیگر منقضی می‌شود.\nبرای تمدید: ${SITE}/dashboard/subscription`;
  return sendSms(phone, text, clientSmsId);
}

export function sendPlanExpiredSms(phone: string, planKey: string, clientSmsId: string) {
  const name = PLAN_NAME_FA[planKey] ?? planKey;
  const text = `پلن «${name}» شما در mqttcloud.ir منقضی شد و به پلن رایگان تغییر یافت.\nبرای تمدید: ${SITE}/dashboard/subscription`;
  return sendSms(phone, text, clientSmsId);
}

export function newClientSmsId(prefix: string): string {
  return `${prefix}-${crypto.randomBytes(8).toString("hex")}`;
}
