"use client";

import { useState } from "react";
import { gaps, competitors, venueScores, demandSignals } from "@/lib/data";
import type { GapOpportunity } from "@/lib/data";

type Tab = "gaps" | "radar" | "venues" | "demand";

const TABS: { id: Tab; label: string }[] = [
  { id: "gaps", label: "Fırsat Boşlukları" },
  { id: "radar", label: "Rakip Radar" },
  { id: "venues", label: "Mekan Pulse" },
  { id: "demand", label: "İstanbul Sinyalleri" },
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

function GapCard({ gap }: { gap: GapOpportunity }) {
  const urg = urgencyConfig[gap.urgency];
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
          <div className="flex items-center gap-3 text-xs text-zinc-400 mb-3">
            <span>{gap.searchVolume.toLocaleString()} arama/hafta</span>
            <span className="text-green-400 font-medium">↑ %{gap.volumeTrend} trend</span>
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


function GapsTab() {
  const criticalCount = gaps.filter((g) => g.urgency === "critical").length;
  const avgCoverage = Math.round(gaps.filter((g) => g.urgency === "critical").reduce((a, g) => a + g.competitorCoverage, 0) / criticalCount);
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
        {gaps.map((g) => <GapCard key={g.id} gap={g} />)}
      </div>
    </div>
  );
}

function RadarTab() {
  const [expanded, setExpanded] = useState<string | null>(null);
  return (
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

export default function Page() {
  const [tab, setTab] = useState<Tab>("gaps");

  const now = new Date();
  const dateStr = now.toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" });
  const criticalCount = gaps.filter((g) => g.urgency === "critical").length;

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
        {tab === "gaps"   && <GapsTab />}
        {tab === "radar"  && <RadarTab />}
        {tab === "venues" && <VenuesTab />}
        {tab === "demand" && <DemandTab />}
      </div>

      {/* Footer */}
      <div className="fixed bottom-0 left-0 right-0 py-3 text-center text-xs text-zinc-600"
        style={{ background: "rgba(8,8,15,0.9)", backdropFilter: "blur(10px)", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
        Gap Finder · Swissotel The Bosphorus İstanbul · Powered by AI Intelligence
      </div>

    </div>
  );
}
