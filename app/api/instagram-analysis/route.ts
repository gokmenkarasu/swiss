import { NextRequest, NextResponse } from "next/server";

const APIFY_TOKEN = process.env.APIFY_API_TOKEN;
const PROFILE_ACTOR = "apify~instagram-profile-scraper";
const POLL_INTERVAL_MS = 3000;
const MAX_WAIT_MS = 90000;

export interface InstagramProfile {
  username: string;
  fullName: string;
  followersCount: number;
  followsCount: number;
  biography: string;
  profilePicUrl: string;
  isBusinessAccount: boolean;
  highlightReelCount: number;
  fetchedAt: string;
  error?: string;
}

async function runApifyActor(usernames: string[]): Promise<string> {
  const res = await fetch(
    `https://api.apify.com/v2/acts/${PROFILE_ACTOR}/runs?token=${APIFY_TOKEN}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ usernames }),
    }
  );
  const data = await res.json();
  if (!data.data?.id) throw new Error("Failed to start Apify run");
  return data.data.id;
}

async function pollRun(runId: string): Promise<string> {
  const start = Date.now();
  while (Date.now() - start < MAX_WAIT_MS) {
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
    const res = await fetch(
      `https://api.apify.com/v2/actor-runs/${runId}?token=${APIFY_TOKEN}`
    );
    const data = await res.json();
    const status = data.data?.status;
    if (status === "SUCCEEDED") return data.data.defaultDatasetId;
    if (status === "FAILED" || status === "ABORTED") throw new Error(`Run ${status}`);
  }
  throw new Error("Apify run timed out");
}

async function fetchDataset(datasetId: string): Promise<InstagramProfile[]> {
  const res = await fetch(
    `https://api.apify.com/v2/datasets/${datasetId}/items?token=${APIFY_TOKEN}`
  );
  const items = await res.json();
  return items
    .filter((item: Record<string, unknown>) => !item.error)
    .map((item: Record<string, unknown>) => ({
      username: item.username as string,
      fullName: item.fullName as string,
      followersCount: item.followersCount as number,
      followsCount: item.followsCount as number,
      biography: item.biography as string,
      profilePicUrl: item.profilePicUrl as string,
      isBusinessAccount: item.isBusinessAccount as boolean,
      highlightReelCount: item.highlightReelCount as number,
      fetchedAt: new Date().toISOString(),
    }));
}

// POST /api/instagram-analysis
// Body: { usernames: string[] }
export async function POST(req: NextRequest) {
  try {
    const { usernames } = await req.json();

    if (!usernames || !Array.isArray(usernames) || usernames.length === 0) {
      return NextResponse.json({ error: "usernames array required" }, { status: 400 });
    }

    if (!APIFY_TOKEN) {
      // Return mock data when no token
      return NextResponse.json({
        profiles: usernames.map((u: string) => mockProfile(u)),
        source: "mock",
      });
    }

    const runId = await runApifyActor(usernames);
    const datasetId = await pollRun(runId);
    const profiles = await fetchDataset(datasetId);

    // For any username that returned no data, add a placeholder
    const profileMap = new Map(profiles.map((p) => [p.username, p]));
    const result = usernames.map((u: string) =>
      profileMap.get(u) ?? { username: u, error: "no_data", fetchedAt: new Date().toISOString() }
    );

    return NextResponse.json({ profiles: result, source: "apify" });
  } catch (err) {
    console.error("Instagram analysis error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

function mockProfile(username: string): InstagramProfile {
  const mockData: Record<string, Partial<InstagramProfile>> = {
    fsbosphorus:           { fullName: "Four Seasons Hotel Bosphorus", followersCount: 116227, followsCount: 121 },
    conradistanbulbosphorus: { fullName: "Conrad Istanbul Bosphorus",  followersCount: 89400,  followsCount: 210 },
    grandhyattistanbul:    { fullName: "Grand Hyatt Istanbul",         followersCount: 74300,  followsCount: 185 },
    mo_istanbul:           { fullName: "Mandarin Oriental Istanbul",   followersCount: 98600,  followsCount: 95  },
    rixostersaneistanbul:  { fullName: "Rixos Tersane Istanbul",       followersCount: 62100,  followsCount: 320 },
    hiltonistanbulbosphorus: { fullName: "Hilton Istanbul Bosphorus",  followersCount: 43200,  followsCount: 150 },
    ritzcarltonistanbul:   { fullName: "Ritz-Carlton Istanbul",        followersCount: 81500,  followsCount: 140 },
  };
  const d = mockData[username] ?? {};
  return {
    username,
    fullName: d.fullName ?? username,
    followersCount: d.followersCount ?? 0,
    followsCount: d.followsCount ?? 0,
    biography: "",
    profilePicUrl: "",
    isBusinessAccount: true,
    highlightReelCount: 0,
    fetchedAt: new Date().toISOString(),
  };
}
