"use client";

import { usePathname } from "next/navigation";
import { useT } from "@/i18n/useT";
import { RouteTabs } from "./ui";

/** Overview · Activity · Messages tabs shared by the three /dashboard/mqtt pages. */
export default function MqttTabs() {
  const t = useT();
  const pathname = usePathname() ?? "";
  return (
    <RouteTabs
      active={pathname}
      items={[
        { href: "/dashboard/mqtt",          label: t("linkOverview") },
        { href: "/dashboard/mqtt/activity", label: t("mqttTabActivity") },
        { href: "/dashboard/mqtt/messages", label: t("mqttTabMessages") },
      ]}
    />
  );
}
