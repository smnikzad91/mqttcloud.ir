"use client";

// One AG Grid setup for every table in both dashboards: shared light/dark
// theme, native RTL (enableRtl — no more reversing column arrays), auto
// height, and pagination that only appears once a list is long. Callers pin
// action columns with pinned: "right", meaning "the end edge": AG Grid does
// not mirror pinning under enableRtl, so it's flipped to "left" in Persian.

import React, { useMemo } from "react";
import { AgGridReact, type AgGridReactProps } from "ag-grid-react";
import { themeQuartz, type ColDef, type GetRowIdParams } from "ag-grid-community";
import { useTheme } from "@/context/ThemeContext";
import { useLanguage } from "@/context/LanguageContext";
import { StatusBadge } from "./ui";

const base = {
  accentColor: "#465fff",
  columnBorder: false,
  fontSize: 14,
  headerFontSize: 12,
  headerFontWeight: 500,
  fontFamily: "inherit",
  rowVerticalPaddingScale: 1.25,
  wrapperBorder: false,
  wrapperBorderRadius: 0,
  headerColumnResizeHandleColor: "transparent",
} as const;

export const gridLight = themeQuartz.withParams({
  ...base,
  backgroundColor: "#ffffff", foregroundColor: "#101828", borderColor: "#eaecf0",
  chromeBackgroundColor: "#f9fafb", headerTextColor: "#667085", rowHoverColor: "#f9fafb",
  rowBorder: { color: "#f2f4f7" },
});

export const gridDark = themeQuartz.withParams({
  ...base,
  // Matches the dashboard's dark navy scale (globals.css → .dark .dash-surface).
  backgroundColor: "#1a2540", foregroundColor: "#f4f6fb", borderColor: "#2a3a5c",
  chromeBackgroundColor: "#1a2540", headerTextColor: "#a9b6d3", rowHoverColor: "rgba(255,255,255,0.03)",
  rowBorder: { color: "#2a3a5c" },
});

type Props<T> = Omit<AgGridReactProps<T>, "theme" | "rowData" | "columnDefs"> & {
  rows: T[];
  columns: ColDef<T>[];
  /** Field used for stable row ids (defaults to `id`). */
  idField?: keyof T & string;
  /** Rows per page; pagination only shows when there are more rows than this. */
  pageSize?: number;
};

export default function DataGrid<T>({ rows, columns, idField = "id" as keyof T & string, pageSize = 25, ...rest }: Props<T>) {
  const { theme } = useTheme();
  const { lang } = useLanguage();
  const paginate = rows.length > pageSize;
  const isRTL = lang === "fa";
  const cols = useMemo(
    () => (isRTL ? columns.map((c) => (c.pinned === "right" ? { ...c, pinned: "left" as const } : c)) : columns),
    [columns, isRTL],
  );
  const defaultColDef = useMemo<ColDef<T>>(() => ({ sortable: true, filter: false, resizable: false, suppressMovable: true }), []);

  return (
    <div className="dash-grid">
      <AgGridReact<T>
        rowData={rows}
        columnDefs={cols}
        defaultColDef={defaultColDef}
        theme={theme === "dark" ? gridDark : gridLight}
        enableRtl={isRTL}
        domLayout="autoHeight"
        rowHeight={56}
        headerHeight={44}
        getRowId={(p: GetRowIdParams<T>) => String((p.data as Record<string, unknown>)[idField])}
        pagination={paginate}
        paginationPageSize={pageSize}
        paginationPageSizeSelector={false}
        suppressCellFocus
        suppressHorizontalScroll={false}
        {...rest}
      />
    </div>
  );
}

// ── Shared cell renderers ───────────────────────────────────────────────────

export function MonoCell({ value }: { value: string }) {
  return <span dir="ltr" className="font-mono-signal text-[13px] text-gray-800 dark:text-gray-100">{value}</span>;
}

export function DateTimeCell({ value, context }: { value: string | null; context: { isRTL: boolean; neverLabel?: string } }) {
  if (!value) return <span className="text-gray-400">{context.neverLabel ?? "—"}</span>;
  const s = new Date(value).toLocaleString(context.isRTL ? "fa-IR" : "en-US", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  return <span className="text-xs text-gray-500 dark:text-gray-400">{s}</span>;
}

export function DateCell({ value, context }: { value: string | null; context: { isRTL: boolean } }) {
  if (!value) return <span className="text-gray-400">—</span>;
  const s = new Date(value).toLocaleDateString(context.isRTL ? "fa-IR" : "en-US", { year: "numeric", month: "short", day: "numeric" });
  return <span className="text-xs text-gray-500 dark:text-gray-400">{s}</span>;
}

/** Renders `value` as a StatusBadge; labels come from `context.statusLabels[value]`. */
export function StatusCell({ value, context }: { value: string; context: { statusLabels: Record<string, string> } }) {
  return <StatusBadge status={value} label={context.statusLabels[value] ?? value} />;
}

/** Toman amount in the current locale's digits. */
export function AmountCell({ value, context }: { value: number; context: { isRTL: boolean; unit: string } }) {
  return (
    <span className="font-semibold text-gray-900 dark:text-white">
      {Number(value ?? 0).toLocaleString(context.isRTL ? "fa-IR" : "en-US")} <span className="text-xs font-normal text-gray-400">{context.unit}</span>
    </span>
  );
}
