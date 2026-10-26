"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useWebOtp } from "@/hooks/useWebOtp";

const RESEND_COOLDOWN_SEC = 60;

// Non-blocking reminder shown across the dashboard for accounts that
// predate phone verification (no OTP was ever confirmed for them) — see
// the one-time migration that flips phoneVerified to false for those
// accounts and texts them a code. Dismissed for the session once sent;
// reappears next page load until actually verified, same as the profile
// fetch it's driven by.
export default function PhoneVerifyBanner() {
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
      toast.error(data.error || "ارسال کد ناموفق بود");
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
      setError(data.error || "کد وارد شده صحیح نیست");
      return;
    }
    toast.success("شماره موبایل شما با موفقیت تایید شد.");
    setStatus("hidden");
  };

  if (status === "loading" || status === "hidden") return null;

  return (
    <div className="border-b border-warning-200 bg-warning-50 px-6 py-3 dark:border-warning-500/20 dark:bg-warning-500/10">
      <div className="mx-auto flex max-w-screen-2xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {status === "prompt" ? (
          <>
            <div className="flex items-center gap-2 text-sm text-warning-700 dark:text-warning-400">
              <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
              <span>
                شماره موبایل <span dir="ltr" className="font-medium">{phone}</span> شما تایید نشده است.
              </span>
            </div>
            <button
              onClick={requestCode}
              disabled={loading}
              className="shrink-0 rounded-lg bg-warning-500 px-4 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-warning-600 disabled:opacity-60"
            >
              {loading ? "در حال ارسال..." : "ارسال کد تایید"}
            </button>
          </>
        ) : (
          <form onSubmit={handleVerify} className="flex w-full flex-col gap-3 sm:flex-row sm:items-center">
            <span className="text-sm text-warning-700 dark:text-warning-400">
              کد ارسال شده به <span dir="ltr" className="font-medium">{phone}</span> را وارد کنید:
            </span>
            <div className="flex items-center gap-2">
              <input
                ref={codeRef}
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                dir="ltr"
                maxLength={6}
                placeholder="------"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                className="h-9 w-32 rounded-lg border border-warning-300 bg-white px-3 text-center text-sm tracking-[0.3em] text-gray-800 outline-none focus:border-warning-500 dark:border-warning-500/30 dark:bg-gray-900 dark:text-white"
              />
              <button
                type="submit"
                disabled={loading || code.length !== 6}
                className="rounded-lg bg-warning-500 px-4 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-warning-600 disabled:opacity-60"
              >
                {loading ? "..." : "تایید"}
              </button>
              <button
                type="button"
                onClick={requestCode}
                disabled={cooldown > 0 || loading}
                className="text-sm font-medium text-warning-700 hover:underline disabled:text-gray-400 disabled:no-underline dark:text-warning-400"
              >
                {cooldown > 0 ? `ارسال مجدد (${cooldown})` : "ارسال مجدد"}
              </button>
            </div>
            {error && <span className="text-sm text-error-600 dark:text-error-400">{error}</span>}
          </form>
        )}
      </div>
    </div>
  );
}
