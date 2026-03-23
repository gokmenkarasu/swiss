import { NextRequest, NextResponse } from "next/server";

export const revalidate = 86400; // 24-hour cache (premium credits are limited)

const SCRAPER_KEY = process.env.SCRAPER_API_KEY;

function scraperFetch(url: string) {
  const proxied = `https://api.scraperapi.com/?api_key=${SCRAPER_KEY}&premium=true&url=${encodeURIComponent(url)}`;
  return fetch(proxied, { headers: { Accept: "text/plain" } });
}

function stripPrefix(text: string) {
  // Google Trends responses start with ")]}'  \n"
  return text.replace(/^\)\]\}'\n/, "");
}

function avg(arr: number[]) {
  return arr.length ? arr.reduce((s, v) => s + v, 0) / arr.length : 0;
}

async function fetchTrend(keyword: string, geo = "TR") {
  // ── Step 1: Explore → get widget token ──────────────────────────────────
  const req = JSON.stringify({
    comparisonItem: [{ keyword, geo, time: "today 3-m" }],
    category: 0,
    property: "",
  });
  const exploreUrl =
    `https://trends.google.com/trends/api/explore` +
    `?hl=en-US&tz=-180&req=${encodeURIComponent(req)}`;

  const exploreRes = await scraperFetch(exploreUrl);
  if (!exploreRes.ok) throw new Error(`explore ${exploreRes.status}`);
  const exploreJson = JSON.parse(stripPrefix(await exploreRes.text()));

  const widgets: any[] = exploreJson.widgets ?? [];
  const ts = widgets.find((w: any) => w.id === "TIMESERIES");
  if (!ts) throw new Error("no TIMESERIES widget");

  // ── Step 2: Multiline → get values ──────────────────────────────────────
  const dataUrl =
    `https://trends.google.com/trends/api/widgetdata/multiline` +
    `?hl=en-US&tz=-180` +
    `&req=${encodeURIComponent(JSON.stringify(ts.request))}` +
    `&token=${encodeURIComponent(ts.token)}`;

  const dataRes = await scraperFetch(dataUrl);
  if (!dataRes.ok) throw new Error(`multiline ${dataRes.status}`);
  const dataJson = JSON.parse(stripPrefix(await dataRes.text()));

  const timeline: { value: number[] }[] =
    dataJson?.default?.timelineData ?? [];
  const values = timeline.map((d) => d.value[0] ?? 0);

  const mid = Math.floor(values.length / 2);
  const trendPct =
    avg(values.slice(0, mid)) > 0
      ? Math.round(
          ((avg(values.slice(mid)) - avg(values.slice(0, mid))) /
            avg(values.slice(0, mid))) *
            100
        )
      : 0;

  return { keyword, trendPct, sparkline: values };
}

export async function GET(req: NextRequest) {
  if (!SCRAPER_KEY) {
    return NextResponse.json({ error: "SCRAPER_API_KEY not set" }, { status: 500 });
  }

  const { searchParams } = new URL(req.url);
  const keywords = (searchParams.get("keywords") ?? "")
    .split(",")
    .map((k) => k.trim())
    .filter(Boolean);

  if (!keywords.length) {
    return NextResponse.json({ error: "keywords param required" }, { status: 400 });
  }

  const results: Record<string, { trendPct: number; sparkline: number[] }> = {};
  for (const kw of keywords) {
    try {
      const r = await fetchTrend(kw);
      results[kw] = { trendPct: r.trendPct, sparkline: r.sparkline };
    } catch (err) {
      console.error(`[google-trends] "${kw}":`, err);
      // skip this keyword — frontend will hide the badge
    }
  }

  return NextResponse.json(results);
}
