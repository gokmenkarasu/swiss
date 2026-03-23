"use client";

import React, { useState, useCallback, useEffect, Component, ReactNode } from "react";

// ─── ERROR BOUNDARY ───────────────────────────────────────────────────────────
class ErrorBoundary extends Component<{ children: ReactNode }, { error: string | null }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error: Error) {
    return { error: error.message };
  }
  render() {
    if (this.state.error) {
      return (
        <div className="glass rounded-2xl p-8 text-center" style={{ border: "1px solid rgba(239,68,68,0.2)" }}>
          <p className="text-red-400 text-sm mb-1">Bir hata oluştu</p>
          <p className="text-zinc-600 text-xs">{this.state.error}</p>
          <button
            onClick={() => this.setState({ error: null })}
            className="mt-4 text-xs px-4 py-2 rounded-lg glass glass-hover text-zinc-400"
          >
            Tekrar dene
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
import { gaps, competitors, venueScores, demandSignals } from "@/lib/data";
import type { GapOpportunity } from "@/lib/data";
import type { Snapshot, ContentStat, PostStats, TrackedTrend } from "@/lib/db";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
} from "recharts";

type Tab = "gaps" | "radar" | "instagram" | "content" | "venues" | "demand" | "reviews" | "tripadvisor" | "trends";

const TABS: { id: Tab; label: string }[] = [
  { id: "gaps", label: "Fırsat Boşlukları" },
  { id: "radar", label: "Rakip Radar" },
  { id: "instagram", label: "Rakip Instagram" },
  { id: "content", label: "Engagement" },
  { id: "venues", label: "Mekan Pulse" },
  { id: "demand", label: "İstanbul Sinyalleri" },
  { id: "reviews", label: "⭐ Google İtibar" },
  { id: "tripadvisor", label: "🦉 TripAdvisor" },
  { id: "trends", label: "🌐 Trend Radar" },
];

const urgencyConfig = {
  critical: { label: "KRİTİK", bg: "bg-red-500/15", text: "text-red-400", border: "border-red-500/30", dot: "bg-red-400" },
  high:     { label: "YÜKSEK", bg: "bg-amber-500/15", text: "text-amber-400", border: "border-amber-500/30", dot: "bg-amber-400" },
  medium:   { label: "ORTA",   bg: "bg-blue-500/15",  text: "text-blue-400",  border: "border-blue-500/30",  dot: "bg-blue-400" },
};

const scoreColor = (s: number) =>
  s >= 85 ? "text-green-400" : s >= 70 ? "text-amber-400" : "text-zinc-400";
const scoreBg = (s: number) =>
  s >= 85 ? "bg-green-400" : s >= 70 ? "bg-amber-400" : "bg-zinc-500";

function ScoreArc({ score, color }: { score: number; color: string }) {
  const r = 28;
  const circumference = 2 * Math.PI * r;
  const dash = (score / 100) * circumference;
  return (
    <div className="relative w-20 h-20 flex items-center justify-center flex-shrink-0">
      <svg className="absolute w-full h-full -rotate-90" viewBox="0 0 72 72">
        <circle cx="36" cy="36" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="6" />
        <circle
          cx="36" cy="36" r={r} fill="none"
          stroke={color} strokeWidth="6"
          strokeDasharray={`${dash} ${circumference - dash}`}
          strokeLinecap="round"
          style={{ filter: `drop-shadow(0 0 6px ${color}80)` }}
        />
      </svg>
      <span className="text-lg font-bold" style={{ color }}>{score}</span>
    </div>
  );
}

type TrendMap = Record<string, { trendPct: number; sparkline: number[] }>;

function TrendBadge({ trendPct, fallback, loading }: { trendPct: number | null; fallback: number; loading: boolean }) {
  if (loading) return <span className="text-zinc-500 text-xs animate-pulse">·</span>;
  const pct = trendPct ?? fallback;
  const up = pct >= 0;
  const isLive = trendPct !== null;
  return (
    <span className={`font-medium ${up ? "text-green-400" : "text-red-400"}`}>
      {up ? "↑" : "↓"} %{Math.abs(pct)} trend
      {isLive && <span className="ml-1 text-zinc-500 font-normal text-[10px]">canlı</span>}
    </span>
  );
}

function GapCard({ gap, trends, trendsLoading }: { gap: GapOpportunity; trends: TrendMap; trendsLoading: boolean }) {
  const urg = urgencyConfig[gap.urgency];
  const trendData = trends[gap.keyword] ?? null;
  const trendPct = trendData ? trendData.trendPct : null;
  return (
    <div className={`glass glass-hover rounded-2xl p-5 border ${urg.border} transition-all duration-200`}>
      <div className="flex items-start gap-4">
        <ScoreArc score={gap.opportunityScore} color={gap.venueColor} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${urg.bg} ${urg.text}`}>
              <span className={`inline-block w-1.5 h-1.5 rounded-full ${urg.dot} mr-1.5 live-dot`} />
              {urg.label}
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full"
              style={{ background: gap.venueColor + "22", color: gap.venueColor, border: `1px solid ${gap.venueColor}44` }}>
              {gap.venue}
            </span>
          </div>
          <p className="font-semibold text-white/90 text-sm mb-1">"{gap.keyword}"</p>
          <div className="flex items-center gap-3 text-xs text-zinc-400 mb-3 flex-wrap">
            <span>{gap.searchVolume.toLocaleString()} arama/hafta</span>
            <TrendBadge trendPct={trendPct} fallback={gap.volumeTrend} loading={trendsLoading} />
            <span>Rakip kapsam: %{gap.competitorCoverage}</span>
          </div>
          <p className="text-xs text-zinc-300 leading-relaxed mb-4">{gap.insight}</p>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 text-xs text-zinc-400">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              {gap.targetAge}
            </div>
            <div className="flex items-center gap-1.5 text-xs text-zinc-400">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              {gap.channel}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


// ─── TREND RADAR ──────────────────────────────────────────────────────────────

const GEO_META: Record<string, { flag: string; name: string }> = {
  TR: { flag: "🇹🇷", name: "Türkiye" },
  DE: { flag: "🇩🇪", name: "Almanya" },
  GB: { flag: "🇬🇧", name: "İngiltere" },
  US: { flag: "🇺🇸", name: "ABD" },
};

function MiniSparkline({ values }: { values: number[] }) {
  if (!values || values.length < 2) return null;
  const max = Math.max(...values, 1);
  const W = 300;
  const H = 56;
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * W;
    const y = H - (v / max) * H;
    return `${x},${y}`;
  });
  return (
    <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} className="overflow-visible" preserveAspectRatio="none">
      <polyline
        points={pts.join(" ")}
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

function TrendRadarTab() {
  const [trends, setTrends] = useState<TrackedTrend[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedGeo, setSelectedGeo] = useState<"ALL" | "TR" | "DE" | "GB" | "US">("ALL");
  const [lastError, setLastError] = useState<string | null>(null);

  const loadData = useCallback(() => {
    fetch("/api/trend-radar")
      .then((r) => r.ok ? r.json() : Promise.reject())
      .then((d: { trends: TrackedTrend[] }) => setTrends(d.trends ?? []))
      .catch(() => setLastError("Veri yüklenemedi"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleRefresh = async () => {
    setRefreshing(true);
    setLastError(null);
    try {
      const r = await fetch("/api/trend-radar?action=refresh", { method: "POST" });
      const d = await r.json();
      setTrends(d.trends ?? []);
    } catch {
      setLastError("Yenileme başarısız");
    } finally {
      setRefreshing(false);
    }
  };

  const visible = selectedGeo === "ALL" ? trends : trends.filter((t) => t.geo === selectedGeo);

  return (
    <div className="space-y-5">
      {/* Header row */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <p className="text-xs text-zinc-500 uppercase tracking-wider mb-0.5">Google Trends · 90 günlük pencere</p>
          <p className="text-sm text-zinc-300 font-medium">Hedef pazar arama trendi takibi</p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-2 text-xs px-4 py-2 rounded-xl glass glass-hover text-zinc-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          <svg className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          {refreshing ? "Çekiliyor…" : "DataForSEO'dan Yenile"}
        </button>
      </div>

      {lastError && (
        <div className="glass rounded-xl p-3 border border-red-500/20 text-red-400 text-xs">{lastError}</div>
      )}

      {/* Geo filter chips */}
      <div className="flex gap-2 flex-wrap">
        {(["ALL", "TR", "DE", "GB", "US"] as const).map((g) => (
          <button
            key={g}
            onClick={() => setSelectedGeo(g)}
            className={`text-xs px-3 py-1.5 rounded-lg transition-all ${
              selectedGeo === g
                ? "text-black font-semibold"
                : "glass glass-hover text-zinc-400"
            }`}
            style={selectedGeo === g ? { background: "linear-gradient(135deg, #c9a84c, #e8c660)" } : {}}
          >
            {g === "ALL" ? "🌍 Tümü" : `${GEO_META[g].flag} ${GEO_META[g].name}`}
          </button>
        ))}
      </div>

      {/* Cards */}
      {loading ? (
        <div className="text-center py-12 text-zinc-500 text-sm animate-pulse">Yükleniyor…</div>
      ) : visible.length === 0 ? (
        <div className="glass rounded-2xl p-10 text-center space-y-3">
          <p className="text-zinc-400 text-sm">Henüz veri yok.</p>
          <p className="text-zinc-600 text-xs">Yukarıdaki "Yenile" butonuna bas — DataForSEO&apos;dan canlı veri çekilecek.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {visible.map((t) => {
            const isAlert = t.trend_pct >= 30;
            const isUp    = t.trend_pct > 0;
            const badgeCls = isAlert
              ? "bg-orange-500/20 text-orange-300 border border-orange-500/30"
              : isUp
              ? "bg-green-500/20 text-green-300 border border-green-500/30"
              : t.trend_pct < 0
              ? "bg-red-500/20 text-red-300 border border-red-500/30"
              : "bg-zinc-700/30 text-zinc-400 border border-zinc-600/30";
            const sparkColor = isAlert ? "#f97316" : isUp ? "#4ade80" : t.trend_pct < 0 ? "#f87171" : "#52525b";

            return (
              <div
                key={`${t.keyword}-${t.geo}`}
                className={`glass rounded-2xl p-5 transition-all ${isAlert ? "border border-orange-500/25" : "border border-white/5"}`}
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-base">{GEO_META[t.geo]?.flag}</span>
                      <span className="text-xs text-zinc-400 font-medium">{GEO_META[t.geo]?.name}</span>
                      {isAlert && <span className="text-xs px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-400 font-bold">⚡ ALARM</span>}
                    </div>
                    <p className="text-sm font-semibold text-white/90">{t.label}</p>
                    <p className="text-[11px] text-zinc-500 mt-0.5">&ldquo;{t.keyword}&rdquo;</p>
                  </div>
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-lg flex-shrink-0 ${badgeCls}`}>
                    {t.trend_pct > 0 ? "+" : ""}{t.trend_pct}%
                  </span>
                </div>

                {/* Sparkline */}
                {t.sparkline && t.sparkline.length > 1 && (
                  <div className="mt-3 w-full" style={{ color: sparkColor }}>
                    <MiniSparkline values={t.sparkline} />
                  </div>
                )}

                <p className="text-[10px] text-zinc-600 mt-3">
                  Son güncelleme: {new Date(t.fetched_at).toLocaleString("tr-TR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            );
          })}
        </div>
      )}

      {/* Info footer */}
      <div className="glass rounded-xl p-4 border border-white/5">
        <p className="text-xs text-zinc-500 leading-relaxed">
          <span className="text-zinc-400 font-medium">Nasıl hesaplanır:</span>{" "}
          Son 90 günlük arama hacmi ikiye bölünür; yeni yarı / eski yarı karşılaştırması yapılır.
          +30% ve üzeri artış{" "}
          <span className="text-orange-400">⚡ ALARM</span> tetikler.
          Veri kaynağı: DataForSEO Google Trends API · 24 saat önbellekleme.
        </p>
      </div>
    </div>
  );
}

// ─── GAPS TAB ─────────────────────────────────────────────────────────────────

function GapsTab() {
  const criticalCount = gaps.filter((g) => g.urgency === "critical").length;
  const avgCoverage = Math.round(gaps.filter((g) => g.urgency === "critical").reduce((a, g) => a + g.competitorCoverage, 0) / criticalCount);
  const [trends, setTrends] = useState<TrendMap>({});
  const [trendsLoading, setTrendsLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/google-trends`)
      .then((r) => r.ok ? r.json() : Promise.reject())
      .then((data: { trends: TrendMap }) => setTrends(data.trends ?? {}))
      .catch(() => {/* silent fallback */})
      .finally(() => setTrendsLoading(false));
  }, []);

  return (
    <div className="space-y-4">
      <div className="glass rounded-2xl p-4 flex items-center gap-3 border border-amber-500/20">
        <span className="w-2 h-2 rounded-full bg-amber-400 flex-shrink-0 live-dot" />
        <p className="text-sm text-amber-300/90">
          <span className="font-semibold">Bu hafta {criticalCount} kritik boşluk tespit edildi.</span>
          {" "}Rakipler bunların yalnızca %{avgCoverage}&apos;ini görüyor.
        </p>
      </div>
      <div className="grid gap-4">
        {gaps.map((g) => <GapCard key={g.id} gap={g} trends={trends} trendsLoading={trendsLoading} />)}
      </div>
    </div>
  );
}

function RadarTab() {
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <div className="space-y-6">

      {/* ── Reklam İstihbaratı ── */}
      <div>
        <p className="text-xs text-zinc-500 uppercase tracking-wider mb-3 px-1">Reklam İstihbaratı</p>
        <div className="space-y-3">
          {competitors.map((c) => (
            <div key={c.name} className="glass rounded-2xl overflow-hidden">
              <button
                className="w-full p-5 flex items-center gap-4 text-left glass-hover transition-all"
                onClick={() => setExpanded(expanded === c.name ? null : c.name)}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-semibold text-white/90 text-sm">{c.shortName}</span>
                    <span className="text-xs text-zinc-500">{c.name}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-zinc-400">
                    <span className="text-blue-400">● {c.activeAds.length} aktif reklam</span>
                    <span>{c.adSpendEstimate}</span>
                    <span className="text-purple-400">IG Eng: %{c.instagramEngagement}</span>
                  </div>
                </div>
                <svg className={`w-4 h-4 text-zinc-500 flex-shrink-0 transition-transform ${expanded === c.name ? "rotate-180" : ""}`}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {expanded === c.name && (
                <div className="px-5 pb-5 space-y-4 slide-up">
                  <div>
                    <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2">Aktif Reklamlar</p>
                    <div className="space-y-2">
                      {c.activeAds.map((ad, i) => (
                        <div key={i} className="flex items-start gap-3 rounded-xl p-3" style={{ background: "rgba(255,255,255,0.03)" }}>
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full mt-0.5 flex-shrink-0 ${
                            ad.platform === "Meta" ? "bg-blue-500/20 text-blue-400" :
                            ad.platform === "Google" ? "bg-red-500/20 text-red-400" :
                            "bg-purple-500/20 text-purple-400"
                          }`}>{ad.platform}</span>
                          <div>
                            <p className="text-sm text-white/80">{ad.headline}</p>
                            <p className="text-xs text-zinc-500">{ad.format} · {ad.since}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2">Top Keywords</p>
                    <div className="flex flex-wrap gap-1.5">
                      {c.topKeywords.map((kw) => (
                        <span key={kw} className="text-xs px-2 py-1 rounded-lg text-zinc-300" style={{ background: "rgba(255,255,255,0.05)" }}>{kw}</span>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-xl p-3" style={{ background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.2)" }}>
                    <p className="text-xs text-zinc-400 uppercase tracking-wider mb-1">Swissotel için Fırsat</p>
                    <p className="text-sm text-amber-300">{c.weakness}</p>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function VenuesTab() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {venueScores.sort((a, b) => b.score - a.score).map((v) => (
        <div key={v.name} className="glass glass-hover rounded-2xl p-5 transition-all">
          <div className="flex items-center justify-between mb-4">
            <div>
              <span className="font-semibold text-white/90">{v.name}</span>
              <div className="flex items-center gap-1.5 mt-0.5 text-xs text-zinc-500">
                <span>{v.targetAge}</span>
                <span>·</span>
                <span>{v.weeklyVisitors} haftalık ziyaret</span>
              </div>
            </div>
            <div className="text-right">
              <span className={`text-2xl font-bold ${scoreColor(v.score)}`}>{v.score}</span>
              <div className={`text-xs flex items-center justify-end gap-0.5 mt-0.5 ${
                v.trend === "up" ? "text-green-400" : v.trend === "down" ? "text-red-400" : "text-zinc-500"
              }`}>
                {v.trend === "up" ? "↑" : v.trend === "down" ? "↓" : "→"}
                {v.trend !== "flat" && <span>%{Math.abs(v.trendValue)}</span>}
              </div>
            </div>
          </div>
          <div className="w-full rounded-full h-1.5 mb-3" style={{ background: "rgba(255,255,255,0.06)" }}>
            <div className={`h-1.5 rounded-full ${scoreBg(v.score)}`} style={{ width: `${v.score}%` }} />
          </div>
          <div className="flex items-center gap-2 text-xs text-zinc-500 mb-3">
            <span>En iyi kanal:</span>
            <span className="text-zinc-300">{v.topChannel}</span>
          </div>
          <div className="text-xs rounded-lg p-2.5 text-zinc-300" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
            {v.topOpportunity}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── TRIPADVISOR TAB ─────────────────────────────────────────────────────────

function TripAdvisorTab() {
  const [data, setData] = React.useState<HotelReviewRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [selected, setSelected] = React.useState<string | null>(null);

  React.useEffect(() => {
    fetch("/api/tripadvisor-reviews")
      .then((r) => r.json())
      .then((d) => { setData(d.reviews ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  async function refresh() {
    setRefreshing(true);
    try {
      const r = await fetch("/api/tripadvisor-reviews?action=refresh", { method: "POST" });
      const d = await r.json();
      setData(d.reviews ?? []);
    } finally {
      setRefreshing(false);
    }
  }

  const maxReviews = Math.max(...data.map((d) => d.reviews_count ?? 0), 1);
  const fetchedAt = data[0]?.fetched_at
    ? new Date(data[0].fetched_at).toLocaleDateString("tr-TR", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" })
    : null;

  if (loading) return <div className="flex items-center justify-center h-48 text-zinc-500 text-sm">Veriler yükleniyor…</div>;

  if (data.length === 0) return (
    <div className="flex flex-col items-center justify-center h-48 gap-3">
      <p className="text-zinc-400 text-sm">Henüz TripAdvisor verisi çekilmedi.</p>
      <button onClick={refresh} disabled={refreshing}
        className="px-4 py-2 rounded-lg text-sm font-medium text-black"
        style={{ background: "linear-gradient(135deg,#34e0a1,#00af87)" }}>
        {refreshing ? "Çekiliyor… (~30sn)" : "TripAdvisor'dan Çek"}
      </button>
    </div>
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-white">TripAdvisor Puan Karşılaştırması</h2>
          {fetchedAt && <p className="text-xs text-zinc-500 mt-0.5">Son güncelleme: {fetchedAt}</p>}
        </div>
        <button onClick={refresh} disabled={refreshing}
          className="px-3 py-1.5 rounded-lg text-xs font-medium text-black transition-opacity"
          style={{ background: "linear-gradient(135deg,#34e0a1,#00af87)", opacity: refreshing ? 0.6 : 1 }}>
          {refreshing ? "Güncelleniyor…" : "↻ Güncelle"}
        </button>
      </div>

      {/* Leaderboard */}
      <div className="glass rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.07)" }}>
        <div className="px-5 py-3 border-b" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
          <p className="text-xs text-zinc-500 uppercase tracking-wider font-semibold">TripAdvisor Sıralaması</p>
        </div>
        <div className="p-3 space-y-2">
          {data.map((row, i) => {
            const meta = HOTEL_META[row.hotel_key];
            if (!meta) return null;
            const medalColor = i === 0 ? "#FFD700" : i === 1 ? "#C0C0C0" : i === 2 ? "#CD7F32" : "#3f3f46";
            const barW = Math.round(((row.rating - 3.5) / 1.5) * 100);
            const reviewsPct = Math.round((row.reviews_count / maxReviews) * 100);
            const isActive = selected === row.hotel_key;
            const taColor = "#34e0a1";
            return (
              <div key={row.hotel_key}
                onClick={() => setSelected(isActive ? null : row.hotel_key)}
                className="rounded-xl px-4 py-3 cursor-pointer transition-all duration-150"
                style={{
                  background: meta.isSelf ? "rgba(52,224,161,0.06)" : isActive ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.025)",
                  border: `1px solid ${meta.isSelf ? "rgba(52,224,161,0.25)" : isActive ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.05)"}`,
                }}>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-sm font-bold"
                    style={{ background: `${medalColor}20`, color: medalColor }}>{i + 1}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-sm font-medium text-white truncate">{meta.label}</span>
                      {meta.isSelf && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold"
                          style={{ background: "rgba(52,224,161,0.2)", color: taColor }}>SİZ</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.06)" }}>
                        <div className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${Math.max(barW, 0)}%`, background: taColor }} />
                      </div>
                      <span className="text-sm font-bold" style={{ color: taColor }}>🦉 {row.rating?.toFixed(1)}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex-1 h-1 rounded-full" style={{ background: "rgba(255,255,255,0.04)" }}>
                        <div className="h-full rounded-full" style={{ width: `${reviewsPct}%`, background: `${taColor}50` }} />
                      </div>
                      <span className="text-[11px] text-zinc-500">{row.reviews_count?.toLocaleString("tr-TR")} yorum</span>
                    </div>
                  </div>
                </div>

                {isActive && row.items?.length > 0 && (
                  <div className="mt-3 pt-3 border-t space-y-2" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                    <p className="text-[10px] text-zinc-600 uppercase tracking-wider font-semibold">Son Yorumlar</p>
                    {row.items.slice(0, 3).map((item, ri) => (
                      <div key={ri} className="rounded-lg p-3" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-medium text-white">{item.profile_name}</span>
                          <span className="text-[10px]" style={{ color: taColor }}>{"★".repeat(item.rating)}{"☆".repeat(5 - item.rating)}</span>
                          <span className="text-[10px] text-zinc-600 ml-auto">{item.time_ago}</span>
                        </div>
                        {item.title && <p className="text-[11px] font-medium text-zinc-300 mb-0.5">"{item.title}"</p>}
                        <p className="text-[11px] text-zinc-400 leading-relaxed line-clamp-3">{item.review_text}</p>
                        {item.owner_answer && (
                          <div className="mt-2 pl-2 border-l" style={{ borderColor: `${taColor}40` }}>
                            <p className="text-[10px] text-zinc-600 font-medium mb-0.5">Yönetim Yanıtı</p>
                            <p className="text-[10px] text-zinc-500 leading-relaxed line-clamp-2">{item.owner_answer}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Insight */}
      {data.length > 0 && (() => {
        const swiss = data.find((d) => d.hotel_key === "swissotel");
        const rank = data.findIndex((d) => d.hotel_key === "swissotel") + 1;
        const others = data.filter((d) => d.hotel_key !== "swissotel");
        const avgOthers = others.reduce((s, d) => s + d.rating, 0) / (others.length || 1);
        return (
          <div className="glass rounded-xl p-4" style={{ border: "1px solid rgba(52,224,161,0.2)" }}>
            <p className="text-xs text-zinc-400 leading-relaxed">
              <span className="font-semibold" style={{ color: "#34e0a1" }}>
                TripAdvisor'da {rank}. sıradasınız.
              </span>{" "}
              {swiss?.rating.toFixed(1)} puan · {swiss?.reviews_count?.toLocaleString("tr-TR")} yorum.
              Rakip ortalaması {avgOthers.toFixed(1)} — fark {swiss ? (swiss.rating - avgOthers > 0 ? "+" : "") + (swiss.rating - avgOthers).toFixed(2) : "—"} puan.
            </p>
          </div>
        );
      })()}
    </div>
  );
}

// ─── REVIEWS TAB ─────────────────────────────────────────────────────────────

const HOTEL_META: Record<string, { label: string; color: string; isSelf?: boolean }> = {
  swissotel:   { label: "Swissotel The Bosphorus", color: "#c9a84c", isSelf: true },
  conrad:      { label: "Conrad İstanbul",          color: "#3b82f6" },
  grandhyatt:  { label: "Grand Hyatt",              color: "#8b5cf6" },
  mandarin:    { label: "Mandarin Oriental",         color: "#ef4444" },
  fourseasons: { label: "Four Seasons",             color: "#22c55e" },
  rixos:       { label: "Rixos Tersane",            color: "#f59e0b" },
  ritzcarlton: { label: "Ritz-Carlton",             color: "#06b6d4" },
  hilton:      { label: "Hilton İstanbul",          color: "#ec4899" },
};

interface HotelReviewRow {
  hotel_key: string;
  platform: string;
  rating: number;
  reviews_count: number;
  items: { review_text: string; time_ago: string; rating: number; profile_name: string; owner_answer?: string; title?: string }[];
  fetched_at: string;
}

function ReviewsTab() {
  const [data, setData] = React.useState<HotelReviewRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [selected, setSelected] = React.useState<string | null>(null);

  React.useEffect(() => {
    fetch("/api/competitor-reviews")
      .then((r) => r.json())
      .then((d) => { setData(d.reviews ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  async function refresh() {
    setRefreshing(true);
    try {
      const r = await fetch("/api/competitor-reviews?action=refresh", { method: "POST" });
      const d = await r.json();
      setData(d.reviews ?? []);
    } finally {
      setRefreshing(false);
    }
  }

  const maxReviews = Math.max(...data.map((d) => d.reviews_count ?? 0), 1);
  const selectedData = data.find((d) => d.hotel_key === selected);
  const fetchedAt = data[0]?.fetched_at ? new Date(data[0].fetched_at).toLocaleDateString("tr-TR", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" }) : null;

  if (loading) return (
    <div className="flex items-center justify-center h-48 text-zinc-500 text-sm">Veriler yükleniyor…</div>
  );

  if (data.length === 0) return (
    <div className="flex flex-col items-center justify-center h-48 gap-3">
      <p className="text-zinc-400 text-sm">Henüz veri çekilmedi.</p>
      <button onClick={refresh} disabled={refreshing}
        className="px-4 py-2 rounded-lg text-sm font-medium text-black"
        style={{ background: "linear-gradient(135deg,#c9a84c,#e8c660)" }}>
        {refreshing ? "Çekiliyor…" : "Google'dan Çek"}
      </button>
    </div>
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-white">Google İtibar Skoru</h2>
          {fetchedAt && <p className="text-xs text-zinc-500 mt-0.5">Son güncelleme: {fetchedAt}</p>}
        </div>
        <button onClick={refresh} disabled={refreshing}
          className="px-3 py-1.5 rounded-lg text-xs font-medium text-black transition-opacity"
          style={{ background: "linear-gradient(135deg,#c9a84c,#e8c660)", opacity: refreshing ? 0.6 : 1 }}>
          {refreshing ? "Güncelleniyor…" : "↻ Güncelle"}
        </button>
      </div>

      {/* Leaderboard */}
      <div className="glass rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.07)" }}>
        <div className="px-5 py-3 border-b" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
          <p className="text-xs text-zinc-500 uppercase tracking-wider font-semibold">Google Puan Sıralaması</p>
        </div>
        <div className="p-3 space-y-2">
          {data.map((row, i) => {
            const meta = HOTEL_META[row.hotel_key];
            if (!meta) return null;
            const medalColor = i === 0 ? "#FFD700" : i === 1 ? "#C0C0C0" : i === 2 ? "#CD7F32" : "#3f3f46";
            const barW = Math.round(((row.rating - 4) / 1) * 100);
            const reviewsPct = Math.round((row.reviews_count / maxReviews) * 100);
            const isActive = selected === row.hotel_key;
            return (
              <div key={row.hotel_key}
                onClick={() => setSelected(isActive ? null : row.hotel_key)}
                className="rounded-xl px-4 py-3 cursor-pointer transition-all duration-150"
                style={{
                  background: meta.isSelf ? "rgba(201,168,76,0.07)" : isActive ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.025)",
                  border: `1px solid ${meta.isSelf ? "rgba(201,168,76,0.25)" : isActive ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.05)"}`,
                }}>
                <div className="flex items-center gap-3">
                  {/* Rank */}
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-sm font-bold"
                    style={{ background: `${medalColor}20`, color: medalColor }}>
                    {i + 1}
                  </div>
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-sm font-medium text-white truncate">{meta.label}</span>
                      {meta.isSelf && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold"
                          style={{ background: "rgba(201,168,76,0.2)", color: "#c9a84c" }}>SİZ</span>
                      )}
                    </div>
                    {/* Rating bar */}
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.06)" }}>
                        <div className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${barW}%`, background: meta.color }} />
                      </div>
                      <span className="text-sm font-bold" style={{ color: meta.color }}>
                        ★ {row.rating?.toFixed(1)}
                      </span>
                    </div>
                    {/* Reviews count bar */}
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex-1 h-1 rounded-full" style={{ background: "rgba(255,255,255,0.04)" }}>
                        <div className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${reviewsPct}%`, background: `${meta.color}60` }} />
                      </div>
                      <span className="text-[11px] text-zinc-500">
                        {row.reviews_count?.toLocaleString("tr-TR")} yorum
                      </span>
                    </div>
                  </div>
                </div>

                {/* Expanded: recent reviews */}
                {isActive && selectedData?.items && selectedData.items.length > 0 && (
                  <div className="mt-3 pt-3 border-t space-y-2" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                    <p className="text-[10px] text-zinc-600 uppercase tracking-wider font-semibold">Son Yorumlar</p>
                    {selectedData.items.slice(0, 3).map((item, ri) => (
                      <div key={ri} className="rounded-lg p-3" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-medium text-white">{item.profile_name}</span>
                          <span className="text-[10px]" style={{ color: meta.color }}>{"★".repeat(item.rating)}{"☆".repeat(5 - item.rating)}</span>
                          <span className="text-[10px] text-zinc-600 ml-auto">{item.time_ago}</span>
                        </div>
                        <p className="text-[11px] text-zinc-400 leading-relaxed line-clamp-3">{item.review_text}</p>
                        {item.owner_answer && (
                          <div className="mt-2 pl-2 border-l" style={{ borderColor: `${meta.color}40` }}>
                            <p className="text-[10px] text-zinc-600 font-medium mb-0.5">Yönetim Yanıtı</p>
                            <p className="text-[10px] text-zinc-500 leading-relaxed line-clamp-2"
                              dangerouslySetInnerHTML={{ __html: item.owner_answer.replace(/<br>/g, " ") }} />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Summary insight */}
      {data.length > 0 && (
        <div className="glass rounded-xl p-4" style={{ border: "1px solid rgba(201,168,76,0.2)" }}>
          <p className="text-xs text-zinc-400 leading-relaxed">
            <span className="text-yellow-400 font-semibold">Swissotel rakiplerini geride bırakıyor.</span>{" "}
            {(() => {
              const swiss = data.find((d) => d.hotel_key === "swissotel");
              const others = data.filter((d) => d.hotel_key !== "swissotel");
              const avgOthers = others.reduce((s, d) => s + d.rating, 0) / (others.length || 1);
              const diff = swiss ? (swiss.rating - avgOthers).toFixed(2) : "0";
              return `${swiss?.rating.toFixed(1)} puan ve ${swiss?.reviews_count?.toLocaleString("tr-TR")} yorumla lidersiniz. Rakip ortalaması: ${avgOthers.toFixed(1)} — aranızdaki fark +${diff} puan.`;
            })()}
          </p>
        </div>
      )}
    </div>
  );
}

function DemandTab() {
  const impactConfig = {
    high:   { label: "YÜKSEK ETKİ", color: "text-red-400",   borderColor: "rgba(239,68,68,0.25)",   bg: "rgba(239,68,68,0.08)" },
    medium: { label: "ORTA ETKİ",  color: "text-amber-400", borderColor: "rgba(251,191,36,0.25)", bg: "rgba(251,191,36,0.08)" },
    low:    { label: "DÜŞÜK ETKİ", color: "text-blue-400",  borderColor: "rgba(59,130,246,0.25)",  bg: "rgba(59,130,246,0.08)" },
  };
  const typeIcon: Record<string, string> = { event: "📅", trend: "📈", flight: "✈️", weather: "🌤️" };

  return (
    <div className="space-y-4">
      <div className="glass rounded-2xl p-4" style={{ border: "1px solid rgba(255,255,255,0.08)" }}>
        <p className="text-xs text-zinc-500 uppercase tracking-wider mb-3">Bu Hafta İstanbul Pazarı</p>
        <div className="grid grid-cols-3 gap-4 text-center">
          {[
            { value: "↑34%", label: "Rooftop aramaları", color: "text-green-400" },
            { value: "4.200", label: "Ek uçuş yolcusu", color: "text-amber-400" },
            { value: "+112%", label: "Easter brunch trend", color: "text-purple-400" },
          ].map((stat) => (
            <div key={stat.label}>
              <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
              <p className="text-xs text-zinc-500 mt-0.5">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>

      {demandSignals.map((s, i) => {
        const ic = impactConfig[s.impact];
        return (
          <div key={i} className="glass glass-hover rounded-2xl p-5 transition-all"
            style={{ border: `1px solid ${ic.borderColor}` }}>
            <div className="flex items-start gap-3">
              <span className="text-2xl">{typeIcon[s.type]}</span>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="font-semibold text-white/90 text-sm">{s.title}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${ic.color}`}
                    style={{ background: ic.bg }}>{ic.label}</span>
                </div>
                <p className="text-xs text-zinc-500 mb-2">{s.date}</p>
                <p className="text-sm text-zinc-300 mb-3">{s.description}</p>
                <div className="flex flex-wrap gap-1.5">
                  {s.venues.map((v) => (
                    <span key={v} className="text-xs px-2 py-0.5 rounded-full text-zinc-300" style={{ background: "rgba(255,255,255,0.06)" }}>{v}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── colour palette per competitor ──────────────────────────────────────────
const HANDLE_COLOR: Record<string, string> = {
  swissotelthebosphorus:    "#c9a84c", // gold — kendi markamız
  fsbosphorus:              "#f59e0b",
  conradistanbulbosphorus:  "#3b82f6",
  grandhyattistanbul:       "#22c55e",
  mo_istanbul:              "#ef4444",
  rixostersaneistanbul:     "#8b5cf6",
  hiltonistanbulbosphorus:  "#06b6d4",
  ritzcarltonistanbul:      "#f97316",
};

function shortLabel(handle: string) {
  return competitors.find((c) => c.instagramHandle === handle)?.shortName ?? handle;
}

// ─── ENGAGEMENT INTELLIGENCE TAB ─────────────────────────────────────────────

const DAY_OPTIONS = [
  { value: 7,  label: "7 gün" },
  { value: 30, label: "30 gün" },
  { value: 90, label: "90 gün" },
];

type EngStat = (ContentStat | PostStats) & { last_fetch?: string | null };

// Today as YYYY-MM-DD in local time
function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function ContentIntelligenceTab() {
  const [days, setDays]             = useState<number | null>(30);
  const [dateFrom, setDateFrom]     = useState("");
  const [dateTo, setDateTo]         = useState("");
  const [showCustom, setShowCustom] = useState(false);

  const [stats, setStats]           = useState<EngStat[]>([]);
  const [scrapedSet, setScrapedSet] = useState<Set<string>>(new Set());
  const [failedSet, setFailedSet]   = useState<Set<string>>(new Set()); // fetched but 0 posts
  const [latestSnaps, setLatestSnaps] = useState<Snapshot[]>([]);
  const [loading, setLoading]       = useState(false);
  const [fetchingHandle, setFetchingHandle] = useState<string | null>(null);
  const [showManual, setShowManual] = useState(false);
  const [msg, setMsg]               = useState<string | null>(null);
  const [loadError, setLoadError]   = useState<string | null>(null);

  // Manual form state
  const [mHandle, setMHandle]       = useState(competitors[0]?.instagramHandle ?? "");
  const [mPosts, setMPosts]         = useState("");
  const [mPhotos, setMPhotos]       = useState("");
  const [mVideos, setMVideos]       = useState("");
  const [mCarousel, setMCarousel]   = useState("");
  const [mLikes, setMLikes]         = useState("");
  const [mComments, setMComments]   = useState("");
  const [mViews, setMViews]         = useState("");

  const load = useCallback(async (d: number | null, from?: string, to?: string) => {
    setLoading(true);
    setLoadError(null);
    try {
      let url = "/api/instagram-content";
      if (from && to) {
        url += `?from=${from}&to=${to}`;
      } else {
        url += `?days=${d ?? 30}`;
      }
      const [contentRes, snapRes] = await Promise.all([
        fetch(url),
        fetch("/api/instagram-history?days=1"),
      ]);
      const contentData = await contentRes.json().catch(() => ({}));
      const snapData    = await snapRes.json().catch(() => ({}));
      setStats(contentData.stats ?? []);
      setScrapedSet(new Set(contentData.scraped ?? []));
      setFailedSet(new Set(contentData.failed ?? []));
      setLatestSnaps(snapData.latest ?? []);
    } catch (e) {
      setLoadError(String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(days); }, [load, days]);

  const applyCustomRange = () => {
    if (!dateFrom || !dateTo) return;
    setDays(null);
    load(null, dateFrom, dateTo);
  };

  const fetchOne = async (username: string) => {
    const snap = latestSnaps.find((s) => s.username === username);
    setFetchingHandle(username);
    setMsg(`⏳ ${username} için Apify çalışıyor (100 post), 2-3 dakika sürebilir...`);
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 180000); // 3 min
      const res = await fetch("/api/instagram-content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "apify", username, followers: snap?.followers ?? 0 }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      const d = await res.json().catch(() => ({ error: "Geçersiz yanıt" }));
      if (d.error) throw new Error(d.error);
      if (!d.posts_scraped || d.posts_scraped === 0) {
        setFailedSet((prev) => new Set(prev).add(username));
        setMsg(`⚠️ ${username} — post çekilemedi (hesap kısıtlı olabilir)`);
      } else {
        setMsg(`✓ ${username} — ${d.posts_scraped} post kaydedildi`);
        load(days);
      }
    } catch (e) {
      if (String(e).includes("aborted") || String(e).includes("abort")) {
        setMsg("⏱ Zaman aşımı — Apify çok uzun sürdü. Manuel giriş kullanın.");
      } else {
        setMsg(`⚠️ ${String(e)} — Manuel giriş ile devam edin.`);
      }
    } finally {
      setFetchingHandle(null);
    }
  };

  const saveManual = async () => {
    const snap = latestSnaps.find((s) => s.username === mHandle);
    setMsg(null);
    try {
      const res = await fetch("/api/instagram-content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "manual",
          username: mHandle,
          followers: snap?.followers ?? 0,
          posts_scraped: mPosts,
          photo_count: mPhotos,
          video_count: mVideos,
          carousel_count: mCarousel,
          avg_likes: mLikes,
          avg_comments: mComments,
          avg_views: mViews,
        }),
      });
      const d = await res.json();
      if (d.error) throw new Error(d.error);
      setMsg("✓ Kaydedildi");
      load(days);
    } catch (e) {
      setMsg(`Hata: ${e}`);
    }
  };

  const statMap = new Map(stats.map((s) => [s.username, s]));
  const snapMap = new Map(latestSnaps.map((s) => [s.username, s]));

  // Sort competitors by engagement_rate desc
  const sorted = [...competitors].sort((a, b) => {
    const ra = Number(statMap.get(a.instagramHandle)?.engagement_rate ?? 0);
    const rb = Number(statMap.get(b.instagramHandle)?.engagement_rate ?? 0);
    return rb - ra;
  });

  const maxEng = Math.max(
    ...sorted.map((c) => Number(statMap.get(c.instagramHandle)?.engagement_rate ?? 0)),
    0.01
  );

  const medalColor = (i: number) =>
    i === 0 ? "#FFD700" : i === 1 ? "#C0C0C0" : i === 2 ? "#CD7F32" : "#3f3f46";

  const formatDate = (iso: string | null | undefined) => {
    if (!iso) return null;
    const d = new Date(iso);
    return d.toLocaleDateString("tr-TR", { day: "numeric", month: "short", year: "numeric" });
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h3 className="font-semibold text-white/90">Engagement Intelligence</h3>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Preset day filter */}
          <div className="flex rounded-xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.08)" }}>
            {DAY_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => { setDays(opt.value); setShowCustom(false); setDateFrom(""); setDateTo(""); }}
                className={`text-xs px-3 py-1.5 transition-all ${
                  days === opt.value && !showCustom
                    ? "text-amber-300 font-semibold"
                    : "text-zinc-500 hover:text-zinc-300"
                }`}
                style={days === opt.value && !showCustom ? { background: "rgba(201,168,76,0.18)" } : {}}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Custom date range toggle */}
          <button
            onClick={() => { setShowCustom(!showCustom); if (!showCustom) { setDays(null); setDateTo(todayStr()); } }}
            className={`text-xs px-3 py-1.5 rounded-xl transition-all ${
              showCustom
                ? "text-amber-300 font-semibold"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
            style={{
              border: "1px solid rgba(255,255,255,0.08)",
              background: showCustom ? "rgba(201,168,76,0.18)" : undefined,
            }}
          >
            📅 Tarih seç
          </button>

          <button
            onClick={() => setShowManual(!showManual)}
            className={`text-xs px-3 py-1.5 rounded-lg transition-all ${
              showManual
                ? "text-amber-300 bg-amber-500/20 border border-amber-500/40"
                : "glass glass-hover text-zinc-400"
            }`}
          >
            Manuel Giriş
          </button>
        </div>
      </div>

      {/* Custom date range picker */}
      {showCustom && (
        <div className="flex items-center gap-3 flex-wrap glass rounded-xl px-4 py-3"
          style={{ border: "1px solid rgba(201,168,76,0.2)" }}>
          <span className="text-xs text-zinc-400">Başlangıç</span>
          <input
            type="date"
            value={dateFrom}
            max={dateTo || todayStr()}
            onChange={(e) => setDateFrom(e.target.value)}
            className="bg-transparent border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-amber-500/50"
            style={{ colorScheme: "dark" }}
          />
          <span className="text-xs text-zinc-600">—</span>
          <span className="text-xs text-zinc-400">Bitiş</span>
          <input
            type="date"
            value={dateTo}
            min={dateFrom}
            max={todayStr()}
            onChange={(e) => setDateTo(e.target.value)}
            className="bg-transparent border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-amber-500/50"
            style={{ colorScheme: "dark" }}
          />
          <button
            onClick={applyCustomRange}
            disabled={!dateFrom || !dateTo}
            className="text-xs px-4 py-1.5 rounded-lg font-semibold text-black disabled:opacity-40"
            style={{ background: "linear-gradient(135deg,#c9a84c,#e8c660)" }}
          >
            Uygula
          </button>
          {dateFrom && dateTo && (
            <span className="text-[10px] text-zinc-600">
              {dateFrom} → {dateTo}
            </span>
          )}
        </div>
      )}

      {/* Manual form */}
      {showManual && (
        <div className="glass rounded-2xl p-4 space-y-3" style={{ border: "1px solid rgba(201,168,76,0.25)" }}>
          <p className="text-xs text-zinc-400 font-medium">Manuel veri girişi</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <select
              value={mHandle}
              onChange={(e) => setMHandle(e.target.value)}
              className="col-span-2 sm:col-span-4 bg-transparent border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-amber-500/50"
            >
              {competitors.map((c) => (
                <option key={c.instagramHandle} value={c.instagramHandle} className="bg-zinc-900">
                  {c.shortName} (@{c.instagramHandle})
                </option>
              ))}
            </select>
            {[
              { label: "Toplam post", val: mPosts,    set: setMPosts },
              { label: "📷 Fotoğraf",  val: mPhotos,   set: setMPhotos },
              { label: "🎬 Reel/Video",val: mVideos,   set: setMVideos },
              { label: "📑 Carousel",  val: mCarousel, set: setMCarousel },
              { label: "Ort. Like",    val: mLikes,    set: setMLikes },
              { label: "Ort. Yorum",   val: mComments, set: setMComments },
              { label: "Ort. Görüntülenme", val: mViews, set: setMViews },
            ].map(({ label, val, set }) => (
              <input
                key={label}
                type="number"
                placeholder={label}
                value={val}
                onChange={(e) => set(e.target.value)}
                className="bg-transparent border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-amber-500/50 placeholder:text-zinc-600"
              />
            ))}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={saveManual}
              className="text-xs px-4 py-2 rounded-lg font-semibold text-black"
              style={{ background: "linear-gradient(135deg,#c9a84c,#e8c660)" }}
            >
              Kaydet
            </button>
            {msg && <span className="text-xs text-zinc-400">{msg}</span>}
          </div>
        </div>
      )}

      {loading && (
        <div className="flex items-center gap-3 py-10 justify-center">
          <div className="w-5 h-5 border-2 border-amber-500/30 border-t-amber-400 rounded-full animate-spin" />
          <p className="text-sm text-zinc-400">Yükleniyor...</p>
        </div>
      )}

      {loadError && (
        <p className="text-xs text-red-400 text-center py-4">{loadError}</p>
      )}

      {msg && !showManual && (
        <div className="glass rounded-xl px-4 py-3 text-xs text-zinc-300" style={{ border: "1px solid rgba(255,255,255,0.08)" }}>
          {msg}
        </div>
      )}

      {/* Cards */}
      {!loading && (
        <div className="space-y-2">
          {sorted.map((c, i) => {
            const stat    = statMap.get(c.instagramHandle);
            const snap    = snapMap.get(c.instagramHandle);
            const color   = HANDLE_COLOR[c.instagramHandle] ?? "#6b7280";
            const engRate = Number(stat?.engagement_rate ?? 0);
            const engPct  = maxEng > 0 ? (engRate / maxEng) * 100 : 0;
            const photo   = stat ? Number((stat as PostStats).photo_count ?? (stat as ContentStat).photo_count ?? 0) : 0;
            const video   = stat ? Number((stat as PostStats).video_count ?? (stat as ContentStat).video_count ?? 0) : 0;
            const carousel = stat ? Number((stat as PostStats).carousel_count ?? (stat as ContentStat).carousel_count ?? 0) : 0;
            const total   = photo + video + carousel;
            const totalPosts = stat ? Number((stat as PostStats).total_posts ?? (stat as ContentStat).posts_scraped ?? 0) : 0;
            const isSelf  = c.isSelf;
            const lastFetch = (stat as EngStat)?.last_fetch ?? null;

            return (
              <div
                key={c.instagramHandle}
                className="glass rounded-2xl p-4 transition-all"
                style={{
                  border: `1px solid ${isSelf ? "rgba(201,168,76,0.22)" : "rgba(255,255,255,0.06)"}`,
                  background: isSelf ? "rgba(201,168,76,0.05)" : undefined,
                }}
              >
                <div className="flex items-start gap-3">
                  {/* Rank badge */}
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-sm font-bold mt-0.5"
                    style={{ background: `${medalColor(i)}20`, color: medalColor(i) }}
                  >
                    {i + 1}
                  </div>

                  {/* Main content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span className="text-sm font-semibold text-white/90">{c.shortName}</span>
                      {isSelf && (
                        <span
                          className="text-[9px] px-1.5 py-0.5 rounded-full font-bold"
                          style={{ background: "rgba(201,168,76,0.25)", color: "#c9a84c" }}
                        >
                          BİZ
                        </span>
                      )}
                      {snap && (
                        <span className="text-xs text-zinc-600">
                          {(snap.followers / 1000).toFixed(1)}K takipçi
                        </span>
                      )}
                      {lastFetch && (
                        <span className="text-[10px] text-zinc-700 ml-auto">
                          son güncelleme: {formatDate(lastFetch)}
                        </span>
                      )}
                    </div>

                    {stat ? (
                      <>
                        {/* Content type pills */}
                        <div className="flex items-center gap-2 mb-3 flex-wrap">
                          <span
                            className="text-xs px-2 py-0.5 rounded-md font-medium"
                            style={{ background: "rgba(255,255,255,0.07)", color: "#a1a1aa" }}
                          >
                            📷 {photo} fotoğraf
                          </span>
                          <span
                            className="text-xs px-2 py-0.5 rounded-md font-medium"
                            style={{ background: "rgba(255,255,255,0.07)", color: "#a1a1aa" }}
                          >
                            🎬 {video} reel
                          </span>
                          <span
                            className="text-xs px-2 py-0.5 rounded-md font-medium"
                            style={{ background: "rgba(255,255,255,0.07)", color: "#a1a1aa" }}
                          >
                            📑 {carousel} carousel
                          </span>
                          <span className="text-xs text-zinc-600">· son {days} günde {totalPosts} post</span>
                        </div>

                        {/* Avg metrics */}
                        <div className="flex items-center gap-4 mb-3 flex-wrap">
                          <div className="text-center">
                            <p className="text-sm font-bold tabular-nums text-rose-400">
                              {Math.round(Number(stat.avg_likes)).toLocaleString("tr-TR")}
                            </p>
                            <p className="text-[10px] text-zinc-600">ort. like</p>
                          </div>
                          <div className="text-center">
                            <p className="text-sm font-bold tabular-nums text-sky-400">
                              {Math.round(Number(stat.avg_comments)).toLocaleString("tr-TR")}
                            </p>
                            <p className="text-[10px] text-zinc-600">ort. yorum</p>
                          </div>
                          {Number(stat.avg_views) > 0 && (
                            <div className="text-center">
                              <p className="text-sm font-bold tabular-nums text-violet-400">
                                {Number(stat.avg_views) >= 1000
                                  ? `${(Number(stat.avg_views) / 1000).toFixed(1)}K`
                                  : Math.round(Number(stat.avg_views)).toLocaleString("tr-TR")}
                              </p>
                              <p className="text-[10px] text-zinc-600">ort. görüntülenme</p>
                            </div>
                          )}
                          {/* Content type bar */}
                          {total > 0 && (
                            <div className="flex-1 min-w-[80px]">
                              <div className="flex rounded-full overflow-hidden h-1.5">
                                <div style={{ width: `${(photo / total) * 100}%`, background: "#f59e0b" }} />
                                <div style={{ width: `${(video / total) * 100}%`, background: "#8b5cf6" }} />
                                <div style={{ width: `${(carousel / total) * 100}%`, background: "#06b6d4" }} />
                              </div>
                              <p className="text-[9px] text-zinc-700 mt-0.5">
                                <span style={{ color: "#f59e0b" }}>■</span> foto
                                <span className="ml-1" style={{ color: "#8b5cf6" }}>■</span> reel
                                <span className="ml-1" style={{ color: "#06b6d4" }}>■</span> carousel
                              </p>
                            </div>
                          )}
                        </div>
                      </>
                    ) : failedSet.has(c.instagramHandle) ? (
                      /* Fetch attempted but account is private / no content */
                      <p className="text-xs text-zinc-600 py-3">İçerik yok</p>
                    ) : scrapedSet.has(c.instagramHandle) ? (
                      /* Scraped but no posts in selected date range */
                      <p className="text-xs text-zinc-600 py-3">Bu dönemde post yok</p>
                    ) : (
                      /* Never scraped — show fetch button */
                      <div className="flex flex-col items-center gap-2 py-3">
                        <p className="text-xs text-zinc-600">Henüz veri yok</p>
                        <button
                          onClick={() => fetchOne(c.instagramHandle)}
                          disabled={fetchingHandle !== null}
                          className="text-xs px-4 py-2 rounded-lg font-medium transition-all disabled:opacity-40"
                          style={{ background: "rgba(201,168,76,0.15)", color: "#c9a84c", border: "1px solid rgba(201,168,76,0.3)" }}
                        >
                          {fetchingHandle === c.instagramHandle ? "⏳ Çekiliyor..." : "Apify ile çek"}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Engagement rate (only when data exists) */}
                  {stat && (
                    <div className="flex flex-col items-end gap-2 flex-shrink-0">
                      <div className="text-right">
                        <p className="text-xl font-bold tabular-nums leading-none" style={{ color }}>
                          %{engRate.toFixed(2)}
                        </p>
                        <p className="text-[10px] text-zinc-600 mt-0.5">eng. rate</p>
                      </div>
                      <div className="w-16 rounded-full h-1" style={{ background: "rgba(255,255,255,0.07)" }}>
                        <div
                          className="h-1 rounded-full transition-all duration-700"
                          style={{ width: `${engPct}%`, background: color }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Posting Frequency Heatmap */}
      <PostingHeatmapSection />
    </div>
  );
}

// ─── Posting Frequency Heatmap ────────────────────────────────────────────────

type ScheduleRow = { username: string; date: string; count: number };

const DOW_LABELS = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"]; // index 0–6, ISODOW 1–7

function heatmapColor(count: number) {
  if (count === 0)  return "bg-zinc-800";
  if (count <= 2)   return "bg-green-300";
  if (count <= 5)   return "bg-green-500";
  if (count <= 10)  return "bg-green-700";
  return "bg-green-900";
}

// Returns ISO week key "YYYY-Www" for a date string
function isoWeekKey(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  // Set to nearest Thursday (ISO week rule)
  const thu = new Date(d);
  thu.setDate(d.getDate() - ((d.getDay() + 6) % 7) + 3);
  const year = thu.getFullYear();
  const week1 = new Date(year, 0, 4); // Jan 4 is always in week 1
  const weekNum = Math.round(((thu.getTime() - week1.getTime()) / 86400000 + ((week1.getDay() + 6) % 7)) / 7) + 1;
  return `${year}-W${String(weekNum).padStart(2, "0")}`;
}

// Returns Monday of the ISO week as a display label
function weekStartLabel(weekKey: string): string {
  const [year, wStr] = weekKey.split("-W");
  const jan4 = new Date(Number(year), 0, 4);
  const week1Mon = new Date(jan4);
  week1Mon.setDate(jan4.getDate() - ((jan4.getDay() + 6) % 7));
  const mon = new Date(week1Mon);
  mon.setDate(week1Mon.getDate() + (Number(wStr) - 1) * 7);
  return mon.toLocaleDateString("tr-TR", { day: "numeric", month: "short" });
}

function PostingHeatmapSection() {
  const [data, setData]         = useState<ScheduleRow[]>([]);
  const [loading, setLoading]   = useState(true);
  const [selected, setSelected] = useState<string | null>(null);
  const [view, setView]         = useState<"monthly" | "weekly">("monthly");
  const [hovered, setHovered]   = useState<{ label: string; count: number; x: number; y: number } | null>(null);

  useEffect(() => {
    fetch("/api/instagram-posting-schedule")
      .then((r) => r.json())
      .then((j) => { setData(j.data ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  // date-level map: "YYYY-MM-DD" → total count (filtered)
  const dateMap: Record<string, number> = {};
  for (const row of data) {
    if (selected !== null && row.username !== selected) continue;
    dateMap[row.date] = (dateMap[row.date] ?? 0) + row.count;
  }

  // weekly map: weekKey → { dow: count }
  const weekMap: Record<string, Record<number, number>> = {};
  for (const row of data) {
    if (selected !== null && row.username !== selected) continue;
    const d   = new Date(row.date + "T00:00:00");
    const dow = d.getDay() === 0 ? 7 : d.getDay();
    const key = isoWeekKey(row.date);
    if (!weekMap[key]) weekMap[key] = {};
    weekMap[key][dow] = (weekMap[key][dow] ?? 0) + row.count;
  }

  // Months present in data
  const monthSet = new Set(Object.keys(dateMap).map((d) => d.slice(0, 7)));
  const months   = Array.from(monthSet).sort();
  const weeks    = Object.keys(weekMap).sort();

  const totalPosts = Object.values(dateMap).reduce((a, b) => a + b, 0);

  const daysInMonth = (ym: string) => {
    const [y, m] = ym.split("-").map(Number);
    return new Date(y, m, 0).getDate(); // last day of month
  };

  const monthLabel = (ym: string) => {
    const [y, m] = ym.split("-").map(Number);
    return new Date(y, m - 1, 1).toLocaleDateString("tr-TR", { month: "short", year: "2-digit" });
  };

  return (
    <div className="glass rounded-2xl p-5 space-y-4" style={{ border: "1px solid rgba(255,255,255,0.07)" }}>
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h4 className="text-sm font-semibold text-white/80">Paylaşım Takvimi</h4>
          <p className="text-xs text-zinc-500 mt-0.5">{totalPosts} post · son 6 ay</p>
        </div>
        <div className="flex rounded-xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.08)" }}>
          {(["monthly", "weekly"] as const).map((v) => (
            <button key={v} onClick={() => setView(v)}
              className={`text-xs px-3 py-1.5 transition-all ${view === v ? "text-amber-300 font-semibold" : "text-zinc-500 hover:text-zinc-300"}`}
              style={view === v ? { background: "rgba(201,168,76,0.18)" } : {}}>
              {v === "monthly" ? "Aylık" : "Haftalık"}
            </button>
          ))}
        </div>
      </div>

      {/* Filter chips */}
      <div className="flex flex-wrap gap-1.5">
        <button onClick={() => setSelected(null)}
          className={`text-xs px-3 py-1 rounded-full transition-all ${selected === null ? "bg-amber-500/20 text-amber-300 border border-amber-500/40" : "text-zinc-500 border border-zinc-700 hover:text-zinc-300"}`}>
          Tümü
        </button>
        {competitors.map((c) => (
          <button key={c.instagramHandle}
            onClick={() => setSelected(selected === c.instagramHandle ? null : c.instagramHandle)}
            className={`text-xs px-3 py-1 rounded-full transition-all ${selected === c.instagramHandle ? "bg-green-500/20 text-green-300 border border-green-500/40" : "text-zinc-500 border border-zinc-700 hover:text-zinc-300"}`}>
            {c.shortName}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-xs text-zinc-600 py-4 text-center">Yükleniyor…</div>
      ) : (months.length === 0 && weeks.length === 0) ? (
        <div className="text-xs text-zinc-600 py-4 text-center">Henüz post verisi yok</div>
      ) : view === "monthly" ? (
        /* ── MONTHLY: rows = months, cols = day 1..N of that month ── */
        <div className="space-y-1.5">
          {/* Day number header — 1..31, show every 5 */}
          <div className="flex items-center gap-1">
            <div className="w-14 shrink-0" />
            <div className="flex flex-1 gap-px">
              {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                <div key={d} className="flex-1 text-center text-[9px] text-zinc-600">
                  {d === 1 || d % 5 === 0 ? d : ""}
                </div>
              ))}
            </div>
          </div>
          {months.map((ym) => {
            const days = daysInMonth(ym);
            return (
              <div key={ym} className="flex items-center gap-1">
                <div className="w-14 shrink-0 text-[10px] font-semibold text-zinc-400 text-right pr-2">
                  {monthLabel(ym)}
                </div>
                <div className="flex flex-1 gap-px">
                  {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => {
                    if (d > days) {
                      return <div key={d} className="flex-1 aspect-square opacity-0 pointer-events-none" />;
                    }
                    const dateStr = `${ym}-${String(d).padStart(2, "0")}`;
                    const count   = dateMap[dateStr] ?? 0;
                    return (
                      <div
                        key={d}
                        className={`flex-1 aspect-square rounded-sm cursor-default transition-opacity hover:opacity-75 ${heatmapColor(count)}`}
                        onMouseEnter={(e) => {
                          const rect = (e.target as HTMLElement).getBoundingClientRect();
                          setHovered({ label: `${d} ${monthLabel(ym)}`, count, x: rect.left + window.scrollX, y: rect.top + window.scrollY });
                        }}
                        onMouseLeave={() => setHovered(null)}
                      />
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* ── WEEKLY: rows = weeks, cols = Pzt..Paz ── */
        <div className="overflow-x-auto">
          <table className="border-separate border-spacing-1">
            <thead>
              <tr>
                <th className="w-16" />
                {DOW_LABELS.map((d) => (
                  <th key={d} className="w-8 text-[10px] font-medium text-zinc-500 text-center pb-1">{d}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {weeks.map((key) => (
                <tr key={key}>
                  <td className="text-[10px] font-semibold text-zinc-400 pr-2 text-right whitespace-nowrap">
                    {weekStartLabel(key)}
                  </td>
                  {[1, 2, 3, 4, 5, 6, 7].map((dow) => {
                    const count = weekMap[key]?.[dow] ?? 0;
                    return (
                      <td key={dow} className="p-0">
                        <div
                          className={`w-8 h-8 rounded-lg cursor-default transition-opacity hover:opacity-75 ${heatmapColor(count)}`}
                          onMouseEnter={(e) => {
                            const rect = (e.target as HTMLElement).getBoundingClientRect();
                            setHovered({ label: `${weekStartLabel(key)} · ${DOW_LABELS[dow - 1]}`, count, x: rect.left + window.scrollX, y: rect.top + window.scrollY });
                          }}
                          onMouseLeave={() => setHovered(null)}
                        />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center gap-1.5 justify-end">
        <span className="text-[9px] text-zinc-600">Az</span>
        {["bg-zinc-800", "bg-green-300", "bg-green-500", "bg-green-700", "bg-green-900"].map((cls) => (
          <div key={cls} className={`w-3.5 h-3.5 rounded ${cls}`} />
        ))}
        <span className="text-[9px] text-zinc-600">Çok</span>
      </div>

      {/* Tooltip */}
      {hovered && (
        <div className="fixed z-50 pointer-events-none px-2.5 py-1.5 rounded-lg text-xs text-white shadow-xl"
          style={{ left: hovered.x + 10, top: hovered.y - 38, background: "rgba(20,20,28,0.95)", border: "1px solid rgba(255,255,255,0.12)" }}>
          <span className="text-zinc-300">{hovered.label}</span>
          {" · "}
          <span className={hovered.count > 0 ? "text-green-400 font-semibold" : "text-zinc-500"}>
            {hovered.count > 0 ? `${hovered.count} post` : "post yok"}
          </span>
        </div>
      )}
    </div>
  );
}

function InstagramHistoryTab() {
  const [days, setDays] = useState(30);
  const [history, setHistory] = useState<Snapshot[]>([]);
  const [latest, setLatest] = useState<Snapshot[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeHandles, setActiveHandles] = useState<Set<string>>(
    () => new Set(competitors.map((c) => c.instagramHandle))
  );

  const toggleHandle = (h: string) =>
    setActiveHandles((prev) => {
      const next = new Set(prev);
      next.has(h) ? next.delete(h) : next.add(h);
      return next;
    });

  // Backfill form state
  const [showBackfill, setShowBackfill] = useState(false);
  const [bfHandle, setBfHandle] = useState(competitors[0]?.instagramHandle ?? "");
  const [bfFollowers, setBfFollowers] = useState("");
  const [bfDate, setBfDate] = useState("");
  const [bfSaving, setBfSaving] = useState(false);
  const [bfMsg, setBfMsg] = useState<string | null>(null);

  const load = useCallback(async (d: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/instagram-history?days=${d}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setHistory(data.history);
      setLatest(data.latest);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(days); }, [days, load]);

  // Build recharts data: [{date, fsbosphorus: 116000, ...}, ...]
  const chartData = (() => {
    const byDate = new Map<string, Record<string, unknown>>();
    history.forEach((s) => {
      if (!byDate.has(s.snap_date)) byDate.set(s.snap_date, { date: s.snap_date });
      byDate.get(s.snap_date)![s.username] = s.followers;
    });
    return Array.from(byDate.values()).sort((a, b) => String(a.date).localeCompare(String(b.date)));
  })();

  const allHandles = [...new Set(history.map((s) => s.username))];
  const handles = allHandles.filter((h) => activeHandles.has(h));

  // Normalized chart data: first appearance of each handle = 100 (base)
  const baseValues: Record<string, number> = {};
  chartData.forEach((row) => {
    allHandles.forEach((h) => {
      if (!(h in baseValues) && row[h] !== undefined) {
        baseValues[h] = row[h] as number;
      }
    });
  });
  const normalizedChartData = chartData.map((row) => {
    const out: Record<string, unknown> = { date: row.date };
    allHandles.forEach((h) => {
      if (row[h] !== undefined && baseValues[h]) {
        out[h] = parseFloat(((row[h] as number / baseValues[h]) * 100).toFixed(4));
        out[`${h}_abs`] = row[h];
      }
    });
    return out;
  });

  // Ranked latest
  const ranked = [...latest].sort((a, b) => b.followers - a.followers);
  const maxFollowers = Math.max(...ranked.map((s) => s.followers), 1);

  const saveBackfill = async () => {
    if (!bfHandle || !bfFollowers || !bfDate) return;
    setBfSaving(true);
    setBfMsg(null);
    try {
      const res = await fetch("/api/instagram-history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: bfHandle,
          fullName: competitors.find((c) => c.instagramHandle === bfHandle)?.name ?? bfHandle,
          followers: parseInt(bfFollowers),
          date: bfDate,
        }),
      });
      const d = await res.json();
      if (d.error) throw new Error(d.error);
      setBfMsg("Kaydedildi ✓");
      load(days);
    } catch (e) {
      setBfMsg(`Hata: ${e}`);
    } finally {
      setBfSaving(false);
    }
  };

  return (
    <div className="space-y-5">

      {/* Header row */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="font-semibold text-white/90">Takipçi Geçmişi</h3>
          <p className="text-xs text-zinc-500">Her gece 00:00&apos;da otomatik çekilir</p>
        </div>
        <div className="flex items-center gap-2">
          {[30, 60, 90].map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-all ${
                days === d
                  ? "text-black font-semibold"
                  : "glass glass-hover text-zinc-400"
              }`}
              style={days === d ? { background: "linear-gradient(135deg,#c9a84c,#e8c660)" } : {}}
            >
              {d} gün
            </button>
          ))}
          <button
            onClick={() => setShowBackfill(!showBackfill)}
            className={`text-xs px-3 py-1.5 rounded-lg transition-all ${showBackfill ? "text-amber-300 bg-amber-500/20 border border-amber-500/40" : "glass glass-hover text-zinc-400"}`}
          >
            Geçmiş Ekle
          </button>
        </div>
      </div>

      {/* Account filter pills */}
      <div className="flex flex-wrap gap-2">
        {competitors.map((c) => {
          const active = activeHandles.has(c.instagramHandle);
          const color = HANDLE_COLOR[c.instagramHandle] ?? "#6b7280";
          return (
            <button
              key={c.instagramHandle}
              onClick={() => toggleHandle(c.instagramHandle)}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full transition-all duration-150"
              style={{
                background: active ? color + "22" : "rgba(255,255,255,0.04)",
                color: active ? color : "#71717a",
                border: `1px solid ${active ? color + "55" : "rgba(255,255,255,0.08)"}`,
                fontWeight: active ? 600 : 400,
              }}
            >
              <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: active ? color : "#3f3f46" }} />
              {c.shortName}
              {c.isSelf && <span className="text-[10px] opacity-60 ml-0.5">sen</span>}
            </button>
          );
        })}
      </div>

      {/* Backfill form */}
      {showBackfill && (
        <div className="glass rounded-2xl p-4 space-y-3" style={{ border: "1px solid rgba(201,168,76,0.25)" }}>
          <p className="text-xs text-zinc-400 font-medium">Geçmişe dönük veri ekle</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <select
              value={bfHandle}
              onChange={(e) => setBfHandle(e.target.value)}
              className="bg-transparent border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-amber-500/50"
            >
              {competitors.map((c) => (
                <option key={c.instagramHandle} value={c.instagramHandle} className="bg-zinc-900">
                  {c.shortName} (@{c.instagramHandle})
                </option>
              ))}
            </select>
            <input
              type="number"
              placeholder="Takipçi sayısı"
              value={bfFollowers}
              onChange={(e) => setBfFollowers(e.target.value)}
              className="bg-transparent border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-amber-500/50"
            />
            <input
              type="date"
              value={bfDate}
              onChange={(e) => setBfDate(e.target.value)}
              className="bg-transparent border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-amber-500/50"
            />
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={saveBackfill}
              disabled={bfSaving}
              className="text-xs px-4 py-2 rounded-lg font-semibold disabled:opacity-50 text-black"
              style={{ background: "linear-gradient(135deg,#c9a84c,#e8c660)" }}
            >
              {bfSaving ? "Kaydediliyor..." : "Kaydet"}
            </button>
            {bfMsg && <span className="text-xs text-zinc-400">{bfMsg}</span>}
          </div>
        </div>
      )}

      {loading && (
        <div className="flex items-center gap-3 py-10 justify-center">
          <div className="w-5 h-5 border-2 border-amber-500/30 border-t-amber-400 rounded-full animate-spin" />
          <p className="text-sm text-zinc-400">Yükleniyor...</p>
        </div>
      )}

      {error && <p className="text-xs text-red-400 py-4 text-center">{error}</p>}

      {!loading && !error && history.length === 0 && (
        <div className="glass rounded-2xl p-8 text-center" style={{ border: "1px solid rgba(255,255,255,0.06)" }}>
          <p className="text-zinc-400 text-sm mb-1">Henüz veri yok.</p>
          <p className="text-zinc-600 text-xs">İlk snapshot bu gece 00:00&apos;da otomatik çekilecek. Ya da "Geçmiş Ekle" ile manuel girebilirsin.</p>
        </div>
      )}

      {!loading && chartData.length > 0 && (
        <>
          {/* Line chart */}
          <div className="glass rounded-2xl p-5" style={{ border: "1px solid rgba(255,255,255,0.07)" }}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-xs text-zinc-500 uppercase tracking-wider">Büyüme Performansı</p>
                <p className="text-[10px] text-zinc-600 mt-0.5">İlk gün = 100 baz · değer arttıkça büyüme hızlanıyor</p>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={normalizedChartData} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
                <XAxis
                  dataKey="date"
                  tickFormatter={(v: string) => v.slice(5)}
                  tick={{ fill: "#71717a", fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  domain={["auto", "auto"]}
                  tickFormatter={(v: number) => `${(v - 100) >= 0 ? "+" : ""}${(v - 100).toFixed(2)}%`}
                  tick={{ fill: "#71717a", fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  width={52}
                />
                <Tooltip
                  contentStyle={{ background: "#0c0c14", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, fontSize: 12 }}
                  labelStyle={{ color: "#a1a1aa", marginBottom: 4 }}
                  formatter={(value: unknown, name: unknown) => {
                    const h = String(name);
                    if (h.endsWith("_abs")) return [null, null];
                    const idx = Number(value);
                    const base = baseValues[h];
                    if (!base) return [idx.toFixed(2), shortLabel(h)];
                    const abs = Math.round(base * idx / 100);
                    const diff = abs - base;
                    const pctStr = `${(idx - 100) >= 0 ? "+" : ""}${(idx - 100).toFixed(2)}%`;
                    const diffStr = `${diff >= 0 ? "+" : ""}${diff.toLocaleString("tr-TR")} takipçi`;
                    return [`${abs.toLocaleString("tr-TR")} · ${pctStr} · ${diffStr}`, shortLabel(h)];
                  }}
                />
                <Legend
                  formatter={(value: string) => {
                    if (value.endsWith("_abs")) return null;
                    return <span style={{ color: "#a1a1aa", fontSize: 11 }}>{shortLabel(value)}</span>;
                  }}
                />
                {handles.map((h) => (
                  <Line
                    key={h}
                    type="monotone"
                    dataKey={h}
                    stroke={HANDLE_COLOR[h] ?? "#6b7280"}
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4 }}
                    connectNulls
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Ranked leaderboard */}
          <div className="glass rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.07)" }}>
            <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
              <p className="text-xs text-zinc-500 uppercase tracking-wider font-semibold">Takipçi Sıralaması</p>
              <p className="text-[10px] text-zinc-600">Son snapshot · gün değişimi</p>
            </div>
            <div className="p-3 space-y-2">
              {ranked.filter((s) => activeHandles.has(s.username)).map((s, i) => {
                const prev = history
                  .filter((h) => h.username === s.username)
                  .sort((a, b) => String(a.snap_date).localeCompare(String(b.snap_date)));
                const prevFollowers = prev.length >= 2 ? prev[prev.length - 2].followers : null;
                const diff = prevFollowers !== null ? s.followers - prevFollowers : null;
                const color = HANDLE_COLOR[s.username] ?? "#6b7280";
                const isSelf = competitors.find((c) => c.instagramHandle === s.username)?.isSelf;
                const pct = Math.round((s.followers / maxFollowers) * 100);
                const medalColor = i === 0 ? "#FFD700" : i === 1 ? "#C0C0C0" : i === 2 ? "#CD7F32" : "#3f3f46";
                const fmtFollowers = s.followers >= 1000
                  ? `${(s.followers / 1000).toFixed(1)}K`
                  : s.followers.toLocaleString("tr-TR");
                return (
                  <div key={s.username}
                    className="rounded-xl px-4 py-3 transition-all duration-150"
                    style={{
                      background: isSelf ? "rgba(201,168,76,0.07)" : "rgba(255,255,255,0.025)",
                      border: `1px solid ${isSelf ? "rgba(201,168,76,0.22)" : "rgba(255,255,255,0.05)"}`,
                    }}>
                    <div className="flex items-center gap-3">
                      {/* Rank badge */}
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-sm font-bold"
                        style={{ background: `${medalColor}20`, color: medalColor }}>
                        {i + 1}
                      </div>
                      {/* Name + bar */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <span className="text-sm font-semibold text-white/90 truncate">{shortLabel(s.username)}</span>
                          {isSelf && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold flex-shrink-0"
                              style={{ background: "rgba(201,168,76,0.25)", color: "#c9a84c" }}>BİZ</span>
                          )}
                        </div>
                        <div className="w-full rounded-full h-1.5" style={{ background: "rgba(255,255,255,0.07)" }}>
                          <div className="h-1.5 rounded-full transition-all duration-700"
                            style={{ width: `${pct}%`, background: color }} />
                        </div>
                      </div>
                      {/* Stats */}
                      <div className="text-right flex-shrink-0 min-w-[64px]">
                        <p className="text-base font-bold tabular-nums leading-none" style={{ color }}>
                          {fmtFollowers}
                        </p>
                        {diff !== null && (
                          <p className={`text-xs tabular-nums mt-1 font-medium ${diff > 0 ? "text-emerald-400" : diff < 0 ? "text-red-400" : "text-zinc-600"}`}>
                            {diff > 0 ? "↑" : diff < 0 ? "↓" : "—"}{diff !== 0 ? ` ${Math.abs(diff).toLocaleString("tr-TR")}` : ""}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default function Page() {
  const [tab, setTab] = useState<Tab>("gaps");
  const [trendAlerts, setTrendAlerts] = useState<TrackedTrend[]>([]);
  const [alertsDismissed, setAlertsDismissed] = useState(false);

  const now = new Date();
  const dateStr = now.toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" });
  const criticalCount = gaps.filter((g) => g.urgency === "critical").length;

  useEffect(() => {
    fetch("/api/trend-radar")
      .then((r) => r.ok ? r.json() : Promise.reject())
      .then((d: { alerts: TrackedTrend[] }) => setTrendAlerts(d.alerts ?? []))
      .catch(() => {/* silent */});
  }, []);

  return (
    <div className="min-h-screen" style={{ background: "radial-gradient(ellipse at top, #0f0f1a 0%, #08080f 60%)" }}>
      {/* Header */}
      <header className="border-b sticky top-0 z-40"
        style={{ background: "rgba(8,8,15,0.85)", backdropFilter: "blur(20px)", borderColor: "rgba(255,255,255,0.06)" }}>
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-black font-black text-xs"
              style={{ background: "linear-gradient(135deg, #c9a84c, #f0d080)" }}>
              GF
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-white text-sm tracking-wide">GAP FINDER</h1>
                <span className="text-xs px-1.5 py-0.5 rounded text-zinc-400" style={{ background: "rgba(255,255,255,0.08)" }}>by Swissotel</span>
              </div>
              <p className="text-xs text-zinc-500">Marketing Intelligence Platform</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {criticalCount > 0 && (
              <div className="flex items-center gap-1.5 text-xs text-red-400 px-3 py-1.5 rounded-lg"
                style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)" }}>
                <span className="w-1.5 h-1.5 rounded-full bg-red-400 live-dot" />
                {criticalCount} kritik boşluk
              </div>
            )}
            <div className="flex items-center gap-1.5 text-xs text-zinc-500">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 live-dot" />
              <span className="hidden sm:block">{dateStr}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main */}
      <div className="max-w-4xl mx-auto px-4 pt-8 pb-16">
        {/* Hero */}
        <div className="mb-6">
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">
            Bu haftanın{" "}
            <span style={{ background: "linear-gradient(135deg, #c9a84c, #f0d080)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              açık pencereleri
            </span>
          </h2>
          <p className="text-zinc-400 text-sm">
            {gaps.length} fırsat tespit edildi · {competitors.length} rakip monitörleniyor · Gerçek zamanlı veri
          </p>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { label: "Kritik Fırsat", value: gaps.filter(g => g.urgency === "critical").length, color: "#ef4444", sub: "rakip yok" },
            { label: "Ort. Fırsat Skoru", value: Math.round(gaps.reduce((a, g) => a + g.opportunityScore, 0) / gaps.length), color: "#c9a84c", sub: "/ 100" },
            { label: "Rakip Kapsam", value: `%${Math.round(gaps.reduce((a, g) => a + g.competitorCoverage, 0) / gaps.length)}`, color: "#22c55e", sub: "ortalama" },
          ].map((c) => (
            <div key={c.label} className="glass rounded-xl p-4 text-center">
              <p className="text-2xl font-bold" style={{ color: c.color }}>{c.value}</p>
              <p className="text-xs text-zinc-400 mt-0.5">{c.label}</p>
              <p className="text-xs text-zinc-600">{c.sub}</p>
            </div>
          ))}
        </div>

        {/* Trend Alert Banner */}
        {!alertsDismissed && trendAlerts.length > 0 && (
          <div className="glass rounded-xl p-4 mb-5 flex items-start gap-3 border border-orange-500/30"
            style={{ background: "rgba(120,53,15,0.3)" }}>
            <span className="text-orange-400 text-lg flex-shrink-0">⚡</span>
            <div className="flex-1 min-w-0">
              <p className="text-orange-300 font-semibold text-sm">Trend Alarmı — {trendAlerts.length} keyword yükselişte</p>
              <p className="text-orange-200/60 text-xs mt-0.5 truncate">
                {trendAlerts.map((a) => `${a.label} (${a.geo}): +${a.trend_pct}%`).join(" · ")}
              </p>
            </div>
            <button
              onClick={() => setAlertsDismissed(true)}
              className="flex-shrink-0 text-orange-400/50 hover:text-orange-300 transition-colors text-lg leading-none"
              aria-label="Kapat"
            >
              ✕
            </button>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 p-1 rounded-xl mb-6"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 text-xs font-medium py-2 px-2 rounded-lg transition-all duration-150 ${
                tab === t.id ? "text-black font-semibold" : "text-zinc-400 hover:text-zinc-200"
              }`}
              style={tab === t.id ? { background: "linear-gradient(135deg, #c9a84c, #e8c660)" } : {}}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        {tab === "gaps"      && <GapsTab />}
        {tab === "radar"     && <RadarTab />}
        {tab === "instagram" && <InstagramHistoryTab />}
        {tab === "content"   && (
          <ErrorBoundary>
            <ContentIntelligenceTab />
          </ErrorBoundary>
        )}
        {tab === "venues"    && <VenuesTab />}
        {tab === "demand"    && <DemandTab />}
        {tab === "reviews"      && <ReviewsTab />}
        {tab === "tripadvisor"  && <TripAdvisorTab />}
        {tab === "trends"       && <TrendRadarTab />}
      </div>

      {/* Footer */}
      <div className="fixed bottom-0 left-0 right-0 py-3 text-center text-xs text-zinc-600"
        style={{ background: "rgba(8,8,15,0.9)", backdropFilter: "blur(10px)", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
        Gap Finder · Swissotel The Bosphorus İstanbul · Powered by AI Intelligence
      </div>

    </div>
  );
}
