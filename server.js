// Basit backend — API key'i mobil app'ten gizli tutmak için gerekli.
// Çalıştırma: npm install && ANTHROPIC_API_KEY=sk-xxx node server.js

const express = require("express");
const cors = require("cors");
const app = express();

app.use(cors());
app.use(express.json({ limit: "10mb" })); // fotoğraf base64 için limit

// ---- KURAL SETİ: Buradan yönetin (app store onayı beklemeden değiştirebilirsiniz) ----
const OCCASION_RULES = {
  "Özel Gün": [
    "Beyaz, krem veya gelinlik tonlarına çok yakın kıyafet ciddi puan kaybettirir",
    "Şık kumaşlar (saten, ipek, keten karışımı) ödüllendirilir",
    "Aşırı rahat/günlük parçalar (t-shirt, spor ayakkabı) puan düşürür"
  ],
  "Günlük / Rahat": [
    "Konfor öncelikli, resmiyet beklenmez",
    "Renk ve parça uyumu yine de değerlendirilir"
  ],
  "Spor / Antrenman": [
    "Fonksiyonel spor kıyafeti beklenir",
    "Günlük kıyafetle spora gitmek puan kaybettirir"
  ],
  "Gece / Davet": [
    "İddialı, kendine güvenen parçalar ödüllendirilir",
    "Kombin bütünlüğü (üst-alt-aksesuar uyumu) önemlidir"
  ],
  "Ofis / Profesyonel": [
    "Aşırı rahat parçalar (eşofman altı, terlik, plaj tipi giysiler) uygun değil",
    "Şık-rahat (smart casual) dengesi aranır",
    "Marka logolu abartılı ya da aşırı gösterişli parçalar puan düşürebilir",
    "Düzenli, ütülü ve bakımlı bir görünüm ödüllendirilir"
  ],
  "Yaz Tatili": [
    "Hafif, nefes alan kumaşlar (keten, pamuk) ödüllendirilir",
    "Aşırı kalın veya kapalı parçalar ortama uygun değil",
    "Güneş/plaj/deniz kenarı için pratiklik önemli bir kriter",
    "Canlı renkler ve rahat kesimler bu ortamda olumlu değerlendirilir"
  ],
  "Kış Tatili": [
    "Katmanlı giyim (layering) ödüllendirilir",
    "Soğuğa karşı yetersiz kalan kıyafet puan kaybettirir",
    "Kayak/dağ ortamıysa fonksiyonel ve teknik kıyafet beklenir",
    "Şıklık ile sıcak tutma dengesi aranır"
  ],
  "Lüks / Fine Dining": [
    "Şık, iyi kesim ve kaliteli görünen parçalar ödüllendirilir",
    "Günlük veya spor kıyafetle (sneaker, şort, tişört) gitmek ciddi puan kaybettirir",
    "Aksesuar ve ayakkabı detaylarına özen gösterilmesi beklenir"
  ],
  "After Party": [
    "İddialı, dikkat çekici ve enerjik parçalar ödüllendirilir",
    "Fazla sade veya gündüz havası taşıyan kombinler bu ortam için düşük puan alır",
    "Işıltılı kumaş, metalik detay veya çarpıcı aksesuar artı puan kazandırır"
  ],
  "Randevu / Date": [
    "Kendine güvenen ama zorlama olmayan, doğal bir görünüm aranır",
    "Aşırı iddialı ile aşırı gündelik arasında bir denge ödüllendirilir",
    "Düzenli ve özenli görünen detaylar (temiz ayakkabı, uyumlu aksesuar) puan kazandırır"
  ],
  "Festival": [
    "Rahat, hareket özgürlüğü sağlayan parçalar ödüllendirilir",
    "Kişisel ve özgün stil unsurları (desen, katman, aksesuar) olumlu değerlendirilir",
    "Uzun saatler dışarıda geçirmeye uygun pratik kıyafet/ayakkabı artı puan"
  ],
  "İçerik Üretimi (Influencer)": [
    "Fotojenik, kamerada net ve etkili görünen renk/kesim tercih edilir",
    "Kombinin bütünlüğü ve çekim ortamıyla uyumu değerlendirilir",
    "Dikkat dağıtan aşırı karmaşık desen/aksesuar karışıklığı puan düşürebilir"
  ]
};

app.post("/analyze", async (req, res) => {
  try {
    const { imageBase64, imageMediaType, occasion, destination } = req.body;

    if (!imageBase64 || !occasion) {
      return res.status(400).json({ error: "imageBase64 ve occasion zorunlu" });
    }

    console.log(`Gelen görsel: mediaType=${imageMediaType}, uzunluk=${imageBase64.length}, baş=${imageBase64.slice(0, 20)}`);

    const rules = OCCASION_RULES[occasion] || [];
    const rulesText = rules.map((r, i) => `${i + 1}. ${r}`).join("\n");

    const systemPrompt = `Sen deneyimli bir moda editörü ve stil danışmanısın. Kullanıcının yüklediği kıyafet fotoğrafını, belirtilen ortam/etkinlik için değerlendireceksin.

Değerlendirmede İKİ kaynağı birleştir:
1) Aşağıdaki SABİT KURALLAR (öncelik ver, ihlal varsa mutlaka belirt):
${rulesText}

2) Genel moda ve stil bilginle kombinin bütünlüğünü, renk uyumunu, kesim/beden uygunluğunu ve ortama genel uygunluğunu değerlendir.

SADECE aşağıdaki JSON formatında yanıt ver, başka hiçbir metin ekleme:
{
  "score": <0 ile 10 arasında, virgüllü olabilir>,
  "verdict": "<3-5 kelimelik kısa başlık>",
  "summary": "<2-3 cümlelik genel değerlendirme>",
  "strengths": ["<güçlü yön 1>", "<güçlü yön 2>"],
  "improvements": ["<geliştirilecek nokta 1>", "<geliştirilecek nokta 2>"]
}`;

    const userText = destination
      ? `Bu kıyafetle "${occasion}" ortamına, özellikle şuraya gidiyorum: ${destination}. Değerlendirir misin?`
      : `Bu kıyafetle "${occasion}" ortamına gidiyorum. Değerlendirir misin?`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 1000,
        system: systemPrompt,
        messages: [
          {
            role: "user",
            content: [
              { type: "image", source: { type: "base64", media_type: imageMediaType || "image/jpeg", data: imageBase64 } },
              { type: "text", text: userText }
            ]
          }
        ]
      })
    });

    const data = await response.json();
    const textBlock = (data.content || []).find(b => b.type === "text");
    if (!textBlock) {
      console.error("Claude API beklenmeyen yanıt döndürdü:", JSON.stringify(data));
      throw new Error("Claude'dan geçerli yanıt alınamadı: " + (data.error?.message || JSON.stringify(data)));
    }

    const cleaned = textBlock.text.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(cleaned);

    res.json(parsed);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Analiz sırasında hata oluştu" });
  }
});

app.post("/compare", async (req, res) => {
  try {
    const { imageABase64, imageAMediaType, imageBBase64, imageBMediaType, occasion, destination } = req.body;

    if (!imageABase64 || !imageBBase64 || !occasion) {
      return res.status(400).json({ error: "imageABase64, imageBBase64 ve occasion zorunlu" });
    }

    console.log(`Karşılaştırma isteği: occasion=${occasion}, A uzunluk=${imageABase64.length}, B uzunluk=${imageBBase64.length}`);

    const rules = OCCASION_RULES[occasion] || [];
    const rulesText = rules.map((r, i) => `${i + 1}. ${r}`).join("\n");

    const systemPrompt = `Sen deneyimli bir moda editörü ve stil danışmanısın. Kullanıcı iki farklı kombin fotoğrafı (A ve B) yükledi ve bunları "${occasion}" ortamı için karşılaştırmanı istiyor.

Değerlendirmede İKİ kaynağı birleştir:
1) Aşağıdaki SABİT KURALLAR (öncelik ver, ihlal varsa mutlaka belirt):
${rulesText}

2) Genel moda ve stil bilginle her iki kombinin bütünlüğünü, renk uyumunu, kesim/beden uygunluğunu ve ortama genel uygunluğunu karşılaştır.

SADECE aşağıdaki JSON formatında yanıt ver, başka hiçbir metin ekleme:
{
  "winner": "A" | "B" | "eşit",
  "scoreA": <0 ile 10 arasında, virgüllü olabilir>,
  "scoreB": <0 ile 10 arasında, virgüllü olabilir>,
  "verdict": "<hangisinin neden öne çıktığını özetleyen kısa başlık>",
  "summary": "<2-3 cümlelik karşılaştırmalı değerlendirme>",
  "prosA": ["<A'nın güçlü yönü 1>", "<A'nın güçlü yönü 2>"],
  "consA": ["<A'nın zayıf yönü 1>"],
  "prosB": ["<B'nin güçlü yönü 1>", "<B'nin güçlü yönü 2>"],
  "consB": ["<B'nin zayıf yönü 1>"]
}`;

    const userText = destination
      ? `"${occasion}" ortamı için, özellikle şuraya gidiyorum: ${destination}. A ve B kombinlerini karşılaştırır mısın?`
      : `"${occasion}" ortamı için A ve B kombinlerini karşılaştırır mısın?`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 1200,
        system: systemPrompt,
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: "Kombin A:" },
              { type: "image", source: { type: "base64", media_type: imageAMediaType || "image/jpeg", data: imageABase64 } },
              { type: "text", text: "Kombin B:" },
              { type: "image", source: { type: "base64", media_type: imageBMediaType || "image/jpeg", data: imageBBase64 } },
              { type: "text", text: userText }
            ]
          }
        ]
      })
    });

    const data = await response.json();
    const textBlock = (data.content || []).find(b => b.type === "text");
    if (!textBlock) {
      console.error("Claude API beklenmeyen yanıt döndürdü:", JSON.stringify(data));
      throw new Error("Claude'dan geçerli yanıt alınamadı: " + (data.error?.message || JSON.stringify(data)));
    }

    const cleaned = textBlock.text.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(cleaned);

    res.json(parsed);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Karşılaştırma sırasında hata oluştu" });
  }
});

app.get("/occasions", (req, res) => {
  res.json(Object.keys(OCCASION_RULES));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Sunucu ${PORT} portunda çalışıyor`));
