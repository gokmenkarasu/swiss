import { NextRequest, NextResponse } from "next/server";
import { initDb, upsertSnapshot } from "@/lib/db";
import { competitors } from "@/lib/data";

const APIFY_TOKEN = process.env.APIFY_API_TOKEN;
const PROFILE_ACTOR = "apify~instagram-profile-scraper";

async function fetchProfiles(usernames: string[]) {
  const runRes = await fetch(
    `https://api.apify.com/v2/acts/${PROFILE_ACTOR}/runs?token=${APIFY_TOKEN}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ usernames }),
    }
  );
  const runData = await runRes.json();
  const runId: string = runData.data?.id;
  const datasetId: string = runData.data?.defaultDatasetId;
  if (!runId) throw new Error("Apify run failed to start");

  // Poll up to 180s
  for (let i = 0; i < 60; i++) {
    await new Promise((r) => setTimeout(r, 3000));
    const statusRes = await fetch(
      `https://api.apify.com/v2/actor-runs/${runId}?token=${APIFY_TOKEN}`
    );
    const statusData = await statusRes.json();
    const status: string = statusData.data?.status;
    if (status === "SUCCEEDED") break;
    if (status === "FAILED" || status === "ABORTED") throw new Error(`Apify run ${status}`);
  }

  const itemsRes = await fetch(
    `https://api.apify.com/v2/datasets/${datasetId}/items?token=${APIFY_TOKEN}`
  );
  return await itemsRes.json();
}

export async function GET(req: NextRequest) {
  // Verify cron secret
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await initDb();

    const usernames = competitors.map((c) => c.instagramHandle);
    const items = await fetchProfiles(usernames);

    let saved = 0;
    for (const item of items) {
      if (item.error || !item.username) continue;
      await upsertSnapshot(
        item.username,
        item.fullName ?? item.username,
        item.followersCount ?? 0,
        item.followsCount ?? 0
      );
      saved++;
    }

    return NextResponse.json({ ok: true, saved, total: usernames.length });
  } catch (err) {
    console.error("Cron error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
