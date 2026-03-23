import { NextResponse } from "next/server";
import {
  initTrendTrackerTable,
  upsertTrackedTrend,
  getTrackedTrends,
  TrackedTrend,
} from "@/lib/db";

const AUTH = process.env.DATAFORSEO_AUTH!;
const BASE = "https://api.dataforseo.com/v3";

const ALERT_THRESHOLD = 30; // trendPct >= 30 → alert

const TRACKED: { keyword: string; geo: string; label: string; locationName: string }[] = [
  { keyword: "istanbul luxury hotel", geo: "TR", label: "Istanbul Luxury Hotel", locationName: "Turkey" },
  { keyword: "istanbul luxury hotel", geo: "DE", label: "Istanbul Luxury Hotel", locationName: "Germany" },
  { keyword: "istanbul luxury hotel", geo: "GB", label: "Istanbul Luxury Hotel", locationName: "United Kingdom" },
  { keyword: "istanbul luxury hotel", geo: "US", label: "Istanbul Luxury Hotel", locationName: "United States" },
];

function calcTrend(data: { values: (number | null)[] }[]): { trendPct: number; sparkline: number[] } {
  const vals = data.map((pt) => pt.values[0] ?? 0);
  const nonNull = vals.filter((v) => v > 0);
  if (nonNull.length < 2) {
    return { trendPct: nonNull[0] === 100 ? 99 : 0, sparkline: vals };
  }
  const mid = Math.floor(vals.length / 2);
  const oldAvg = vals.slice(0, mid).reduce((s, v) => s + v, 0) / mid;
  const newAvg = vals.slice(mid).reduce((s, v) => s + v, 0) / (vals.length - mid);

  let trendPct: number;
  if (oldAvg === 0 && newAvg === 0) {
    trendPct = 0;
  } else if (oldAvg === 0) {
    // Sıfırdan yükselen ilgi — newAvg'ı baz alarak oran üret (max 99)
    trendPct = Math.min(Math.round(newAvg * 3), 99);
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
            location_name: item.locationName,
            time_range: "past_month",
            type: "web",
          },
        ]),
      });

      const d = await res.json();
      const task = d.tasks?.[0];
      if (task?.status_code !== 20000) {
        console.error("[trend-radar] bad status", item.geo, task?.status_code, task?.status_message);
        continue;
      }

      const raw = task.result?.[0]?.items?.[0]?.data ?? [];
      const { trendPct, sparkline } = calcTrend(raw);

      await upsertTrackedTrend(item.keyword, item.geo, item.label, trendPct, sparkline);
      results.push({ keyword: item.keyword, geo: item.geo, label: item.label, trend_pct: trendPct, sparkline, fetched_at: new Date().toISOString() });
    } catch (e) {
      console.error("[trend-radar]", item.keyword, item.geo, e);
    }
  }

  const all = await getTrackedTrends();
  const alerts = all.filter((r) => r.trend_pct >= ALERT_THRESHOLD);

  return NextResponse.json({ trends: all, alerts, refreshed: results.length });
}
