import { NextRequest, NextResponse } from "next/server";
import { runGoogleReviewsRefresh } from "@/app/api/competitor-reviews/route";
import { runTripAdvisorRefresh } from "@/app/api/tripadvisor-reviews/route";

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const start = Date.now();

  const [google, tripadvisor] = await Promise.allSettled([
    runGoogleReviewsRefresh(),
    runTripAdvisorRefresh(),
  ]);

  return NextResponse.json({
    google:      google.status === "fulfilled" ? google.value.refreshed : 0,
    tripadvisor: tripadvisor.status === "fulfilled" ? tripadvisor.value.refreshed : 0,
    duration_ms: Date.now() - start,
    errors: [
      ...(google.status === "rejected" ? [`google: ${google.reason}`] : []),
      ...(tripadvisor.status === "rejected" ? [`tripadvisor: ${tripadvisor.reason}`] : []),
    ],
  });
}
