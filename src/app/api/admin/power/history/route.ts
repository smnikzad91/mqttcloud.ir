import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectDB } from "@/lib/mongodb";
import PowerReading from "@/models/PowerReading";
import { POWER_CHANNELS } from "@/lib/powerMonitor";

const HOUR = 60 * 60 * 1000;
const RANGES: Record<string, number> = { "6h": 6 * HOUR, "24h": 24 * HOUR, "7d": 7 * 24 * HOUR, "30d": 30 * 24 * HOUR };
const MAX_POINTS = 720;
const SAMPLE_MS = 30_000; // the device publishes every 30 s

// History averaged into at most MAX_POINTS buckets, with per-bucket maxima,
// mains outages as time ranges, and per-channel avg/max over the whole range.
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "admin")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await connectDB();
  const range = req.nextUrl.searchParams.get("range") ?? "24h";
  const now = Date.now();
  let from: number;
  if (range === "all") {
    const first = await PowerReading.findOne().sort({ ts: 1 }).select("ts").lean();
    from = first ? first.ts.getTime() : now - 24 * HOUR;
  } else {
    from = now - (RANGES[range] ?? RANGES["24h"]);
  }
  const bucket = Math.max(SAMPLE_MS, Math.ceil((now - from) / MAX_POINTS / 60_000) * 60_000);

  const acc: Record<string, object> = {};
  for (let i = 0; i < POWER_CHANNELS; i++) {
    acc[`a${i}`] = { $avg: { $arrayElemAt: ["$ch", i] } };
    acc[`m${i}`] = { $max: { $arrayElemAt: ["$ch", i] } };
  }
  const rows = await PowerReading.aggregate<Record<string, number>>([
    { $match: { ts: { $gte: new Date(from) } } },
    {
      $group: {
        _id: { $subtract: [{ $toLong: "$ts" }, { $mod: [{ $toLong: "$ts" }, bucket] }] },
        mains: { $min: "$mains" },
        n: { $sum: 1 },
        ...acc,
      },
    },
    { $sort: { _id: 1 } },
  ]);

  // Points; a null point marks a gap (device offline) so the chart breaks the line there.
  const points: { t: number; ch: (number | null)[] }[] = [];
  const outages: { from: number; to: number }[] = [];
  const sum = new Array(POWER_CHANNELS).fill(0);
  const max = new Array(POWER_CHANNELS).fill(-Infinity);
  let samples = 0;
  let prev: number | null = null;
  for (const r of rows) {
    const t = r._id;
    if (prev !== null && t - prev > Math.max(3 * bucket, 3 * SAMPLE_MS)) points.push({ t: prev + bucket, ch: new Array(POWER_CHANNELS).fill(null) });
    const ch = [];
    for (let i = 0; i < POWER_CHANNELS; i++) {
      ch.push(Math.round(r[`a${i}`]));
      sum[i] += r[`a${i}`] * r.n;
      max[i] = Math.max(max[i], r[`m${i}`]);
    }
    samples += r.n;
    points.push({ t, ch });
    if (r.mains === 0) {
      const lastOut = outages[outages.length - 1];
      if (lastOut && lastOut.to === t) lastOut.to = t + bucket;
      else outages.push({ from: t, to: t + bucket });
    }
    prev = t;
  }

  return NextResponse.json({
    range, from, to: now, bucketMs: bucket, samples, points, outages,
    stats: samples ? sum.map((s, i) => ({ avg: Math.round(s / samples), max: max[i] })) : null,
  });
}
