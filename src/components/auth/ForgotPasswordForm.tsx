"use client";

import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import Link from "next/link";
import React, { useState } from "react";

export default function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "خطای سرور. لطفاً دوباره تلاش کنید");
        return;
      }

      setMessage(data.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col flex-1 w-full">
      <div
        className="w-full max-w-md sm:pt-10 mx-auto mb-5 px-6 sm:px-0"
        style={{ animation: "fade-in-up 0.4s ease both" }}
      >
        <Link
          href="/signin"
          className="inline-flex items-center gap-1.5 text-sm text-gray-400 transition-all hover:text-brand-500 hover:-translate-x-0.5 dark:text-gray-500"
        >
          <svg className="w-4 h-4 rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          بازگشت به ورود
        </Link>
      </div>

      <div className="flex flex-col justify-center flex-1 w-full max-w-md mx-auto px-6 sm:px-0 pb-10">
        <div className="mb-7" style={{ animation: "fade-in-up 0.5s ease 0.05s both" }}>
          <h1 className="mb-1.5 text-2xl font-bold text-gray-800 dark:text-white/90">
            فراموشی رمز عبور
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            ایمیل حساب خود را وارد کنید تا لینک بازیابی رمز عبور برایتان ارسال شود.
          </p>
        </div>

        {message ? (
          <div
            className="rounded-lg bg-success-50 px-4 py-3 text-sm text-success-700 dark:bg-success-500/10 dark:text-success-400"
            style={{ animation: "fade-in-up 0.5s ease 0.2s both" }}
          >
            {message}
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
                <Label>ایمیل <span className="text-error-500">*</span></Label>
                <Input
                  placeholder="example@email.com"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-500 px-4 py-3 text-sm font-semibold text-white shadow-md shadow-brand-500/25 transition-all hover:bg-brand-600 hover:-translate-y-0.5 hover:shadow-brand-500/40 disabled:opacity-70 disabled:cursor-not-allowed disabled:translate-y-0"
                style={{ animation: "fade-in-up 0.5s ease 0.25s both" }}
              >
                {loading ? (
                  <>
                    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    در حال ارسال...
                  </>
                ) : "ارسال لینک بازیابی"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
