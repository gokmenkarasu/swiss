export type GapOpportunity = {
  id: string;
  keyword: string;
  searchVolume: number; // weekly searches
  volumeTrend: number; // % change vs last week
  competitorCoverage: number; // 0-100, how much competitors cover this
  opportunityScore: number; // 0-100
  venue: string;
  venueColor: string;
  targetAge: string;
  channel: string;
  insight: string;
  urgency: "critical" | "high" | "medium";
};

export type Competitor = {
  name: string;
  shortName: string;
  instagramHandle: string;
  activeAds: CompetitorAd[];
  topKeywords: string[];
  instagramEngagement: number;
  adSpendEstimate: string;
  weakness: string;
};

export type CompetitorAd = {
  platform: "Meta" | "Google" | "Instagram";
  headline: string;
  format: string;
  since: string;
};

export type VenueScore = {
  name: string;
  shortName: string;
  score: number;
  trend: "up" | "down" | "flat";
  trendValue: number;
  targetAge: string;
  topChannel: string;
  color: string;
  weeklyVisitors: number;
  topOpportunity: string;
};

export type DemandSignal = {
  type: "event" | "trend" | "flight" | "weather";
  title: string;
  date: string;
  impact: "high" | "medium" | "low";
  venues: string[];
  description: string;
};

// ─── GAPS ──────────────────────────────────────────────────────────────────

export const gaps: GapOpportunity[] = [
  {
    id: "g1",
    keyword: "rooftop bar bosphorus view istanbul",
    searchVolume: 4200,
    volumeTrend: +34,
    competitorCoverage: 8,
    opportunityScore: 94,
    venue: "16 Roof",
    venueColor: "#8b5cf6",
    targetAge: "25–38",
    channel: "Instagram Stories + Reels",
    insight:
      "Conrad ve Grand Hyatt bu keyword'e bütçe ayırmıyor. Four Seasons historic Peninsula'yı öne çıkarıyor, Boğaz tarafını görmezden geliyor. Bu hafta sonu 3 Avrupa seferinden yolcu piki bekleniyor.",
    urgency: "critical",
  },
  {
    id: "g2",
    keyword: "easter brunch istanbul 2026",
    searchVolume: 2800,
    volumeTrend: +112,
    competitorCoverage: 15,
    opportunityScore: 89,
    venue: "Sabrosa",
    venueColor: "#f59e0b",
    targetAge: "30–50",
    channel: "Google Search + Meta",
    insight:
      "Paskalya 5 Nisan 2026. Hiçbir rakip özel Paskalya brunch kampanyası yürütmüyor. 'Easter brunch istanbul' aramaları son 7 günde %112 arttı. Sabrosa'nın uluslararası mutfak profili mükemmel örtüşüyor.",
    urgency: "critical",
  },
  {
    id: "g3",
    keyword: "indian restaurant istanbul dancing show",
    searchVolume: 1100,
    volumeTrend: +28,
    competitorCoverage: 4,
    opportunityScore: 85,
    venue: "Madhu's",
    venueColor: "#ef4444",
    targetAge: "38–55",
    channel: "Google Maps + Instagram",
    insight:
      "Rakipler Indian cuisine kategorisini tamamen boş bırakmış. Madhu's'un Cuma/Cumartesi dans şovları unique differentiator — kimse bunu reklamda kullanmıyor. Yüksek bilet ortalama harcama potansiyeli.",
    urgency: "high",
  },
  {
    id: "g4",
    keyword: "outdoor spring dinner istanbul garden",
    searchVolume: 3100,
    volumeTrend: +67,
    competitorCoverage: 22,
    opportunityScore: 81,
    venue: "Chalet Garden",
    venueColor: "#22c55e",
    targetAge: "25–42",
    channel: "Instagram Reels + TikTok",
    insight:
      "İlkbahar başladı, outdoor dining aramaları patlıyor. Rixos açık alan reklamı vermiyor, Conrad'ın outdoor mekanı yok. Chalet Garden'ın caz geceleri ve festival takvimi içerik materyali olarak güçlü.",
    urgency: "high",
  },
  {
    id: "g5",
    keyword: "luxury chocolate gift istanbul",
    searchVolume: 870,
    volumeTrend: +19,
    competitorCoverage: 0,
    opportunityScore: 77,
    venue: "Lure",
    venueColor: "#d97706",
    targetAge: "28–55",
    channel: "Instagram + Google Shopping",
    insight:
      "Sıfır rakip aktivitesi bu kategoride. Lure'un premium konumu ve hotel güvencesi corporate hediye segmenti için ideal. Anneler Günü (11 Mayıs) öncesi kurumsal alıcıları hedeflemek için pencere açık.",
    urgency: "medium",
  },
  {
    id: "g6",
    keyword: "spa day istanbul bosphorus",
    searchVolume: 1900,
    volumeTrend: +22,
    competitorCoverage: 31,
    opportunityScore: 71,
    venue: "Pürovel",
    venueColor: "#06b6d4",
    targetAge: "30–50",
    channel: "Google + Meta",
    insight:
      "Mandarin Spa güçlü ama fiyat açısından daha erişilemez. Pürovel'in Urban Fit entegrasyonu ve tenis kortu 'active wellness' nişini açıyor — kimse bu kombinasyonu satmıyor.",
    urgency: "medium",
  },
];

// ─── COMPETITORS ────────────────────────────────────────────────────────────

export const competitors: Competitor[] = [
  {
    name: "Conrad İstanbul Bosphorus",
    shortName: "Conrad",
    instagramHandle: "conradistanbulbosphorus",
    activeAds: [
      { platform: "Google", headline: "Conrad Istanbul — Official Site | Book Direct & Save", format: "Search", since: "3 gün önce" },
      { platform: "Meta", headline: "Executive Floor Spring Package — 15% off", format: "Single Image", since: "5 gün önce" },
    ],
    topKeywords: ["5 star hotel istanbul", "bosphorus hotel", "istanbul business hotel"],
    instagramEngagement: 2.1,
    adSpendEstimate: "₺180K–240K/ay",
    weakness: "Gastronomi ve mekan aktivasyonuna bütçe ayırmıyor. Sadece konaklama odaklı.",
  },
  {
    name: "Grand Hyatt İstanbul",
    shortName: "Grand Hyatt",
    instagramHandle: "grandhyattistanbul",
    activeAds: [
      { platform: "Google", headline: "Grand Hyatt Istanbul | Luxury in the City Center", format: "Search", since: "1 gün önce" },
      { platform: "Instagram", headline: "Summer Preview — Rooftop Terrace Opening Soon", format: "Reel", since: "2 gün önce" },
    ],
    topKeywords: ["grand hyatt istanbul", "luxury hotel taksim", "istanbul rooftop hotel"],
    instagramEngagement: 3.4,
    adSpendEstimate: "₺220K–300K/ay",
    weakness: "Rooftop açılışını duyuruyor ama henüz aktif değil. Bu pencerede 16 Roof için kritik fırsat.",
  },
  {
    name: "Mandarin Oriental",
    shortName: "Mandarin",
    instagramHandle: "mo_istanbul",
    activeAds: [
      { platform: "Google", headline: "Mandarin Oriental Istanbul | Bosphorus Luxury", format: "Search", since: "6 gün önce" },
      { platform: "Meta", headline: "The Mandarin Spa — Urban Retreat in Istanbul", format: "Carousel", since: "4 gün önce" },
    ],
    topKeywords: ["mandarin oriental istanbul", "luxury spa istanbul", "fine dining bosphorus"],
    instagramEngagement: 4.1,
    adSpendEstimate: "₺280K–350K/ay",
    weakness: "Sadece konaklama + spa kombinasyonunu vuruyor. Gastronomi ve etkinlik boşluğu var.",
  },
  {
    name: "Four Seasons Bosphorus",
    shortName: "Four Seasons",
    instagramHandle: "fsbosphorus",
    activeAds: [
      { platform: "Google", headline: "Four Seasons Istanbul | Historic Palace Hotel", format: "Search", since: "2 gün önce" },
      { platform: "Instagram", headline: "Spring Awakening — Garden Dining Returns", format: "Single Image", since: "7 gün önce" },
    ],
    topKeywords: ["four seasons istanbul", "palace hotel istanbul", "historic bosphorus hotel"],
    instagramEngagement: 5.2,
    adSpendEstimate: "₺320K–420K/ay",
    weakness: "Heritage konumunu öne çıkarıyor, modern eğlence ve nightlife mesajı yok. 16 Roof ile doğrudan çakışmıyor.",
  },
  {
    name: "Rixos Tersane İstanbul",
    shortName: "Rixos",
    instagramHandle: "rixostersaneistanbul",
    activeAds: [
      { platform: "Instagram", headline: "Tersane İstanbul — Where History Meets Luxury", format: "Reel", since: "1 gün önce" },
      { platform: "Meta", headline: "Rixos Tersane — All-Inclusive Luxury Experience", format: "Single Image", since: "3 gün önce" },
    ],
    topKeywords: ["rixos tersane istanbul", "boutique luxury istanbul", "tersane istanbul hotel"],
    instagramEngagement: 6.8,
    adSpendEstimate: "₺200K–280K/ay",
    weakness: "Çok yeni — marka bilinirliği inşası aşamasında. Gastronomi aktivasyonu yok. Instagram'da agresif ama dönüşüm odaklı değil.",
  },
  {
    name: "Ritz-Carlton İstanbul",
    shortName: "Ritz-Carlton",
    instagramHandle: "ritzcarltonistanbul",
    activeAds: [
      { platform: "Google", headline: "The Ritz-Carlton İstanbul | Luxury on the Bosphorus", format: "Search", since: "4 gün önce" },
      { platform: "Meta", headline: "Harbor Views — Spring Dining Experience", format: "Carousel", since: "8 gün önce" },
    ],
    topKeywords: ["ritz carlton istanbul", "luxury hotel sisli", "istanbul 5 star"],
    instagramEngagement: 3.7,
    adSpendEstimate: "₺250K–320K/ay",
    weakness: "Sisli lokasyonu Boğaz'dan uzak — bu zayıflık Swissotel'in açık havuz, bahçe, doğrudan Boğaz görüşüyle exploit edilebilir.",
  },
  {
    name: "Hilton İstanbul Bosphorus",
    shortName: "Hilton",
    instagramHandle: "hiltonistanbulbosphorus",
    activeAds: [
      { platform: "Google", headline: "Hilton Istanbul Bosphorus | Official Site", format: "Search", since: "2 gün önce" },
      { platform: "Meta", headline: "Spring Staycation — Bosphorus Views & More", format: "Single Image", since: "5 gün önce" },
    ],
    topKeywords: ["hilton istanbul bosphorus", "bosphorus view hotel", "istanbul luxury hotel"],
    instagramEngagement: 2.8,
    adSpendEstimate: "₺160K–220K/ay",
    weakness: "Genel Hilton brand mesajı ağırlıklı — lokal İstanbul deneyimi ve gastronomi aktivasyonu zayıf.",
  },
];

// ─── VENUE SCORES ────────────────────────────────────────────────────────────

export const venueScores: VenueScore[] = [
  {
    name: "16 Roof",
    shortName: "16R",
    score: 94,
    trend: "up",
    trendValue: 11,
    targetAge: "25–38",
    topChannel: "Instagram",
    color: "#8b5cf6",
    weeklyVisitors: 800,
    topOpportunity: "Rooftop keyword boşluğu kritik seviyede",
  },
  {
    name: "Sabrosa",
    shortName: "SAB",
    score: 89,
    trend: "up",
    trendValue: 22,
    targetAge: "30–50",
    topChannel: "Google + Meta",
    color: "#f59e0b",
    weeklyVisitors: 1200,
    topOpportunity: "Paskalya brunch fırsatı, 5 Nisan",
  },
  {
    name: "Madhu's",
    shortName: "MAD",
    score: 85,
    trend: "up",
    trendValue: 8,
    targetAge: "38–55",
    topChannel: "Google Maps",
    color: "#ef4444",
    weeklyVisitors: 150,
    topOpportunity: "Indian dining + dance show — sıfır rekabet",
  },
  {
    name: "Chalet Garden",
    shortName: "CG",
    score: 81,
    trend: "up",
    trendValue: 31,
    targetAge: "25–42",
    topChannel: "Instagram Reels",
    color: "#22c55e",
    weeklyVisitors: 600,
    topOpportunity: "İlkbahar outdoor dining sezonu açıldı",
  },
  {
    name: "Pürovel",
    shortName: "PÜR",
    score: 71,
    trend: "flat",
    trendValue: 2,
    targetAge: "30–50",
    topChannel: "Google",
    color: "#06b6d4",
    weeklyVisitors: 450,
    topOpportunity: "Active wellness nişi — kimse satmıyor",
  },
  {
    name: "Lure",
    shortName: "LUR",
    score: 77,
    trend: "up",
    trendValue: 5,
    targetAge: "28–55",
    topChannel: "Instagram",
    color: "#d97706",
    weeklyVisitors: 280,
    topOpportunity: "Kurumsal hediye segmenti, Anneler Günü öncesi",
  },
  {
    name: "Chalet",
    shortName: "CHA",
    score: 42,
    trend: "down",
    trendValue: -18,
    targetAge: "30–45",
    topChannel: "Meta",
    color: "#6b7280",
    weeklyVisitors: 180,
    topOpportunity: "Sezon dışı — ilkbaharda düşük öncelik",
  },
];

// ─── DEMAND SIGNALS ──────────────────────────────────────────────────────────

export const demandSignals: DemandSignal[] = [
  {
    type: "event",
    title: "Paskalya Hafta Sonu",
    date: "4–6 Nisan 2026",
    impact: "high",
    venues: ["Sabrosa", "16 Roof", "Chalet Garden"],
    description: "Avrupa kaynaklı turist girişi piki. Özellikle Almanya, İngiltere, Hollanda uçuşlarında doluluk artışı bekleniyor.",
  },
  {
    type: "flight",
    title: "IST Uçuş Piki — 3 Avrupa Hattı",
    date: "Bu hafta sonu",
    impact: "high",
    venues: ["16 Roof", "Sabrosa", "Madhu's"],
    description: "Lufthansa FRA-IST, British Airways LHR-IST, KLM AMS-IST hatlarında kapasite artışı. Tahmini ek giriş: 4.200 yolcu.",
  },
  {
    type: "trend",
    title: "Outdoor Dining Aramaları +67%",
    date: "Son 7 gün",
    impact: "high",
    venues: ["Chalet Garden", "Sabrosa"],
    description: "Google Trends: 'outdoor restaurant istanbul', 'garden dining istanbul', 'spring dinner istanbul' aramalarında sert yükseliş.",
  },
  {
    type: "event",
    title: "İstanbul Müzik Festivali",
    date: "12–20 Nisan 2026",
    impact: "medium",
    venues: ["Chalet Garden", "16 Roof"],
    description: "Şehirde kültür turizmi yoğunlaşacak. Uluslararası sanatçı kitlesi otel + fine dining talebini artırıyor.",
  },
  {
    type: "trend",
    title: "Anneler Günü Aramaları Başladı",
    date: "11 Mayıs 2026",
    impact: "medium",
    venues: ["Lure", "Sabrosa", "Madhu's"],
    description: "'Mother's day istanbul gift', 'anneler günü özel menü' aramaları başladı. 6 hafta kalan süre aksiyon penceresi.",
  },
  {
    type: "weather",
    title: "İlk Bahar Günleri — 18°C+",
    date: "Bu hafta",
    impact: "medium",
    venues: ["Chalet Garden", "Pürovel"],
    description: "Hafta sonu hava güzel. Outdoor mekan ve açık havuz aktivasyonu için ideal koşullar.",
  },
];
