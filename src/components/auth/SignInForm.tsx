"use client";

import Checkbox from "@/components/form/input/Checkbox";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import { EyeCloseIcon, EyeIcon } from "@/icons";
import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useEffect, useRef, useState } from "react";
import { signIn } from "next-auth/react";
import { useWebOtp } from "@/hooks/useWebOtp";

const IRANIAN_MOBILE = /^09[0-9]{9}$/;
const RESEND_COOLDOWN_SEC = 60;

async function redirectAfterLogin(router: ReturnType<typeof useRouter>) {
  const res = await fetch("/api/auth/session");
  const session = await res.json();
  const role = session?.user?.role;
  router.push(role === "admin" ? "/admin" : "/dashboard");
  router.refresh();
}

function EmailLoginTab() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await signIn("credentials", { email, password, redirect: false });

    if (result?.error) {
      setError("ایمیل یا رمز عبور اشتباه است");
      setLoading(false);
      return;
    }

    await redirectAfterLogin(router);
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="space-y-5">
        {error && (
          <div className="rounded-lg bg-error-50 px-4 py-3 text-sm text-error-700 dark:bg-error-500/10 dark:text-error-400">
            {error}
          </div>
        )}

        <div>
          <Label>ایمیل <span className="text-error-500">*</span></Label>
          <Input
            placeholder="example@email.com"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div>
          <Label>رمز عبور <span className="text-error-500">*</span></Label>
          <div className="relative">
            <Input
              type={showPassword ? "text" : "password"}
              placeholder="رمز عبور خود را وارد کنید"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              {showPassword
                ? <EyeIcon className="fill-current" />
                : <EyeCloseIcon className="fill-current" />}
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <Checkbox checked={rememberMe} onChange={setRememberMe} />
            <span className="text-sm text-gray-600 dark:text-gray-400">مرا به خاطر بسپار</span>
          </label>
          <Link href="/reset-password" className="text-sm text-brand-500 hover:text-brand-600 dark:text-brand-400 transition-colors">
            فراموشی رمز
          </Link>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-500 px-4 py-3 text-sm font-semibold text-white shadow-md shadow-brand-500/25 transition-all hover:bg-brand-600 hover:-translate-y-0.5 hover:shadow-brand-500/40 disabled:opacity-70 disabled:cursor-not-allowed disabled:translate-y-0"
        >
          {loading ? (
            <>
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              در حال ورود...
            </>
          ) : "ورود"}
        </button>
      </div>
    </form>
  );
}

function PhoneLoginTab() {
  const router = useRouter();
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const codeRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setInterval(() => setCooldown((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, [cooldown]);

  // Chrome/Android reads the code straight out of the SMS and drops it in —
  // see src/hooks/useWebOtp.ts.
  useWebOtp(step === "otp", (otp) => setCode(otp.replace(/\D/g, "").slice(0, 6)));

  const requestCode = async () => {
    setError("");
    if (!IRANIAN_MOBILE.test(phone)) {
      setError("شماره موبایل باید با ۰۹ شروع شده و ۱۱ رقم باشد");
      return;
    }
    setLoading(true);
    const res = await fetch("/api/auth/login-otp/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "ارسال کد ناموفق بود");
      return;
    }
    setCode("");
    setCooldown(RESEND_COOLDOWN_SEC);
    setStep("otp");
    setTimeout(() => codeRef.current?.focus(), 80);
  };

  const handleRequestSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    requestCode();
  };

  const handleVerifySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await signIn("phone-otp", { phone, code, redirect: false });

    if (result?.error) {
      setError("شماره موبایل یا کد وارد شده صحیح نیست");
      setLoading(false);
      return;
    }

    await redirectAfterLogin(router);
  };

  if (step === "phone") {
    return (
      <form onSubmit={handleRequestSubmit}>
        <div className="space-y-5">
          {error && (
            <div className="rounded-lg bg-error-50 px-4 py-3 text-sm text-error-700 dark:bg-error-500/10 dark:text-error-400">
              {error}
            </div>
          )}

          <div>
            <Label>شماره موبایل <span className="text-error-500">*</span></Label>
            <Input
              type="tel"
              dir="ltr"
              placeholder="09121234567"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-500 px-4 py-3 text-sm font-semibold text-white shadow-md shadow-brand-500/25 transition-all hover:bg-brand-600 hover:-translate-y-0.5 hover:shadow-brand-500/40 disabled:opacity-70 disabled:cursor-not-allowed disabled:translate-y-0"
          >
            {loading ? (
              <>
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                در حال ارسال کد...
              </>
            ) : "ارسال کد ورود"}
          </button>
        </div>
      </form>
    );
  }

  return (
    <form onSubmit={handleVerifySubmit}>
      <div className="space-y-5">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          کد ۶ رقمی ارسال شده به <span dir="ltr" className="font-medium text-gray-700 dark:text-gray-300">{phone}</span> را وارد کنید.
        </p>

        {error && (
          <div className="rounded-lg bg-error-50 px-4 py-3 text-sm text-error-700 dark:bg-error-500/10 dark:text-error-400">
            {error}
          </div>
        )}

        <div>
          <Label>کد تایید <span className="text-error-500">*</span></Label>
          <input
            ref={codeRef}
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            dir="ltr"
            placeholder="------"
            required
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-center text-lg tracking-[0.5em] text-gray-800 shadow-theme-xs outline-none focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:focus:border-brand-800"
          />
        </div>

        <button
          type="submit"
          disabled={loading || code.length !== 6}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-500 px-4 py-3 text-sm font-semibold text-white shadow-md shadow-brand-500/25 transition-all hover:bg-brand-600 hover:-translate-y-0.5 hover:shadow-brand-500/40 disabled:opacity-70 disabled:cursor-not-allowed disabled:translate-y-0"
        >
          {loading ? (
            <>
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              در حال بررسی...
            </>
          ) : "تایید و ورود"}
        </button>

        <div className="flex items-center justify-between text-sm">
          <button
            type="button"
            onClick={() => { setStep("phone"); setError(""); }}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            بازگشت و ویرایش شماره
          </button>
          <button
            type="button"
            onClick={requestCode}
            disabled={cooldown > 0 || loading}
            className="font-medium text-brand-500 hover:text-brand-600 disabled:text-gray-400 disabled:cursor-not-allowed dark:text-brand-400"
          >
            {cooldown > 0 ? `ارسال مجدد (${cooldown})` : "ارسال مجدد کد"}
          </button>
        </div>
      </div>
    </form>
  );
}

export default function SignInForm() {
  const [tab, setTab] = useState<"email" | "phone">("email");

  return (
    <div className="flex flex-col flex-1 w-full">
      {/* back link */}
      <div
        className="w-full max-w-md sm:pt-10 mx-auto mb-5 px-6 sm:px-0"
        style={{ animation: "fade-in-up 0.4s ease both" }}
      >
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-gray-400 transition-all hover:text-brand-500 hover:-translate-x-0.5 dark:text-gray-500"
        >
          <svg className="w-4 h-4 rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          بازگشت به سایت
        </Link>
      </div>

      <div className="flex flex-col justify-center flex-1 w-full max-w-md mx-auto px-6 sm:px-0 pb-10">

        {/* header */}
        <div className="mb-7" style={{ animation: "fade-in-up 0.5s ease 0.05s both" }}>
          <h1 className="mb-1.5 text-2xl font-bold text-gray-800 dark:text-white/90">
            ورود به حساب
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            برای ورود، ایمیل یا شماره موبایل خود را انتخاب کنید.
          </p>
        </div>

        {/* tabs */}
        <div
          className="mb-6 inline-flex w-full items-center gap-1 rounded-xl border border-gray-200 bg-gray-50 p-1 dark:border-gray-700 dark:bg-gray-800"
          style={{ animation: "fade-in-up 0.5s ease 0.1s both" }}
        >
          <button
            type="button"
            onClick={() => setTab("email")}
            className={`flex-1 rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
              tab === "email"
                ? "bg-white text-brand-600 shadow-sm dark:bg-gray-900 dark:text-brand-400"
                : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            }`}
          >
            ورود با ایمیل
          </button>
          <button
            type="button"
            onClick={() => setTab("phone")}
            className={`flex-1 rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
              tab === "phone"
                ? "bg-white text-brand-600 shadow-sm dark:bg-gray-900 dark:text-brand-400"
                : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            }`}
          >
            ورود با موبایل
          </button>
        </div>

        <div style={{ animation: "fade-in-up 0.5s ease 0.2s both" }}>
          {tab === "email" ? <EmailLoginTab /> : <PhoneLoginTab />}
        </div>

        <p
          className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400"
          style={{ animation: "fade-in-up 0.5s ease 0.4s both" }}
        >
          حساب ندارید؟{" "}
          <Link href="/signup" className="font-semibold text-brand-500 hover:text-brand-600 dark:text-brand-400">
            ثبت‌نام کنید
          </Link>
        </p>
      </div>
    </div>
  );
}
