"use client";

import { useId } from "react";
import { cn } from "@/components/dashboard/ui";

// The mqttcloud.ir "cloud hub" mark: a cloud whose three bumps are subscribers,
// with the broker in the middle. Same geometry as src/brand/mark.svg, inlined
// so each instance gets its own mask id (the svgr/SVGO pipeline minifies ids,
// which would collide between instances) and one element serves both themes.
// The broker core is currentColor: violet on light, cyan on dark.
export function BrandMark({ size = 36, tone = "auto", className }: { size?: number; tone?: "auto" | "dark"; className?: string }) {
  const maskId = `mqc-cut-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  return (
    <svg
      viewBox="12 12 40 40"
      width={size}
      height={size}
      aria-hidden="true"
      className={cn("shrink-0", tone === "dark" ? "text-theme-cyan-500" : "text-theme-purple-500 dark:text-theme-cyan-500", className)}
    >
      <defs>
        <mask id={maskId} maskUnits="userSpaceOnUse" x="0" y="0" width="64" height="64">
          <rect width="64" height="64" fill="#fff" />
          <path d="M32 35 L32 24 M32 35 L23.5 42 M32 35 L40.5 42" stroke="#000" strokeWidth="3.2" strokeLinecap="round" />
          <circle cx="32" cy="24" r="3.4" fill="#000" />
          <circle cx="23.5" cy="42" r="3.4" fill="#000" />
          <circle cx="40.5" cy="42" r="3.4" fill="#000" />
          <circle cx="32" cy="35" r="5.4" fill="#000" />
        </mask>
      </defs>
      <g mask={`url(#${maskId})`} fill="#465fff">
        <circle cx="21" cy="38" r="9" />
        <circle cx="43" cy="38" r="9" />
        <circle cx="32" cy="29" r="12" />
        <rect x="21" y="38" width="22" height="9" />
      </g>
      <circle cx="32" cy="35" r="2.4" fill="currentColor" />
    </svg>
  );
}
