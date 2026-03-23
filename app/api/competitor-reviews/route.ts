import { NextResponse } from "next/server";
import { initReviewsTable, upsertHotelReview, getHotelReviews } from "@/lib/db";

const AUTH = process.env.DATAFORSEO_AUTH!;
const BASE = "https://api.dataforseo.com/v3";

const HOTELS = [
  { key: "swissotel",    name: "Swissotel The Bosphorus Istanbul" },
  { key: "conrad",       name: "Conrad Istanbul Bosphorus" },
  { key: "grandhyatt",   name: "Grand Hyatt Istanbul" },
  { key: "mandarin",     name: "Mandarin Oriental Istanbul" },
  { key: "fourseasons",  name: "Four Seasons Hotel Istanbul at the Bosphorus" },
  { key: "rixos",        name: "Rixos Tersane Istanbul" },
  { key: "ritzcarlton",  name: "Ritz-Carlton Istanbul" },
  { key: "hilton",       name: "Hilton Istanbul Bosphorus" },
];

async function dfsPost(path: string, body: unknown) {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { Authorization: `Basic ${AUTH}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.json();
}

async function dfsGet(path: string) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { Authorization: `Basic ${AUTH}` },
  });
  return res.json();
}

export async function GET() {
  await initReviewsTable();
  const reviews = await getHotelReviews();
  return NextResponse.json({ reviews });
}

export async function POST(req: Request) {
  const { searchParams } = new URL(req.url);
  if (searchParams.get("action") !== "refresh") {
    return NextResponse.json({ error: "unknown_action" }, { status: 400 });
  }

  await initReviewsTable();

  // 1 — Post tasks for all hotels
  const postRes = await dfsPost("/business_data/google/reviews/task_post",
    HOTELS.map((h) => ({
      keyword:       h.name,
      location_code: 1000065,
      language_code: "en",
      depth:         5,
    }))
  );

  const taskMap = new Map<string, string>(); // taskId → hotelKey
  (postRes.tasks ?? []).forEach((t: { id: string }, i: number) => {
    taskMap.set(t.id, HOTELS[i].key);
  });

  // 2 — Poll until all ready (max 50s)
  const saved = new Map<string, { rating: number; reviews_count: number; items: unknown[] }>();
  const deadline = Date.now() + 50_000;

  while (saved.size < taskMap.size && Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 3000));

    const readyRes = await dfsGet("/business_data/google/reviews/tasks_ready");
    const readyIds = new Set<string>(
      (readyRes.tasks?.[0]?.result ?? []).map((r: { id: string }) => r.id)
    );

    for (const [tid, hkey] of taskMap) {
      if (saved.has(hkey) || !readyIds.has(tid)) continue;

      const result = await dfsGet(`/business_data/google/reviews/task_get/${tid}`);
      const r = result.tasks?.[0]?.result?.[0];
      if (!r) continue;

      const items = (r.items ?? []).map((it: {
        review_text?: string;
        time_ago?: string;
        rating?: { value?: number };
        profile_name?: string;
        owner_answer?: string;
      }) => ({
        review_text:  it.review_text ?? "",
        time_ago:     it.time_ago ?? "",
        rating:       it.rating?.value ?? 0,
        profile_name: it.profile_name ?? "Anonim",
        owner_answer: it.owner_answer ?? null,
      }));

      saved.set(hkey, {
        rating:        Number(r.rating.value),
        reviews_count: Number(r.rating.votes_count),
        items,
      });
    }
  }

  // 3 — Persist to DB
  for (const [hkey, data] of saved) {
    await upsertHotelReview(hkey, "google", data.rating, data.reviews_count, data.items as never);
  }

  const reviews = await getHotelReviews();
  return NextResponse.json({ reviews, refreshed: saved.size });
}
