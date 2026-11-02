"use client";

import dynamic from "next/dynamic";
import type { ApexOptions } from "apexcharts";
import { useMemo } from "react";
import { useTheme } from "@/context/ThemeContext";

const ReactApexChart = dynamic(() => import("react-apexcharts"), { ssr: false });

// Categorical slots 1–6, validated for both themes (light on #fcfcfb, dark on
// the navy panel #1b2742): lightness band, CVD separation and contrast all pass.
// Light mode's aqua/yellow/magenta sit under 3:1, so every value is also
// readable as text in the channel tiles and the stats table.
export const POWER_COLORS = {
  light: ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4", "#008300"],
  dark:  ["#3987e5", "#d95926", "#199e70", "#c98500", "#d55181", "#008300"],
};

/** Round axis bounds and a tick count whose steps are 1, 2 or 5 × 10ⁿ. */
export function niceAxis(min: number, max: number, ticks = 4) {
  const lo = Math.min(0, min);
  const hi = Math.max(lo + 1, max);
  const raw = (hi - lo) / ticks;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? 10 * mag;
  const nMin = Math.floor(lo / step) * step;
  const nMax = Math.ceil(hi / step) * step;
  return { min: nMin, max: nMax, tickAmount: Math.round((nMax - nMin) / step) };
}

/**
 * One time series (a channel, or the total) as a thin line over a faint fill,
 * with mains outages shaded. `compact` is the small-multiple variant: no
 * toolbar, fewer ticks, and a fixed y-range so panels compare at a glance.
 */
export default function PowerChart({
  name, color, data, outages, outageLabel, unit, height = 300, compact = false, axis: yAxis,
}: {
  name: string;
  color: string;
  data: [number, number | null][];
  outages: { from: number; to: number }[];
  outageLabel: string;
  unit: string;
  height?: number;
  compact?: boolean;
  /** Shared y-range from niceAxis(); computed from the data when omitted. */
  axis?: { min: number; max: number; tickAmount: number };
}) {
  const { theme } = useTheme();
  const dark = theme === "dark";
  const axis = dark ? "#98a2b3" : "#667085";

  const range = useMemo(() => {
    if (yAxis) return yAxis;
    const vals = data.map((d) => d[1]).filter((v): v is number => v != null);
    return niceAxis(Math.min(0, ...vals), Math.max(1, ...vals), compact ? 2 : 5);
  }, [yAxis, data, compact]);

  const options = useMemo<ApexOptions>(() => ({
    chart: {
      type: "area",
      background: "transparent",
      animations: { enabled: false },
      toolbar: { show: !compact, tools: { download: false, selection: false, pan: false, zoomin: true, zoomout: true, zoom: true, reset: true } },
      zoom: { enabled: !compact, type: "x" },
      sparkline: { enabled: false },
      fontFamily: "inherit",
    },
    theme: { mode: dark ? "dark" : "light" },
    colors: [color],
    stroke: { width: compact ? 1.5 : 2, curve: "straight" },
    fill: { type: "gradient", gradient: { shadeIntensity: 0, opacityFrom: dark ? 0.28 : 0.22, opacityTo: 0, stops: [0, 100] } },
    markers: { size: 0, hover: { size: compact ? 3 : 4 } },
    dataLabels: { enabled: false },
    legend: { show: false },
    grid: {
      borderColor: dark ? "rgba(255,255,255,0.07)" : "#e1e0d9",
      xaxis: { lines: { show: false } },
      padding: compact ? { left: 4, right: 4, top: -8, bottom: 0 } : { left: 10, right: 10, top: 0, bottom: 0 },
    },
    xaxis: {
      type: "datetime",
      tickAmount: compact ? 3 : undefined,
      labels: { datetimeUTC: false, style: { colors: axis, fontSize: compact ? "10px" : "12px" } },
      axisBorder: { color: dark ? "rgba(255,255,255,0.12)" : "#c3c2b7" },
      axisTicks: { show: false },
      tooltip: { enabled: false },
    },
    yaxis: {
      min: range.min,
      max: range.max,
      tickAmount: range.tickAmount,
      title: { text: compact ? undefined : unit, style: { color: axis, fontWeight: 500 } },
      labels: { formatter: (v) => (v == null ? "" : Math.round(v).toString()), style: { colors: axis, fontSize: compact ? "10px" : "12px" } },
    },
    tooltip: {
      x: { format: "yyyy/MM/dd HH:mm" },
      y: { formatter: (v) => (v == null ? "—" : `${Math.round(v)} ${unit}`) },
      theme: dark ? "dark" : "light",
    },
    annotations: {
      xaxis: outages.map((o) => ({
        x: o.from,
        x2: o.to,
        fillColor: "#f04438",
        opacity: dark ? 0.16 : 0.1,
        borderColor: "transparent",
        label: compact ? { text: "" } : { text: outageLabel, borderColor: "transparent", orientation: "horizontal", style: { background: "transparent", color: dark ? "#fda29b" : "#b42318", fontSize: "11px" } },
      })),
    },
  }), [axis, color, compact, dark, outages, outageLabel, range, unit]);

  return (
    // Time runs left to right in both languages.
    <div dir="ltr" className={compact ? "-mx-1" : "-mx-2"}>
      <ReactApexChart type="area" height={height} options={options} series={[{ name, data }]} />
    </div>
  );
}
