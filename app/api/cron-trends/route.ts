import { NextRequest, NextResponse } from "next/server";
import { runTrendRadarRefresh } from "@/app/api/trend-radar/route";

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const start = Date.now();
  const { refreshed, errors } = await runTrendRadarRefresh();

  return NextResponse.json({ refreshed, errors, duration_ms: Date.now() - start });
}
