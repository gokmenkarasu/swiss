import { NextRequest, NextResponse } from "next/server";
import {
  initContentStatsTable,
  initPostsTable,
  upsertContentStat,
  upsertPost,
  getLatestContentStats,
  getPostStats,
  getLatestFetchDate,
} from "@/lib/db";

const APIFY_TOKEN = process.env.APIFY_API_TOKEN;
const POST_ACTOR = "apify~instagram-scraper";
const POLL_INTERVAL_MS = 4000;
const MAX_WAIT_MS = 120000;

// Apify instagram-scraper returns varied field names — handle all variants
interface ApifyPost {
  // Type fields
  type?: string;           // "Image" | "Video" | "Sidecar"
  mediaType?: string;      // alternate name
  productType?: string;    // "feed" | "clips" | "carousel_container"
  isVideo?: boolean;       // fallback

  // Engagement fields
  likesCount?: number;
  diggCount?: number;      // alternate name (TikTok-style)
  likes?: number;
  likeCount?: number;

  commentsCount?: number;
  comments?: number;
  commentCount?: number;

  videoViewCount?: number;
  videoPlayCount?: number;
  viewCount?: number;
  playCount?: number;

  // ID / timestamp
  id?: string;
  shortCode?: string;
  timestamp?: string;      // ISO string
  takenAtTimestamp?: number; // unix seconds

  // Debug: capture raw for logging
  [key: string]: unknown;
}

function resolveType(p: ApifyPost): "Image" | "Video" | "Sidecar" | "Unknown" {
  const t = (p.type ?? p.mediaType ?? "").toLowerCase();
  const pt = (p.productType ?? "").toLowerCase();

  if (t.includes("video") || t.includes("clips") || p.isVideo === true) return "Video";
  if (pt === "clips") return "Video";
  if (t.includes("sidecar") || pt === "carousel_container") return "Sidecar";
  if (t.includes("image") || t.includes("graphimage") || t.includes("photo")) return "Image";
  if (p.isVideo === false) return "Image";
  return "Unknown";
}

function resolveLikes(p: ApifyPost): number {
  return Number(p.likesCount ?? p.diggCount ?? p.likes ?? p.likeCount ?? 0);
}

function resolveComments(p: ApifyPost): number {
  return Number(p.commentsCount ?? p.comments ?? p.commentCount ?? 0);
}

function resolveViews(p: ApifyPost): number {
  return Number(p.videoViewCount ?? p.videoPlayCount ?? p.viewCount ?? p.playCount ?? 0);
}

function resolvePostId(p: ApifyPost): string {
  return String(p.id ?? p.shortCode ?? Math.random().toString(36).slice(2));
}

function resolvePostedAt(p: ApifyPost): string | null {
  if (p.timestamp) return p.timestamp;
  if (p.takenAtTimestamp) return new Date(Number(p.takenAtTimestamp) * 1000).toISOString();
  return null;
}

async function scrapeUserPosts(username: string): Promise<ApifyPost[]> {
  const runRes = await fetch(
    `https://api.apify.com/v2/acts/${POST_ACTOR}/runs?token=${APIFY_TOKEN}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        directUrls: [`https://www.instagram.com/${username}/`],
        resultsType: "posts",
        resultsLimit: 100,
      }),
    }
  );
  const runData = await runRes.json();
  const runId: string = runData.data?.id;
  const datasetId: string = runData.data?.defaultDatasetId;
  if (!runId) throw new Error(`Failed to start Apify run for @${username}: ${JSON.stringify(runData)}`);

  const start = Date.now();
  while (Date.now() - start < MAX_WAIT_MS) {
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
    const statusRes = await fetch(
      `https://api.apify.com/v2/actor-runs/${runId}?token=${APIFY_TOKEN}`
    );
    const { data } = await statusRes.json();
    if (data?.status === "SUCCEEDED") break;
    if (data?.status === "FAILED" || data?.status === "ABORTED") {
      throw new Error(`Apify run ${data.status} for @${username}`);
    }
  }

  const itemsRes = await fetch(
    `https://api.apify.com/v2/datasets/${datasetId}/items?token=${APIFY_TOKEN}`
  );
  const items: ApifyPost[] = await itemsRes.json();

  // Log first item keys for debugging
  if (items.length > 0) {
    const sampleKeys = Object.keys(items[0]).slice(0, 20);
    console.log(`[instagram-content] @${username} sample keys:`, sampleKeys);
    console.log(`[instagram-content] @${username} sample[0]:`, {
      type: items[0].type,
      mediaType: items[0].mediaType,
      productType: items[0].productType,
      isVideo: items[0].isVideo,
      likesCount: items[0].likesCount,
      commentsCount: items[0].commentsCount,
      videoViewCount: items[0].videoViewCount,
      timestamp: items[0].timestamp,
      takenAtTimestamp: items[0].takenAtTimestamp,
    });
  }

  return items;
}

function calcStats(posts: ApifyPost[], followers: number) {
  const photos    = posts.filter((p) => resolveType(p) === "Image").length;
  const videos    = posts.filter((p) => resolveType(p) === "Video").length;
  const carousels = posts.filter((p) => resolveType(p) === "Sidecar").length;

  const avgLikes = posts.length
    ? posts.reduce((s, p) => s + resolveLikes(p), 0) / posts.length
    : 0;

  const avgComments = posts.length
    ? posts.reduce((s, p) => s + resolveComments(p), 0) / posts.length
    : 0;

  const videoPosts = posts.filter((p) => resolveViews(p) > 0);
  const avgViews = videoPosts.length
    ? videoPosts.reduce((s, p) => s + resolveViews(p), 0) / videoPosts.length
    : 0;

  const engagementRate = followers > 0
    ? parseFloat((((avgLikes + avgComments) / followers) * 100).toFixed(4))
    : 0;

  return { photos, videos, carousels, avgLikes, avgComments, avgViews, engagementRate };
}

// GET — returns post stats from DB, filtered by ?days= (default 30)
export async function GET(req: NextRequest) {
  try {
    await Promise.all([initContentStatsTable(), initPostsTable()]);

    const url = new URL(req.url);
    const days = parseInt(url.searchParams.get("days") ?? "30", 10);

    // Try post-based stats first (richer, date-filtered)
    const postStats = await getPostStats(days);

    if (postStats.length > 0) {
      // Add last_fetch per username
      const withFetch = await Promise.all(
        postStats.map(async (s) => ({
          ...s,
          last_fetch: await getLatestFetchDate(s.username),
        }))
      );
      return NextResponse.json({ stats: withFetch, source: "posts", days });
    }

    // Fallback: aggregate content stats (no date filter)
    const stats = await getLatestContentStats();
    return NextResponse.json({ stats, source: "content_stats", days });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// POST — two modes:
//   { mode: "apify", username, followers }  → scrape via Apify, store individual posts
//   { mode: "manual", username, ...fields } → manual upsert to content_stats only
export async function POST(req: NextRequest) {
  try {
    await Promise.all([initContentStatsTable(), initPostsTable()]);
    const body = await req.json();

    if (body.mode === "manual") {
      const followers = Number(body.followers ?? 0);
      const avgLikes = Number(body.avg_likes ?? 0);
      const avgComments = Number(body.avg_comments ?? 0);
      const engagementRate = followers > 0
        ? parseFloat((((avgLikes + avgComments) / followers) * 100).toFixed(4))
        : 0;

      await upsertContentStat({
        username:        body.username,
        posts_scraped:   Number(body.posts_scraped ?? 0),
        photo_count:     Number(body.photo_count ?? 0),
        video_count:     Number(body.video_count ?? 0),
        carousel_count:  Number(body.carousel_count ?? 0),
        avg_likes:       avgLikes,
        avg_comments:    avgComments,
        avg_views:       Number(body.avg_views ?? 0),
        engagement_rate: engagementRate,
      });
      return NextResponse.json({ ok: true, source: "manual" });
    }

    // Apify mode
    if (!APIFY_TOKEN) {
      return NextResponse.json({ error: "APIFY_API_TOKEN not configured" }, { status: 500 });
    }

    const { username, followers = 0 } = body;
    if (!username) return NextResponse.json({ error: "username required" }, { status: 400 });

    const posts = await scrapeUserPosts(username);

    // Store each post individually
    for (const p of posts) {
      const postId = resolvePostId(p);
      const postedAt = resolvePostedAt(p);
      await upsertPost({
        username,
        post_id:        postId,
        post_type:      resolveType(p),
        likes_count:    resolveLikes(p),
        comments_count: resolveComments(p),
        views_count:    resolveViews(p),
        posted_at:      postedAt ?? new Date().toISOString(),
      });
    }

    // Also upsert aggregate snapshot (for fallback / content_stats table)
    const { photos, videos, carousels, avgLikes, avgComments, avgViews, engagementRate } =
      calcStats(posts, followers);

    await upsertContentStat({
      username,
      posts_scraped:   posts.length,
      photo_count:     photos,
      video_count:     videos,
      carousel_count:  carousels,
      avg_likes:       avgLikes,
      avg_comments:    avgComments,
      avg_views:       avgViews,
      engagement_rate: engagementRate,
    });

    return NextResponse.json({
      ok: true,
      source: "apify",
      username,
      posts_scraped:   posts.length,
      photo_count:     photos,
      video_count:     videos,
      carousel_count:  carousels,
      avg_likes:       avgLikes,
      avg_comments:    avgComments,
      avg_views:       avgViews,
      engagement_rate: engagementRate,
    });
  } catch (err) {
    console.error("instagram-content error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
