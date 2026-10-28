"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ShieldAlert } from "lucide-react";
import { useWebOtp } from "@/hooks/useWebOtp";
import { useT } from "@/i18n/useT";

const RESEND_COOLDOWN_SEC = 60;

// Non-blocking reminder shown across the dashboard for accounts that
// predate phone verification (no OTP was ever confirmed for them) — see
// the one-time migration that flips phoneVerified to false for those
// accounts and texts them a code. Dismissed for the session once sent;
// reappears next page load until actually verified, same as the profile
// fetch it's driven by.
export default function PhoneVerifyBanner() {
  const t = useT();
  const [status, setStatus] = useState<"loading" | "hidden" | "prompt" | "sent">("loading");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const codeRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    queueMicrotask(() => {
      fetch("/api/user/profile")
        .then((r) => r.json())
        .then((d) => {
          setPhone(d.phone ?? "");
          setStatus(d.phoneVerified === false ? "prompt" : "hidden");
        })
        .catch(() => setStatus("hidden"));
    });
  }, []);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setInterval(() => setCooldown((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, [cooldown]);

  useWebOtp(status === "sent", (otp) => setCode(otp.replace(/\D/g, "").slice(0, 6)));

  const requestCode = async () => {
    setError("");
    setLoading(true);
    const res = await fetch("/api/user/phone/verify/start", { method: "POST" });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      toast.error(data.error || t("pvSendFailed"));
      return;
    }
    if (data.alreadyVerified) {
      setStatus("hidden");
      return;
    }
    setCode("");
    setCooldown(RESEND_COOLDOWN_SEC);
    setStatus("sent");
    setTimeout(() => codeRef.current?.focus(), 80);
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const res = await fetch("/api/user/phone/verify/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || t("pvWrongCode"));
      return;
    }
    toast.success(t("pvVerified"));
    setStatus("hidden");
  };

  if (status === "loading" || status === "hidden") return null;

  return (
    <div className="px-4 pt-4 sm:px-6">
      <div className="mx-auto flex max-w-screen-2xl flex-col gap-3 rounded-2xl border border-warning-200 bg-warning-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between dark:border-warning-500/25 dark:bg-warning-500/10">
        {status === "prompt" ? (
          <>
            <div className="flex items-center gap-2.5 text-sm text-warning-800 dark:text-warning-300">
              <ShieldAlert className="h-5 w-5 shrink-0" aria-hidden />
              <span>
                {t("pvUnverified")} <span dir="ltr" className="font-mono-signal font-semibold">{phone}</span>
              </span>
            </div>
            <button
              type="button"
              onClick={requestCode}
              disabled={loading}
              className="shrink-0 rounded-xl bg-warning-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-warning-600 disabled:opacity-60"
            >
              {loading ? t("pvSending") : t("pvSendCode")}
            </button>
          </>
        ) : (
          <form onSubmit={handleVerify} className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <span className="flex items-center gap-2.5 text-sm text-warning-800 dark:text-warning-300">
              <ShieldAlert className="h-5 w-5 shrink-0" aria-hidden />
              <span>{t("pvEnterCode")} <span dir="ltr" className="font-mono-signal font-semibold">{phone}</span></span>
            </span>
            <div className="flex flex-wrap items-center gap-2">
              <input
                ref={codeRef}
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                dir="ltr"
                maxLength={6}
                placeholder="------"
                aria-label={t("pvVerify")}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                className="h-10 w-36 rounded-xl border border-warning-300 bg-white px-3 text-center font-mono-signal text-base tracking-[0.4em] text-gray-800 outline-none focus:border-warning-500 focus:ring-3 focus:ring-warning-500/15 dark:border-warning-500/30 dark:bg-gray-900 dark:text-white"
              />
              <button
                type="submit"
                disabled={loading || code.length !== 6}
                className="h-10 rounded-xl bg-warning-500 px-4 text-sm font-semibold text-white transition-colors hover:bg-warning-600 disabled:opacity-60"
              >
                {loading ? "…" : t("pvVerify")}
              </button>
              <button
                type="button"
                onClick={requestCode}
                disabled={cooldown > 0 || loading}
                className="px-1 text-sm font-medium text-warning-700 hover:underline disabled:text-gray-400 disabled:no-underline dark:text-warning-400"
              >
                {t("pvResend")}{cooldown > 0 && <span dir="ltr" className="ms-1 font-mono-signal">({cooldown})</span>}
              </button>
            </div>
            {error && <span role="alert" className="text-sm text-error-600 dark:text-error-400">{error}</span>}
          </form>
        )}
      </div>
    </div>
  );
}
