"use client";

import { useId } from "react";
import { cn } from "@/components/dashboard/ui";

// The mqttcloud.ir "cloud hub" mark: a cloud whose three bumps are subscribers,
// with the broker in the middle. Same geometry as src/brand/mark.svg, inlined
// so each instance gets its own mask/gradient ids (the svgr/SVGO pipeline
// minifies ids, which would collide between instances) and one element serves
// both themes. Colors follow the template's own gradients: brand → violet (the
// primary buttons) on light, brighter brand → cyan (the ".ir" wordmark) on dark.
export function BrandMark({ size = 36, tone = "auto", className }: { size?: number; tone?: "auto" | "dark"; className?: string }) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const cut = `mqc-cut-${uid}`;
  const fill = `mqc-fill-${uid}`;
  const dark = tone === "dark";
  return (
    <svg
      viewBox="10 9.5 44 44"
      width={size}
      height={size}
      aria-hidden="true"
      className={cn("shrink-0", dark ? "text-white" : "text-brand-500 dark:text-white", className)}
    >
      <defs>
        <linearGradient id={fill} x1="10" y1="15" x2="54" y2="48" gradientUnits="userSpaceOnUse">
          <stop offset="0" className={dark ? "[stop-color:#7592ff]" : "[stop-color:#465fff] dark:[stop-color:#7592ff]"} />
          <stop offset="1" className={dark ? "[stop-color:#00f0ff]" : "[stop-color:#7a5af8] dark:[stop-color:#00f0ff]"} />
        </linearGradient>
        <mask id={cut} maskUnits="userSpaceOnUse" x="0" y="0" width="64" height="64">
          <rect width="64" height="64" fill="#fff" />
          <path d="M32 33 L32 22 M32 33 L24 41 M32 33 L40 41" stroke="#000" strokeWidth="4.6" strokeLinecap="round" />
          <circle cx="32" cy="22" r="4.4" fill="#000" />
          <circle cx="24" cy="41" r="4.4" fill="#000" />
          <circle cx="40" cy="41" r="4.4" fill="#000" />
          <circle cx="32" cy="33" r="6.4" fill="#000" />
        </mask>
      </defs>
      <g mask={`url(#${cut})`} fill={`url(#${fill})`}>
        <circle cx="20.5" cy="38" r="10" />
        <circle cx="43.5" cy="38" r="10" />
        <circle cx="32" cy="28" r="13" />
        <rect x="20.5" y="38" width="23" height="10" />
      </g>
      <circle cx="32" cy="33" r="2.8" fill="currentColor" />
    </svg>
  );
}
