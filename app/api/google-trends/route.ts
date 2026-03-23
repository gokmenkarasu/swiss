import { NextRequest, NextResponse } from "next/server";
// @ts-ignore — no official types
import googleTrends from "google-trends-api";

export const revalidate = 21600; // 6-hour cache

function avg(values: number[]) {
  if (!values.length) return 0;
  return values.reduce((s, v) => s + v, 0) / values.length;
}

async function fetchTrend(keyword: string, geo = "TR") {
  const now = new Date();
  const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

  const raw = await googleTrends.interestOverTime({
    keyword,
    startTime: sixtyDaysAgo,
    endTime: now,
    geo,
  });

  const data = JSON.parse(raw);
  const timeline: { value: number[] }[] = data?.default?.timelineData ?? [];

  const values = timeline.map((d) => d.value[0] ?? 0);
  const mid = Math.floor(values.length / 2);
  const oldAvg = avg(values.slice(0, mid));
  const newAvg = avg(values.slice(mid));

  const trendPct =
    oldAvg > 0 ? Math.round(((newAvg - oldAvg) / oldAvg) * 100) : 0;

  return { keyword, trendPct, sparkline: values };
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const raw = searchParams.get("keywords") ?? "";
  const keywords = raw
    .split(",")
    .map((k) => k.trim())
    .filter(Boolean);

  if (!keywords.length) {
    return NextResponse.json({ error: "keywords param required" }, { status: 400 });
  }

  try {
    // Fetch sequentially to avoid rate-limiting
    const results: Record<string, { trendPct: number; sparkline: number[] }> = {};
    for (const kw of keywords) {
      const r = await fetchTrend(kw);
      results[kw] = { trendPct: r.trendPct, sparkline: r.sparkline };
    }
    return NextResponse.json(results);
  } catch (err) {
    console.error("[google-trends]", err);
    return NextResponse.json({ error: "trends_fetch_failed" }, { status: 502 });
  }
}
