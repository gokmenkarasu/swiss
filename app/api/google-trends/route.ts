import { NextResponse } from "next/server";
import { initTrendsTable, upsertTrend, getTrends } from "@/lib/db";

const AUTH = process.env.DATAFORSEO_AUTH!;
const BASE = "https://api.dataforseo.com/v3";

// Keywords matching the gaps in lib/data.ts
// Must match gap.keyword values in lib/data.ts exactly
const GAP_KEYWORDS = [
  "rooftop bar bosphorus view istanbul",
  "easter brunch istanbul 2026",
  "indian restaurant istanbul dancing show",
  "outdoor spring dinner istanbul garden",
  "luxury chocolate gift istanbul",
  "spa day istanbul bosphorus",
];

function calcTrend(data: { values: (number | null)[] }[]): { trendPct: number; sparkline: number[] } {
  const vals = data.map((pt) => pt.values[0] ?? 0);
  const nonNull = vals.filter((v) => v > 0);
  if (nonNull.length < 2) {
    // Single or no data point — if peak interest (100), signal "trending"
    return { trendPct: nonNull[0] === 100 ? 99 : 0, sparkline: vals };
  }
  const mid = Math.floor(vals.length / 2);
  const oldAvg = vals.slice(0, mid).reduce((s, v) => s + v, 0) / mid;
  const newAvg = vals.slice(mid).reduce((s, v) => s + v, 0) / (vals.length - mid);

  let trendPct: number;
  if (oldAvg === 0 && newAvg === 0) {
    trendPct = 0;
  } else if (oldAvg === 0) {
    trendPct = Math.min(Math.round(newAvg * 3), 99);
  } else {
    trendPct = Math.round(((newAvg - oldAvg) / oldAvg) * 100);
  }

  return { trendPct, sparkline: vals };
}

// CACHE: return from DB if all keywords exist and fresh (< 24h)
async function getCached() {
  const rows = await getTrends();
  const now = Date.now();
  const fresh = rows.filter((r) => now - new Date(r.fetched_at).getTime() < 24 * 60 * 60 * 1000);
  return fresh;
}

export async function GET(req: Request) {
  await initTrendsTable();
  const { searchParams } = new URL(req.url);
  const forceRefresh = searchParams.get("refresh") === "true";

  if (!forceRefresh) {
    const cached = await getCached();
    if (cached.length >= GAP_KEYWORDS.length) {
      return NextResponse.json({ trends: Object.fromEntries(cached.map((r) => [r.keyword, { trendPct: r.trend_pct, sparkline: r.sparkline }])), source: "cache" });
    }
  }

  // Fetch from DataForSEO — one request per keyword (batch fails)
  const trends: Record<string, { trendPct: number; sparkline: number[] }> = {};

  for (const kw of GAP_KEYWORDS) {
    try {
      const res = await fetch(`${BASE}/keywords_data/google_trends/explore/live`, {
        method: "POST",
        headers: { Authorization: `Basic ${AUTH}`, "Content-Type": "application/json" },
        body: JSON.stringify([{ keywords: [kw], time_range: "past_90_days", type: "web" }]),
      });
      const d = await res.json();
      const task = d.tasks?.[0];
      if (task?.status_code !== 20000) continue;
      const raw = task.result?.[0]?.items?.[0]?.data ?? [];
      const { trendPct, sparkline } = calcTrend(raw);
      trends[kw] = { trendPct, sparkline };
      await upsertTrend(kw, trendPct, sparkline);
    } catch (e) {
      console.error("[google-trends]", kw, e);
    }
  }

  return NextResponse.json({ trends, source: "live" });
}
