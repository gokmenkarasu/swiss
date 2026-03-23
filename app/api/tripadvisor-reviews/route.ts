import { NextResponse } from "next/server";
import { initReviewsTable, upsertHotelReview, getHotelReviews } from "@/lib/db";

const AUTH = process.env.DATAFORSEO_AUTH!;
const BASE = "https://api.dataforseo.com/v3";

const HOTELS = [
  {
    key: "swissotel",
    name: "Swissotel The Bosphorus Istanbul",
    url: "https://www.tripadvisor.com/Hotel_Review-g293974-d302234-Reviews-Swissotel_The_Bosphorus_Istanbul-Istanbul.html",
  },
  {
    key: "conrad",
    name: "Conrad Istanbul Bosphorus",
    url: "https://www.tripadvisor.com/Hotel_Review-g293974-d294658-Reviews-Conrad_Istanbul_Bosphorus-Istanbul.html",
  },
  {
    key: "grandhyatt",
    name: "Grand Hyatt Istanbul",
    url: "https://www.tripadvisor.com/Hotel_Review-g293974-d294608-Reviews-Grand_Hyatt_Istanbul-Istanbul.html",
  },
  {
    key: "mandarin",
    name: "Mandarin Oriental Istanbul",
    url: "https://www.tripadvisor.com/Hotel_Review-g293974-d23140838-Reviews-Mandarin_Oriental_Bosphorus_Istanbul-Istanbul.html",
  },
  {
    key: "fourseasons",
    name: "Four Seasons Hotel Istanbul at the Bosphorus",
    url: "https://www.tripadvisor.com/Hotel_Review-g23701958-d1087766-Reviews-Four_Seasons_Hotel_Istanbul_at_the_Bosphorus-Besiktas.html",
  },
  {
    key: "rixos",
    name: "Rixos Tersane Istanbul",
    url: "https://www.tripadvisor.com/Hotel_Review-g293974-d27306070-Reviews-Rixos_Tersane_Istanbul-Istanbul.html",
  },
  {
    key: "ritzcarlton",
    name: "The Ritz-Carlton Istanbul",
    url: "https://www.tripadvisor.com/Hotel_Review-g293974-d294809-Reviews-The_Ritz_Carlton_Istanbul-Istanbul.html",
  },
  {
    key: "hilton",
    name: "Hilton Istanbul Bosphorus",
    url: "https://www.tripadvisor.com/Hotel_Review-g293974-d294614-Reviews-Hilton_Istanbul_Bosphorus-Istanbul.html",
  },
];

function calcRating(dist: Record<string, number>): { rating: number; total: number } {
  const total = Object.values(dist).reduce((s, v) => s + v, 0);
  const weighted = Object.entries(dist).reduce((s, [k, v]) => s + Number(k) * v, 0);
  return {
    rating: total > 0 ? Math.round((weighted / total) * 10) / 10 : 0,
    total,
  };
}

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
  const all = await getHotelReviews();
  const reviews = all.filter((r) => r.platform === "tripadvisor");
  return NextResponse.json({ reviews });
}

export async function POST(req: Request) {
  const { searchParams } = new URL(req.url);
  if (searchParams.get("action") !== "refresh") {
    return NextResponse.json({ error: "unknown_action" }, { status: 400 });
  }

  await initReviewsTable();

  // Post tasks for all hotels
  const postRes = await dfsPost(
    "/business_data/tripadvisor/reviews/task_post",
    HOTELS.map((h) => ({
      keyword:       h.name,
      url:           h.url,
      location_code: 1000065,
      language_code: "en",
      depth:         5,
    }))
  );

  const taskMap = new Map<string, string>();
  (postRes.tasks ?? []).forEach((t: { id: string }, i: number) => {
    taskMap.set(t.id, HOTELS[i].key);
  });

  // Poll until done (max 50s)
  const saved = new Map<string, { rating: number; reviews_count: number; items: unknown[] }>();
  const deadline = Date.now() + 50_000;

  while (saved.size < taskMap.size && Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 3000));

    const readyRes = await dfsGet("/business_data/tripadvisor/reviews/tasks_ready");
    const readyIds = new Set<string>(
      (readyRes.tasks?.[0]?.result ?? []).map((r: { id: string }) => r.id)
    );

    for (const [tid, hkey] of taskMap) {
      if (saved.has(hkey) || !readyIds.has(tid)) continue;

      const result = await dfsGet(`/business_data/tripadvisor/reviews/task_get/${tid}`);
      const r = result.tasks?.[0]?.result?.[0];
      if (!r) continue;

      const dist = r.rating_distribution as Record<string, number> | null;
      const { rating, total } = dist ? calcRating(dist) : { rating: 0, total: 0 };

      const items = (r.items ?? []).map((it: {
        review_text?: string;
        date_of_visit?: string;
        rating?: { value?: number };
        user_profile?: { name?: string };
        responses?: { text?: string }[];
        title?: string;
      }) => ({
        review_text:  it.review_text ?? "",
        time_ago:     it.date_of_visit ? new Date(it.date_of_visit).toLocaleDateString("tr-TR", { month: "short", year: "numeric" }) : "",
        rating:       it.rating?.value ?? 0,
        profile_name: it.user_profile?.name ?? "Anonim",
        owner_answer: it.responses?.[0]?.text ?? null,
        title:        it.title ?? "",
      }));

      saved.set(hkey, { rating, reviews_count: total, items });
    }
  }

  // Save to DB
  for (const [hkey, data] of saved) {
    await upsertHotelReview(hkey, "tripadvisor", data.rating, data.reviews_count, data.items as never);
  }

  const all = await getHotelReviews();
  const reviews = all.filter((r) => r.platform === "tripadvisor");
  return NextResponse.json({ reviews, refreshed: saved.size });
}
