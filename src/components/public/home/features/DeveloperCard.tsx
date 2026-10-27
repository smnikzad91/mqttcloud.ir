"use client";

import { useState } from "react";
import { Check, Copy, Play, Plug, Terminal } from "lucide-react";
import { useTimeouts } from "@/components/public/shared/useLiveInterval";
import { CODE_SNIPPETS, DEMO_CLIENT, DEMO_USER, MQTT_PORT_TLS, SNIPPET_TABS, fa, type SnippetLang } from "../signal";
import { CardHeader, SimButton, SpotlightCard, panelClass } from "./SpotlightCard";

const HANDSHAKE = [
  { fromClient: true, packet: "CONNECT", detail: `client_id: ${DEMO_CLIENT}`, latency: "۸ms" },
  { fromClient: false, packet: "CONNACK", detail: "0x00 accepted", latency: "۱۲ms" },
  { fromClient: true, packet: "SUBSCRIBE", detail: `${DEMO_USER}/sensors/#`, latency: "۱۴ms" },
  { fromClient: false, packet: "SUBACK", detail: "granted QoS 1", latency: "۱۵ms" },
  { fromClient: true, packet: "PUBLISH", detail: '{"c": 24.8}', latency: "۱۱ms" },
  { fromClient: false, packet: "PUBACK", detail: "delivered ✓", latency: "۱۳ms" },
];

/** Feature 6 (full width) — copy-paste client snippets that follow the broker's real rules, plus a replayable MQTT handshake. */
export function DeveloperCard() {
  const later = useTimeouts();
  const [lang, setLang] = useState<SnippetLang>("nodejs");
  const [copied, setCopied] = useState(false);
  const [step, setStep] = useState(HANDSHAKE.length);
  const [running, setRunning] = useState(false);

  function runHandshake() {
    if (running) return;
    setRunning(true);
    setStep(0);
    HANDSHAKE.forEach((_, i) => {
      later(() => {
        setStep(i + 1);
        if (i === HANDSHAKE.length - 1) setRunning(false);
      }, (i + 1) * 480);
    });
  }

  function copySnippet() {
    navigator.clipboard?.writeText(CODE_SNIPPETS[lang]).then(() => {
      setCopied(true);
      later(() => setCopied(false), 2000);
    }).catch(() => {});
  }

  const file = SNIPPET_TABS.find((t) => t.id === lang)?.file;

  return (
    <SpotlightCard accent="rgba(70, 95, 255, 0.14)">
      <div className="grid grid-cols-1 items-stretch gap-6 lg:grid-cols-12 lg:gap-8">
        {/* min-w-0 so the long code lines scroll inside <pre> instead of widening the page on phones */}
        <div className="flex min-w-0 flex-col justify-between gap-5 lg:col-span-7">
          <div className="space-y-3">
            <CardHeader
              icon={<Plug className="h-6 w-6" aria-hidden="true" />}
              gradient="from-brand-500 to-theme-purple-500"
              title="آماده برای توسعه‌دهندگان"
              subtitle="سازگار با استاندارد MQTT 3.1.1"
              action={
                <SimButton onClick={runHandshake} active={running} icon={<Play className="h-3.5 w-3.5 fill-current" aria-hidden="true" />}>
                  {running ? "در حال تبادل پکت‌ها…" : "اجرای شبیه‌سازی اتصال"}
                </SimButton>
              }
            />
            <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-300 sm:text-base">
              با هر کتابخانه استاندارد MQTT مثل{" "}
              {["mqtt.js", "paho", "mosquitto", "PubSubClient"].map((lib, i, all) => (
                <span key={lib}>
                  <code dir="ltr" className="font-mono-signal text-xs text-brand-600 dark:text-theme-cyan-500">{lib}</code>
                  {i < all.length - 2 ? "، " : i === all.length - 2 ? " یا " : ""}
                </span>
              ))}{" "}
              مستقیم به بروکر mqttcloud.ir وصل شوید.
            </p>

            <div dir="ltr" className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none]" role="tablist" aria-label="زبان نمونه کد">
              {SNIPPET_TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={lang === tab.id}
                  onClick={() => setLang(tab.id)}
                  className={`min-h-10 shrink-0 cursor-pointer rounded-xl px-3.5 py-2 font-mono-signal text-xs font-bold transition-colors ${
                    lang === tab.id
                      ? "bg-brand-500 text-white shadow-sm"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-white/5 dark:text-gray-300 dark:hover:bg-white/10"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className={`p-4 shadow-xl ${panelClass}`}>
            <div className="mb-3 flex items-center justify-between border-b border-white/10 pb-3">
              <div dir="ltr" className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-error-500" />
                <span className="h-2.5 w-2.5 rounded-full bg-warning-400" />
                <span className="h-2.5 w-2.5 rounded-full bg-success-500" />
                <span className="ml-2 font-mono-signal text-xs text-gray-400">{file}</span>
              </div>
              <button
                type="button"
                onClick={copySnippet}
                className="inline-flex min-h-8 cursor-pointer items-center gap-1.5 rounded-lg bg-white/10 px-2.5 py-1 text-xs font-bold text-white transition-colors hover:bg-brand-500"
              >
                {copied ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : <Copy className="h-3.5 w-3.5" aria-hidden="true" />}
                {copied ? "کپی شد" : "کپی کد"}
              </button>
            </div>
            <pre dir="ltr" className="overflow-x-auto font-mono-signal text-[11px] leading-relaxed text-success-300 sm:text-sm">
              <code>{CODE_SNIPPETS[lang]}</code>
            </pre>
          </div>
        </div>

        <div className={`flex min-w-0 flex-col justify-between p-4 shadow-xl sm:p-5 lg:col-span-5 ${panelClass}`}>
          <div className="mb-4 flex items-center justify-between gap-2 border-b border-white/10 pb-3">
            <span className="flex items-center gap-2 text-xs font-extrabold">
              <Terminal className="h-4 w-4 text-theme-cyan-500" aria-hidden="true" />
              بازرس پروتکل MQTT
            </span>
            <span dir="ltr" className="shrink-0 rounded-full bg-success-500/15 px-2.5 py-0.5 font-mono-signal text-[10px] font-bold text-success-400">
              PORT {MQTT_PORT_TLS} · TLS
            </span>
          </div>

          <ol dir="ltr" className="my-auto space-y-2" aria-live="polite">
            {HANDSHAKE.map((s, i) => {
              const visible = i < step;
              return (
                <li
                  key={s.packet}
                  className={`flex items-center justify-between gap-2 rounded-xl border px-3 py-2 font-mono-signal text-xs transition-all duration-300 ${
                    visible
                      ? s.fromClient
                        ? "translate-x-0 border-theme-cyan-500/30 bg-theme-cyan-500/[0.06]"
                        : "translate-x-0 border-success-500/30 bg-success-500/[0.06]"
                      : "-translate-x-2 border-white/5 bg-white/[0.01] opacity-25"
                  }`}
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-black ${s.fromClient ? "bg-theme-cyan-500/20 text-theme-cyan-500" : "bg-success-500/20 text-success-400"}`}>
                      {s.fromClient ? "CLIENT →" : "← BROKER"}
                    </span>
                    <span className="truncate font-bold">{s.packet}</span>
                    <span className="hidden truncate text-[11px] text-gray-400 2xsm:inline">{s.detail}</span>
                  </span>
                  <span className="shrink-0 text-[11px] font-bold text-success-400">{s.latency}</span>
                </li>
              );
            })}
          </ol>

          <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-3 text-[11px] text-gray-400">
            <span><bdi>KeepAlive</bdi>: ۶۰ ثانیه</span>
            <span className="font-bold text-theme-cyan-500">{fa(step)} از ۶ مرحله</span>
          </div>
        </div>
      </div>
    </SpotlightCard>
  );
}
