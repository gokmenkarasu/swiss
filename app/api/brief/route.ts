import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { keyword, venue, targetAge, channel, insight } = await req.json();

  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    // Return a realistic mock brief when no API key
    return NextResponse.json({
      brief: generateMockBrief(keyword, venue, targetAge, channel),
    });
  }

  try {
    const Anthropic = (await import("@anthropic-ai/sdk")).default;
    const client = new Anthropic({ apiKey });

    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: `Sen Swissotel The Bosphorus İstanbul için kıdemli bir dijital pazarlama stratejisti ve reklam metni uzmanısın.

Aşağıdaki boşluk fırsatı için kısa, güçlü bir kampanya brief'i oluştur:

KEYWORD BOŞLUĞU: "${keyword}"
SWISSOTEL MEKAN: ${venue}
HEDEF YAŞ KİTLESİ: ${targetAge}
ÖNERİLEN KANAL: ${channel}
ARKA PLAN: ${insight}

Brief şunları içermeli:
1. **Kampanya Başlığı** (Türkçe + İngilizce)
2. **Ana Mesaj** (1-2 cümle, doğrudan, lüks tona uygun)
3. **Hedef Kitle** (demografik + psikografik, 2-3 satır)
4. **İçerik Formatı** (kanal bazlı, spesifik)
5. **CTA Önerisi** (güçlü, aksiyona yönlendiren)
6. **Tahmini Süre** (kampanya ne kadar sürmeli)

Tok, özgüvenli bir dil kullan. Klişelerden kaçın. Lüks marka sesine uygun ama erişilebilir ol. Türkçe yaz.`,
        },
      ],
    });

    const text = message.content[0].type === "text" ? message.content[0].text : "";
    return NextResponse.json({ brief: text });
  } catch (err) {
    console.error("Claude API error:", err);
    return NextResponse.json({
      brief: generateMockBrief(keyword, venue, targetAge, channel),
    });
  }
}

function generateMockBrief(keyword: string, venue: string, targetAge: string, channel: string): string {
  const venueDescriptions: Record<string, string> = {
    "16 Roof": "İstanbul'un en yüksek rooftop bar deneyimi",
    "Sabrosa": "Boğaz manzaralı dünya mutfağı brunch ve yemek deneyimi",
    "Madhu's": "Londra'nın ödüllü Indian fine dining deneyimi İstanbul'da",
    "Chalet Garden": "Şehir merkezinde doğayla iç içe açık hava gastronomi ve etkinlik mekanı",
    "Lure": "Swissotel'in usta şeflerinden çıkan premium çikolata ve pastane deneyimi",
    "Pürovel": "Boğaz manzaralı premium wellness ve fitness kulübü",
    "Chalet": "İsviçre dağ evi atmosferinde fondü ve kış gastronomisi",
  };

  return `**Kampanya Başlığı**
TR: "İstanbul'un Üstünde Bir Gece" / EN: "Above Istanbul"

**Ana Mesaj**
${venueDescriptions[venue] ?? venue}. "${keyword}" arayan misafirleriniz sizi arıyor — siz henüz onlara cevap vermiyorsunuz.

**Hedef Kitle**
${targetAge} yaş, üst gelir grubu. Şehrin nabzını tutan, deneyimi fiyatın önünde değerlendiren, sosyal medyada aktif. Yurt içi ve Avrupa kaynaklı ziyaretçiler. Yemek ve atmosferi birlikte arıyor; sadece yemek değil, bir akşam satın alıyor.

**İçerik Formatı — ${channel}**
• Video (15–30 sn): Altın saat ışığında mekan, cocktail hazırlığı, Boğaz panoraması
• Story formatı: "Bu hafta sonu rezervasyon" CTA ile
• Carousel (eğer Meta): 3 kare — atmosfer → menü highlight → rezervasyon CTA

**CTA Önerisi**
"Bu haftaya yerin var." → Direkt rezervasyon linkleme
İkincil: WhatsApp ile anlık rezervasyon seçeneği

**Tahmini Süre**
7–10 gün. Bu bir sezonluk kampanya değil, açık pencere kampanyası. Rakipler fark etmeden önce bitir.`;
}
