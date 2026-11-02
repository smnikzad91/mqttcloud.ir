// The power-control device shown on /admin/power, and its payload format.
// Client-safe (no DB imports): the page uses it to parse live socket pushes,
// src/lib/powerMonitor.ts to archive the same messages.
//
// It publishes {"mains":1,"ch":[...6 currents in mA]} every 30 s.
export const POWER_SOURCE = { username: "powercontrol", clientName: "stm32", topic: "powercontrol/telemetry" };
export const POWER_CHANNELS = 6;

export type PowerSample = { mains: number; ch: number[] };

export function parseTelemetry(payload: string): PowerSample | null {
  try {
    const d = JSON.parse(payload);
    if (!Array.isArray(d?.ch) || d.ch.length < POWER_CHANNELS) return null;
    const ch = d.ch.slice(0, POWER_CHANNELS).map(Number);
    if (ch.some((n: number) => !Number.isFinite(n))) return null;
    return { mains: d.mains ? 1 : 0, ch };
  } catch {
    return null;
  }
}
