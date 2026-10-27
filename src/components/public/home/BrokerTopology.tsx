"use client";

import { useRef, useState, type KeyboardEvent } from "react";
import { Activity, Camera, Lightbulb, Router, Send, Thermometer, type LucideIcon } from "lucide-react";
import { useReducedMotionSafe } from "@/components/public/shared/motion";
import { useLiveInterval } from "@/components/public/shared/useLiveInterval";
import { DEMO_USER, SIG, fa } from "./signal";

interface DeviceNode {
  id: string;
  name: string;
  topic: string;
  online: boolean;
  icon: LucideIcon;
  qos: 0 | 1 | 2;
  payload: string;
  x: number;
  y: number;
  color: string;
}

interface PacketLog {
  topic: string;
  payload: string;
  latency: string;
  status: string;
}

const INITIAL_NODES: DeviceNode[] = [
  { id: "dev-1", name: "حسگر دما — انبار ۱", topic: `${DEMO_USER}/warehouse/temp`, online: true, icon: Thermometer, qos: 1, payload: '{"temp":24.8,"humidity":42}', x: 110, y: 85, color: SIG.cyan },
  { id: "dev-2", name: "دوربین امنیتی — ورودی", topic: `${DEMO_USER}/security/cam-1`, online: true, icon: Camera, qos: 1, payload: '{"motion":false,"fps":30}', x: 490, y: 85, color: SIG.purple },
  { id: "dev-3", name: "کنترلر روشنایی", topic: `${DEMO_USER}/home/lights`, online: false, icon: Lightbulb, qos: 0, payload: '{"zoneA":"OFF"}', x: 110, y: 315, color: SIG.warning },
  { id: "dev-4", name: "دروازه IoT — خط تولید", topic: `${DEMO_USER}/factory/gw-2`, online: true, icon: Router, qos: 2, payload: '{"rpm":1450,"status":"NOMINAL"}', x: 490, y: 315, color: SIG.success },
];

function pathFor(node: DeviceNode) {
  const cX = (node.x + 300) / 2;
  return `M ${node.x} ${node.y} C ${cX} ${node.y}, ${cX} 200, 300 200`;
}

/**
 * Hero visual: four demo devices wired to a broker core. Tapping a device
 * toggles it online/offline; "ارسال پکت تست" fakes a publish. Purely a
 * simulation — nothing here talks to the real broker.
 *
 * Below `sm` the SVG would shrink its labels to ~5px, so phones get the same
 * state rendered as a 2×2 grid of tappable HTML tiles instead.
 */
export function BrokerTopology({ forceMotion = false }: { forceMotion?: boolean }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotionSafe() && !forceMotion;
  const [nodes, setNodes] = useState(INITIAL_NODES);
  const [selectedId, setSelectedId] = useState("dev-1");
  const [burst, setBurst] = useState(0);
  const [log, setLog] = useState<PacketLog>({
    topic: INITIAL_NODES[0].topic,
    payload: INITIAL_NODES[0].payload,
    latency: "۱۸ms",
    status: "شبیه‌سازی",
  });

  useLiveInterval(
    () => {
      const online = nodes.filter((n) => n.online);
      if (online.length === 0) return;
      const node = online[Math.floor(Math.random() * online.length)];
      setLog({
        topic: node.topic,
        payload: node.payload,
        latency: `${fa(Math.floor(14 + Math.random() * 24))}ms`,
        status: "پیام دریافت شد",
      });
    },
    3200,
    rootRef,
    { forceMotion },
  );

  function toggleNode(id: string) {
    setSelectedId(id);
    const node = nodes.find((n) => n.id === id);
    if (!node) return;
    const nextOnline = !node.online;
    setNodes((prev) => prev.map((n) => (n.id === id ? { ...n, online: nextOnline } : n)));
    setLog({
      topic: node.topic,
      payload: nextOnline ? node.payload : '{"event":"DISCONNECTED"}',
      latency: nextOnline ? "۱۲ms" : "—",
      status: nextOnline ? "متصل شد (CONNACK)" : "قطع اتصال",
    });
  }

  function publishTest() {
    const node = nodes.find((n) => n.id === selectedId) ?? nodes[0];
    const value = (22 + Math.random() * 6).toFixed(1);
    setBurst((b) => b + 1);
    setLog({
      topic: node.topic,
      payload: `{"seq":${burst + 101},"val":${value}}`,
      latency: "۱۱ms",
      status: node.online ? "پکت تست منتشر شد ✓" : "دستگاه آفلاین است",
    });
  }

  function onNodeKey(e: KeyboardEvent, id: string) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      toggleNode(id);
    }
  }

  return (
    <div
      ref={rootRef}
      className="relative overflow-hidden rounded-3xl border border-gray-200 bg-gray-950 p-4 text-white shadow-[0_28px_70px_-15px_rgba(70,95,255,0.35)] dark:border-white/15 sm:p-6"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-20"
        style={{ backgroundImage: `radial-gradient(circle, ${SIG.cyan} 1px, transparent 1px)`, backgroundSize: "24px 24px" }}
      />

      {/* Header */}
      <div className="relative z-10 mb-4 flex flex-col gap-3 border-b border-white/10 pb-3.5 2xsm:flex-row 2xsm:items-center 2xsm:justify-between">
        <div className="flex items-center gap-2.5">
          <span className="relative flex h-2.5 w-2.5 shrink-0">
            <span className="force-motion-ping absolute inline-flex h-full w-full animate-ping rounded-full bg-success-400 opacity-75" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-success-500" />
          </span>
          <span className="text-sm font-extrabold tracking-tight">شبیه‌ساز توپولوژی بروکر</span>
        </div>
        <button
          type="button"
          onClick={publishTest}
          className="inline-flex min-h-10 cursor-pointer items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-brand-500 to-theme-cyan-500 px-3.5 py-2 text-xs font-black text-gray-950 shadow-md transition-all hover:brightness-110 active:scale-95"
        >
          <Send className="h-3.5 w-3.5" aria-hidden="true" />
          ارسال پکت تست
        </button>
      </div>

      {/* Phones: tappable tiles */}
      <div className="relative z-10 sm:hidden">
        <div className="mb-3 flex items-center justify-center">
          <span dir="ltr" className="inline-flex items-center gap-2 rounded-full border border-theme-cyan-500/40 bg-brand-950 px-3.5 py-1.5 font-mono-signal text-[11px] font-bold">
            <span className="h-1.5 w-1.5 rounded-full bg-theme-cyan-500" />
            BROKER · TLS :8883
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          {nodes.map((node) => {
            const Icon = node.icon;
            const selected = node.id === selectedId;
            return (
              <button
                key={node.id}
                type="button"
                onClick={() => toggleNode(node.id)}
                aria-pressed={node.online}
                className={`flex min-w-0 cursor-pointer flex-col items-start gap-1.5 rounded-2xl border p-3 text-right transition-colors ${
                  selected ? "border-theme-cyan-500 bg-white/[0.07]" : "border-white/10 bg-white/[0.03]"
                }`}
              >
                <span className="flex w-full items-center justify-between">
                  <Icon className="h-4 w-4" style={{ color: node.online ? node.color : SIG.dim }} aria-hidden="true" />
                  <span className={`h-2 w-2 rounded-full ${node.online ? "bg-success-500" : "bg-gray-600"}`} />
                </span>
                <span className="line-clamp-2 text-xs font-bold leading-snug">{node.name}</span>
                <span className={`text-[11px] font-bold ${node.online ? "text-theme-cyan-500" : "text-gray-400"}`}>
                  {node.online ? `آنلاین · QoS ${fa(node.qos)}` : "آفلاین — بزنید"}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* sm+: SVG topology. direction:ltr so text-anchor="end" means the right edge, as the coordinates assume. */}
      <div className="relative z-10 hidden w-full sm:block">
        <svg viewBox="0 0 600 400" className="h-auto max-h-[340px] w-full select-none overflow-visible" style={{ direction: "ltr" }}>
          <defs>
            <linearGradient id="hero-beam" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={SIG.cyan} stopOpacity="0.9" />
              <stop offset="100%" stopColor={SIG.brand} stopOpacity="0.9" />
            </linearGradient>
            <radialGradient id="hero-core-glow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor={SIG.cyan} stopOpacity="0.45" />
              <stop offset="60%" stopColor={SIG.brand} stopOpacity="0.18" />
              <stop offset="100%" stopColor={SIG.brand} stopOpacity="0" />
            </radialGradient>
          </defs>

          <circle cx="300" cy="200" r="115" fill="url(#hero-core-glow)" />
          <circle cx="300" cy="200" r="92" fill="none" stroke="rgba(0,240,255,0.16)" strokeDasharray="5 5" />
          <circle cx="300" cy="200" r="64" fill="none" stroke="rgba(122,90,248,0.25)" strokeWidth="1.2" />

          {nodes.map((node, i) => {
            const d = pathFor(node);
            return (
              <g key={node.id}>
                <path
                  d={d}
                  fill="none"
                  stroke={node.online ? node.color : "rgba(148,163,184,0.2)"}
                  strokeOpacity={node.online ? 0.45 : 0.25}
                  strokeWidth={node.online ? 2.5 : 1.5}
                  strokeDasharray={node.online ? undefined : "6 6"}
                />
                {node.online && !reduceMotion && (
                  <>
                    <circle r="4.5" fill={node.color}>
                      <animateMotion dur={`${2.2 + i * 0.35}s`} repeatCount="indefinite" path={d} />
                    </circle>
                    <circle r="3" fill="#ffffff">
                      <animateMotion dur={`${2.2 + i * 0.35}s`} begin="1.1s" repeatCount="indefinite" path={d} />
                    </circle>
                  </>
                )}
              </g>
            );
          })}

          <g transform="translate(300, 200)">
            <circle r="44" fill={SIG.panel} stroke="url(#hero-beam)" strokeWidth="2.5" />
            <circle r="34" fill="rgba(70,95,255,0.18)" stroke="rgba(0,240,255,0.4)" />
            <text y="-4" textAnchor="middle" fill="#ffffff" fontSize="11" fontWeight="900" className="font-mono-signal">BROKER</text>
            <text y="12" textAnchor="middle" fill={SIG.cyan} fontSize="9.5" fontWeight="700" className="font-mono-signal">TLS :8883</text>
          </g>

          {nodes.map((node) => {
            const selected = node.id === selectedId;
            return (
              <g
                key={node.id}
                transform={`translate(${node.x}, ${node.y})`}
                onClick={() => toggleNode(node.id)}
                onKeyDown={(e) => onNodeKey(e, node.id)}
                role="button"
                tabIndex={0}
                aria-pressed={node.online}
                aria-label={`${node.name} — ${node.online ? "آنلاین" : "آفلاین"}`}
                className="cursor-pointer outline-none [&:focus-visible>rect]:stroke-white"
              >
                <rect
                  x="-92" y="-34" width="184" height="68" rx="14"
                  fill={SIG.raised}
                  stroke={node.online ? (selected ? SIG.cyan : node.color) : "#344054"}
                  strokeWidth={selected ? 2.2 : 1.4}
                />
                <circle cx="74" cy="-16" r="4.5" fill={node.online ? SIG.success : "#667085"} />
                <text x="62" y="-12" textAnchor="end" fill="#ffffff" fontSize="11" fontWeight="800" className="font-vazirmatn">
                  {node.name}
                </text>
                <text x="0" y="8" textAnchor="middle" fill={SIG.muted} fontSize="9" className="font-mono-signal">
                  {node.topic}
                </text>
                <text x="0" y="24" textAnchor="middle" fill={node.online ? SIG.cyan : SIG.muted} fontSize="9.5" fontWeight="700" className="font-vazirmatn">
                  {node.online ? `● آنلاین (QoS ${fa(node.qos)})` : "○ آفلاین (کلیک برای اتصال)"}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Packet inspector */}
      <div className="relative z-10 mt-3 rounded-2xl border border-white/10 bg-black/40 p-3.5" aria-live="polite">
        <div className="mb-2 flex flex-col gap-1 text-[11px] text-gray-400 2xsm:flex-row 2xsm:items-center 2xsm:justify-between">
          <span className="flex items-center gap-1.5 font-bold text-gray-300">
            <Activity className="h-3.5 w-3.5 text-theme-cyan-500" aria-hidden="true" />
            آخرین پکت
          </span>
          <span className="font-bold text-success-400">
            {log.status} · <span dir="ltr">{log.latency}</span>
          </span>
        </div>
        <div dir="ltr" className="flex flex-col gap-1 rounded-xl border border-white/5 bg-white/[0.03] px-3 py-2 font-mono-signal text-[11px] sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:text-xs">
          <span className="truncate font-bold text-theme-cyan-500">{log.topic}</span>
          <span className="truncate text-success-400">{log.payload}</span>
        </div>
      </div>
    </div>
  );
}
