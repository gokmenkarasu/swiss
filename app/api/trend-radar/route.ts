import { NextResponse } from "next/server";
import {
  initTrendTrackerTable,
  upsertTrackedTrend,
  getTrackedTrends,
  TrackedTrend,
} from "@/lib/db";

const AUTH = process.env.DATAFORSEO_AUTH!;
const BASE = "https://api.dataforseo.com/v3";

const ALERT_THRESHOLD = 50; // trendPct >= 50 → alert (meaningful spike only)

const TRACKED: { keyword: string; geo: string; label: string; locationName?: string }[] = [
  { keyword: "istanbul luxury hotel", geo: "TR", label: "Istanbul Luxury Hotel" }, // geo filter not supported for TR
  { keyword: "istanbul luxury hotel", geo: "DE", label: "Istanbul Luxury Hotel", locationName: "Germany" },
  { keyword: "istanbul luxury hotel", geo: "GB", label: "Istanbul Luxury Hotel", locationName: "United Kingdom" },
  { keyword: "istanbul luxury hotel", geo: "US", label: "Istanbul Luxury Hotel", locationName: "United States" },
];

function calcTrend(data: { values: (number | null)[] }[]): { trendPct: number; sparkline: number[] } {
  const vals = data.map((pt) => pt.values[0] ?? 0);

  // past_90_days gives ~13 weekly points. Compare last 4 weeks vs first 9 weeks.
  // This gives a stable month-over-month signal instead of noise from a single spike.
  if (vals.length < 4) return { trendPct: 0, sparkline: vals };

  const splitAt = Math.max(vals.length - 4, 1); // last 4 points = "recent month"
  const oldSlice = vals.slice(0, splitAt);
  const newSlice = vals.slice(splitAt);

  const oldAvg = oldSlice.reduce((s, v) => s + v, 0) / oldSlice.length;
  const newAvg = newSlice.reduce((s, v) => s + v, 0) / newSlice.length;

  let trendPct: number;
  if (oldAvg < 1 && newAvg < 1) {
    trendPct = 0; // both periods flat — no trend
  } else if (oldAvg < 1) {
    trendPct = 0; // no stable baseline to compare against — don't alarm
  } else {
    trendPct = Math.round(((newAvg - oldAvg) / oldAvg) * 100);
  }

  return { trendPct, sparkline: vals };
}

export async function GET() {
  await initTrendTrackerTable();
  const rows = await getTrackedTrends();

  const alerts = rows.filter((r) => r.trend_pct >= ALERT_THRESHOLD);
  const source = rows.length > 0 ? "cache" : "empty";

  return NextResponse.json({ trends: rows, alerts, source });
}

export async function POST(req: Request) {
  const { searchParams } = new URL(req.url);
  if (searchParams.get("action") !== "refresh") {
    return NextResponse.json({ error: "unknown_action" }, { status: 400 });
  }

  await initTrendTrackerTable();

  const results: TrackedTrend[] = [];
  const errors: string[] = [];

  for (const item of TRACKED) {
    try {
      const res = await fetch(`${BASE}/keywords_data/google_trends/explore/live`, {
        method: "POST",
        headers: {
          Authorization: `Basic ${AUTH}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify([
          {
            keywords: [item.keyword],
            ...(item.locationName ? { location_name: item.locationName } : {}),
            time_range: "past_90_days",
            type: "web",
          },
        ]),
      });

      const d = await res.json();
      const task = d.tasks?.[0];
      if (task?.status_code !== 20000) {
        const msg = `${item.geo}: [${task?.status_code}] ${task?.status_message}`;
        console.error("[trend-radar]", msg);
        errors.push(msg);
        continue;
      }

      const raw = task.result?.[0]?.items?.[0]?.data ?? [];
      const { trendPct, sparkline } = calcTrend(raw);

      await upsertTrackedTrend(item.keyword, item.geo, item.label, trendPct, sparkline);
      results.push({ keyword: item.keyword, geo: item.geo, label: item.label, trend_pct: trendPct, sparkline, fetched_at: new Date().toISOString() });
    } catch (e) {
      const msg = `${item.geo}: exception ${String(e)}`;
      console.error("[trend-radar]", msg);
      errors.push(msg);
    }
  }

  const all = await getTrackedTrends();
  const alerts = all.filter((r) => r.trend_pct >= ALERT_THRESHOLD);

  return NextResponse.json({ trends: all, alerts, refreshed: results.length, errors });
}
