// Basit backend — API key'i mobil app'ten gizli tutmak için gerekli.
// Çalıştırma: npm install && ANTHROPIC_API_KEY=sk-xxx node server.js

const express = require("express");
const cors = require("cors");
const app = express();

app.use(cors());
app.use(express.json({ limit: "10mb" })); // fotoğraf base64 için limit

// ---- KURAL SETİ: Buradan yönetin (app store onayı beklemeden değiştirebilirsiniz) ----
const OCCASION_RULES = {
  "İş Görüşmesi": [
    "Spor ayakkabı veya spor terliği kabul edilmez, puan düşürür",
    "Renk paleti sade ve nötr olmalı (lacivert, gri, siyah, bej tercih edilir)",
    "Yırtık veya çok yıpratılmış kot puan kaybettirir",
    "Blazer, ceket veya yapılandırılmış parçalar ekstra puan kazandırır",
    "Aşırı gösterişli aksesuar veya parlak desenler puan düşürür"
  ],
  "Düğün (Davetli)": [
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
  ]
};

app.post("/analyze", async (req, res) => {
  try {
    const { imageBase64, imageMediaType, occasion, destination } = req.body;

    if (!imageBase64 || !occasion) {
      return res.status(400).json({ error: "imageBase64 ve occasion zorunlu" });
    }

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

app.get("/occasions", (req, res) => {
  res.json(Object.keys(OCCASION_RULES));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Sunucu ${PORT} portunda çalışıyor`));
