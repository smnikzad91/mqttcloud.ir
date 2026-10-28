"use client";

import { useCallback, useRef } from "react";
import { toast } from "sonner";
import { useMqttLive, type MqttActivityEvent } from "@/context/MqttLiveContext";
import { useT } from "@/i18n/useT";

// Renders nothing — just pops a toast for every live connect/disconnect
// event, anywhere in the user dashboard, without the current page needing to
// know about live push itself.
//
// When a fleet reconnects at once (broker restart, Wi-Fi blip) the first few
// events still get their own toast, and everything after that inside the same
// window collapses into one updating "+N more" toast instead of a wall.

const BURST_WINDOW_MS = 4000;
const INDIVIDUAL_PER_WINDOW = 3;
const BURST_TOAST_ID = "mqtt-burst";

export default function MqttToastBridge() {
  const t = useT();
  const windowRef = useRef({ start: 0, count: 0 });

  const onEvent = useCallback((e: MqttActivityEvent) => {
    const now = Date.now();
    const w = windowRef.current;
    if (now - w.start > BURST_WINDOW_MS) { w.start = now; w.count = 0; }
    w.count += 1;

    if (w.count <= INDIVIDUAL_PER_WINDOW) {
      const label = e.event === "connect" ? t("eventConnect") : t("eventDisconnect");
      const message = `${e.clientName} — ${label}`;
      if (e.event === "connect") toast.success(message);
      else                       toast.warning(message);
      return;
    }
    toast.info(`+${w.count - INDIVIDUAL_PER_WINDOW} ${t("mqttMoreEvents")}`, { id: BURST_TOAST_ID });
  }, [t]);

  useMqttLive(onEvent);
  return null;
}
