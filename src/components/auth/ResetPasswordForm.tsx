"use client";

import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import { EyeCloseIcon, EyeIcon } from "@/icons";
import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useState } from "react";

export default function ResetPasswordForm({ token }: { token: string }) {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("رمز عبور باید حداقل ۸ کاراکتر باشد");
      return;
    }
    if (password !== confirmPassword) {
      setError("رمز عبور و تکرار آن یکسان نیستند");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "خطای سرور. لطفاً دوباره تلاش کنید");
        return;
      }

      setSuccess(true);
      setTimeout(() => router.push("/signin"), 2000);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col flex-1 w-full">
      <div className="flex flex-col justify-center flex-1 w-full max-w-md mx-auto px-6 sm:px-0 pb-10 sm:pt-10">
        <div className="mb-7" style={{ animation: "fade-in-up 0.5s ease 0.05s both" }}>
          <h1 className="mb-1.5 text-2xl font-bold text-gray-800 dark:text-white/90">
            تعیین رمز عبور جدید
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            رمز عبور جدید خود را وارد کنید.
          </p>
        </div>

        {success ? (
          <div
            className="rounded-lg bg-success-50 px-4 py-3 text-sm text-success-700 dark:bg-success-500/10 dark:text-success-400"
            style={{ animation: "fade-in-up 0.5s ease 0.2s both" }}
          >
            رمز عبور شما با موفقیت تغییر کرد. در حال انتقال به صفحه ورود...
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="space-y-5">
              {error && (
                <div className="rounded-lg bg-error-50 px-4 py-3 text-sm text-error-700 dark:bg-error-500/10 dark:text-error-400">
                  {error}
                </div>
              )}

              <div style={{ animation: "fade-in-up 0.5s ease 0.2s both" }}>
                <Label>رمز عبور جدید <span className="text-error-500">*</span></Label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="رمز عبور جدید خود را وارد کنید"
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

              <div style={{ animation: "fade-in-up 0.5s ease 0.25s both" }}>
                <Label>تکرار رمز عبور <span className="text-error-500">*</span></Label>
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="رمز عبور جدید را دوباره وارد کنید"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-500 px-4 py-3 text-sm font-semibold text-white shadow-md shadow-brand-500/25 transition-all hover:bg-brand-600 hover:-translate-y-0.5 hover:shadow-brand-500/40 disabled:opacity-70 disabled:cursor-not-allowed disabled:translate-y-0"
                style={{ animation: "fade-in-up 0.5s ease 0.3s both" }}
              >
                {loading ? (
                  <>
                    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    در حال ثبت...
                  </>
                ) : "تغییر رمز عبور"}
              </button>
            </div>
          </form>
        )}

        <p
          className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400"
          style={{ animation: "fade-in-up 0.5s ease 0.35s both" }}
        >
          <Link href="/signin" className="font-semibold text-brand-500 hover:text-brand-600 dark:text-brand-400">
            بازگشت به ورود
          </Link>
        </p>
      </div>
    </div>
  );
}
