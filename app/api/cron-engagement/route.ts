import { NextRequest, NextResponse } from "next/server";
import { competitors } from "@/lib/data";
import {
  initPostsTable,
  initContentStatsTable,
  initFetchLogTable,
  upsertPost,
  upsertContentStat,
  logFetchAttempt,
} from "@/lib/db";
import sql from "@/lib/db";

const APIFY_TOKEN = process.env.APIFY_API_TOKEN;
const POST_ACTOR  = "apify~instagram-scraper";

function resolveType(p: Record<string, unknown>): "Image" | "Video" | "Sidecar" | "Unknown" {
  const t  = ((p.type  as string) ?? (p.mediaType   as string) ?? "").toLowerCase();
  const pt = ((p.productType as string) ?? "").toLowerCase();
  if (t.includes("video") || t.includes("clips") || p.isVideo === true)  return "Video";
  if (pt === "clips")                                                      return "Video";
  if (t.includes("sidecar") || pt === "carousel_container")               return "Sidecar";
  if (t.includes("image")   || t.includes("graphimage") || t.includes("photo")) return "Image";
  if (p.isVideo === false)                                                 return "Image";
  return "Unknown";
}
const resolveLikes    = (p: Record<string, unknown>) => { const v = Number(p.likesCount ?? p.likes ?? p.likeCount ?? 0); return v < 0 ? 0 : v; };
const resolveComments = (p: Record<string, unknown>) => Number(p.commentsCount ?? p.comments ?? p.commentCount ?? 0);
const resolveViews    = (p: Record<string, unknown>) => Number(p.videoPlayCount ?? p.playCount ?? p.videoViewCount ?? p.viewCount ?? 0);
const resolvePostId   = (p: Record<string, unknown>) => String(p.id ?? p.shortCode ?? Math.random().toString(36).slice(2));
const resolvePostedAt = (p: Record<string, unknown>): string => {
  if (p.timestamp)         return p.timestamp as string;
  if (p.takenAtTimestamp)  return new Date(Number(p.takenAtTimestamp) * 1000).toISOString();
  return new Date().toISOString();
};

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!APIFY_TOKEN) {
    return NextResponse.json({ error: "APIFY_API_TOKEN not set" }, { status: 500 });
  }

  try {
    await Promise.all([initPostsTable(), initContentStatsTable(), initFetchLogTable()]);

    // Pick the account with the oldest last_attempt (or never attempted)
    const handles = competitors.map((c) => c.instagramHandle);

    const logs = await sql`
      SELECT username, last_attempt FROM instagram_fetch_log
      WHERE username = ANY(${handles})
      ORDER BY last_attempt ASC
    `;
    const attempted = new Set(logs.map((r) => r.username as string));
    // Prefer never-attempted first, then oldest
    const username =
      handles.find((h) => !attempted.has(h)) ??
      (logs[0]?.username as string);

    if (!username) {
      return NextResponse.json({ ok: true, msg: "No accounts to scrape" });
    }

    console.log(`[cron-engagement] Scraping @${username}`);

    // Get latest follower count
    const snapRow = await sql`
      SELECT followers FROM instagram_snapshots
      WHERE username = ${username}
      ORDER BY snap_date DESC LIMIT 1
    `;
    const followers = Number(snapRow[0]?.followers ?? 0);

    // Run Apify — resultsLimit 30 to stay within 60s Vercel limit
    const runRes = await fetch(
      `https://api.apify.com/v2/acts/${POST_ACTOR}/runs?token=${APIFY_TOKEN}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          directUrls: [`https://www.instagram.com/${username}/`],
          resultsType: "posts",
          resultsLimit: 30,
        }),
      }
    );
    const runData  = await runRes.json();
    const runId: string     = runData.data?.id;
    const datasetId: string = runData.data?.defaultDatasetId;
    if (!runId) throw new Error(`Apify start failed: ${JSON.stringify(runData)}`);

    // Poll max 50s (leave buffer for DB writes)
    const deadline = Date.now() + 50_000;
    while (Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, 4000));
      const st = await (await fetch(`https://api.apify.com/v2/actor-runs/${runId}?token=${APIFY_TOKEN}`)).json();
      if (st.data?.status === "SUCCEEDED") break;
      if (st.data?.status === "FAILED" || st.data?.status === "ABORTED") {
        throw new Error(`Apify run ${st.data.status}`);
      }
    }

    const items: Record<string, unknown>[] = await (
      await fetch(`https://api.apify.com/v2/datasets/${datasetId}/items?token=${APIFY_TOKEN}`)
    ).json();

    // Upsert posts
    let saved = 0;
    for (const p of items) {
      const type     = resolveType(p);
      const likes    = resolveLikes(p);
      const comments = resolveComments(p);
      const views    = resolveViews(p);
      const hasRealId = p.id || p.shortCode;
      if (!hasRealId && type === "Unknown" && likes === 0 && comments === 0 && views === 0) continue;

      await upsertPost({
        username,
        post_id:        resolvePostId(p),
        post_type:      type,
        likes_count:    likes,
        comments_count: comments,
        views_count:    views,
        posted_at:      resolvePostedAt(p),
      });
      saved++;
    }

    // Aggregate stats
    const real = items.filter((p) => {
      const type = resolveType(p); const likes = resolveLikes(p); const comments = resolveComments(p); const views = resolveViews(p);
      return (p.id || p.shortCode) || type !== "Unknown" || likes > 0 || comments > 0 || views > 0;
    });
    const photos    = real.filter((p) => resolveType(p) === "Image").length;
    const videos    = real.filter((p) => resolveType(p) === "Video").length;
    const carousels = real.filter((p) => resolveType(p) === "Sidecar").length;
    const avgLikes    = real.length ? real.reduce((s, p) => s + resolveLikes(p),    0) / real.length : 0;
    const avgComments = real.length ? real.reduce((s, p) => s + resolveComments(p), 0) / real.length : 0;
    const vidPosts    = real.filter((p) => resolveViews(p) > 0);
    const avgViews    = vidPosts.length ? vidPosts.reduce((s, p) => s + resolveViews(p), 0) / vidPosts.length : 0;
    const engRate     = followers > 0 ? parseFloat((((avgLikes + avgComments) / followers) * 100).toFixed(4)) : 0;

    await logFetchAttempt(username, saved);
    await upsertContentStat({ username, posts_scraped: saved, photo_count: photos, video_count: videos, carousel_count: carousels, avg_likes: avgLikes, avg_comments: avgComments, avg_views: avgViews, engagement_rate: engRate });

    console.log(`[cron-engagement] @${username} done — ${saved} posts saved`);
    return NextResponse.json({ ok: true, username, saved });

  } catch (err) {
    console.error("[cron-engagement] error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
