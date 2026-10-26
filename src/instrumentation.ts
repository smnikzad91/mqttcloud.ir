// Next.js calls register() once per server process on boot (App Router,
// stable since Next 15). Used here to start the plan-expiry background
// check — same pattern as nodepass-web's own src/instrumentation.ts.
// Set JOBS=off to disable (e.g. local dev with multiple dev-server reloads).
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.JOBS === "off") return;

  const { runPlanExpiryCheck } = await import("@/lib/planExpiry");

  const CHECK_INTERVAL_MS = 60 * 60 * 1000; // hourly is plenty for a 3-day reminder window

  const tick = () => {
    runPlanExpiryCheck().catch((err) => console.error("[plan expiry job]", err));
  };

  tick();
  setInterval(tick, CHECK_INTERVAL_MS);
}
