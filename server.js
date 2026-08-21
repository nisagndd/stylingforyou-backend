// Basit backend — API key'i mobil app'ten gizli tutmak için gerekli.
// Çalıştırma: npm install && ANTHROPIC_API_KEY=sk-xxx node server.js

const express = require("express");
const cors = require("cors");
const app = express();

app.use(cors());
app.use(express.json({ limit: "10mb" })); // fotoğraf base64 için limit

// ---- KURAL SETİ: Buradan yönetin (app store onayı beklemeden değiştirebilirsiniz) ----
// Anahtarlar mobil uygulamadaki OCCASIONS listesindeki "key" alanlarıyla birebir eşleşmeli.
const OCCASION_RULES = {
  special_occasion: [
    "Beyaz, krem veya gelinlik tonlarına çok yakın kıyafet ciddi puan kaybettirir",
    "Şık kumaşlar (saten, ipek, keten karışımı) ödüllendirilir",
    "Aşırı rahat/günlük parçalar (t-shirt, spor ayakkabı) puan düşürür"
  ],
  casual: [
    "Konfor öncelikli, resmiyet beklenmez",
    "Renk ve parça uyumu yine de değerlendirilir"
  ],
  sport: [
    "Fonksiyonel spor kıyafeti beklenir",
    "Günlük kıyafetle spora gitmek puan kaybettirir"
  ],
  night_out: [
    "İddialı, kendine güvenen parçalar ödüllendirilir",
    "Kombin bütünlüğü (üst-alt-aksesuar uyumu) önemlidir"
  ],
  office: [
    "Aşırı rahat parçalar (eşofman altı, terlik, plaj tipi giysiler) uygun değil",
    "Şık-rahat (smart casual) dengesi aranır",
    "Marka logolu abartılı ya da aşırı gösterişli parçalar puan düşürebilir",
    "Düzenli, ütülü ve bakımlı bir görünüm ödüllendirilir"
  ],
  summer_vacation: [
    "Hafif, nefes alan kumaşlar (keten, pamuk) ödüllendirilir",
    "Aşırı kalın veya kapalı parçalar ortama uygun değil",
    "Güneş/plaj/deniz kenarı için pratiklik önemli bir kriter",
    "Canlı renkler ve rahat kesimler bu ortamda olumlu değerlendirilir"
  ],
  winter_vacation: [
    "Katmanlı giyim (layering) ödüllendirilir",
    "Soğuğa karşı yetersiz kalan kıyafet puan kaybettirir",
    "Kayak/dağ ortamıysa fonksiyonel ve teknik kıyafet beklenir",
    "Şıklık ile sıcak tutma dengesi aranır"
  ],
  fine_dining: [
    "Şık, iyi kesim ve kaliteli görünen parçalar ödüllendirilir",
    "Günlük veya spor kıyafetle (sneaker, şort, tişört) gitmek ciddi puan kaybettirir",
    "Aksesuar ve ayakkabı detaylarına özen gösterilmesi beklenir"
  ],
  after_party: [
    "İddialı, dikkat çekici ve enerjik parçalar ödüllendirilir",
    "Fazla sade veya gündüz havası taşıyan kombinler bu ortam için düşük puan alır",
    "Işıltılı kumaş, metalik detay veya çarpıcı aksesuar artı puan kazandırır"
  ],
  date: [
    "Kendine güvenen ama zorlama olmayan, doğal bir görünüm aranır",
    "Aşırı iddialı ile aşırı gündelik arasında bir denge ödüllendirilir",
    "Düzenli ve özenli görünen detaylar (temiz ayakkabı, uyumlu aksesuar) puan kazandırır"
  ],
  festival: [
    "Rahat, hareket özgürlüğü sağlayan parçalar ödüllendirilir",
    "Kişisel ve özgün stil unsurları (desen, katman, aksesuar) olumlu değerlendirilir",
    "Uzun saatler dışarıda geçirmeye uygun pratik kıyafet/ayakkabı artı puan"
  ],
  influencer: [
    "Fotojenik, kamerada net ve etkili görünen renk/kesim tercih edilir",
    "Kombinin bütünlüğü ve çekim ortamıyla uyumu değerlendirilir",
    "Dikkat dağıtan aşırı karmaşık desen/aksesuar karışıklığı puan düşürebilir"
  ]
};

function languageInstruction(language) {
  return language === "en"
    ? "ÇOK ÖNEMLİ: Tüm yanıtını (verdict, summary, strengths, improvements, pros, cons dahil JSON içindeki TÜM metin alanlarını) İNGİLİZCE yaz. Kurallar Türkçe verilse de, senin yazacağın her cümle İngilizce olmalı."
    : "Tüm yanıtını (JSON içindeki tüm metin alanlarını) TÜRKÇE yaz.";
}

// ---- GÜNCEL MODA BAĞLAMI ----
// Bunu düzenli aralıklarla (ör. her sezon) güncel trend araştırmasıyla tazeleyin.
// Son güncelleme: Ağustos 2026.
const CURRENT_FASHION_CONTEXT = `GÜNCEL MODA BAĞLAMI (2026): Moda söylemi şu anda "sessiz lüks" ile "maksimalist bohem" arasında iki kutupta geziniyor. İş giyiminde vatkasız yumuşak omuzlar, dökümlü pantolonlar ve nefes alan kumaşlarla yeniden tanımlanan bir "power dressing" hakim; konfor artık profesyonel şıklığın da standardı haline geldi. Gorpcore ve "quiet outdoor" etkisiyle teknik/fonksiyonel parçalar günlük şehir stiline sızmış durumda. 80'ler mirası (vatkalı omuz, metalik kumaş, büyük tokalar, asimetrik kesim) ve Y2K/Y3K esintileri (metalik-holografik dokular, bootcut kot, bandana detayı, retro sneaker) güçlü şekilde geri dönüyor. Ekose ve büyük puantiye desenleri yükselişte; hayvan deseni ve yumuşak sarı tonlar (vanilya, tereyağı sarısı) öne çıkan renkler arasında. Deri pantolon ve baggy kesimler kalıcılaşan bir trend. Aynı parçaları yeniden ve yaratıcı şekilde giymek ("repeat wear") artık yenilik takıntısı yerine bir bilinç/zevk göstergesi olarak okunuyor. Bu bağlamı klişe "temiz/düzenli göründü" yorumları yerine, kombinin hangi akımla konuştuğunu, neyi doğru okuduğunu ya da kaçırdığını yorumlamak için kullan — ama zorlama, sadece gerçekten ilgiliyse referans ver.

NOT: Bu bağlam elle güncelleniyor — sezon değiştikçe bu metni yenileyin (son güncelleme: Ağustos 2026).`;

const EDITOR_PERSONA = `Sen sıradan bir "uygun mu değil mi" kontrolcüsü değil, deneyimli ve keskin bakışlı bir moda editörüsün — Vogue tarzı bir dergide çalışan, trendleri yakından takip eden bir stilist gibi düşün. Hitap ettiğin kitle zaten temel giyim kurallarını biliyor (örn. "düğüne beyaz giyilmez" gibi); onlardan beklediğin, kombine gerçek bir stilistin incelikli bakışıyla yaklaşman: siluet, oran, renk teorisi, kumaş dili, ve kombinin şu anki moda akımlarıyla nasıl bir diyalog kurduğu üzerinden yorum yap. Gerektiğinde ve doğal durduğunda, moda gündemini aktif takip eden tanınmış stil ikonlarının bilinen tarzına atıfta bulunarak karşılaştırma yapabilirsin (örn. "bu katmanlama, sokak stilinde sıkça görülen smart-casual yaklaşıma yakın duruyor") — ama bunu zorlamadan, sadece gerçekten oturuyorsa kullan; onlara ait uydurma alıntı ya da sözler ekleme. Amacın kullanıcının zaten bildiği basic kuralları tekrarlamak değil, tarzına yeni bir bakış açısı ve incelik katmak.`;

app.post("/analyze", async (req, res) => {
  try {
    const { imageBase64, imageMediaType, occasion, occasionLabel, destination, language } = req.body;

    if (!imageBase64 || !occasion) {
      return res.status(400).json({ error: "imageBase64 ve occasion zorunlu" });
    }

    console.log(`Gelen görsel: mediaType=${imageMediaType}, uzunluk=${imageBase64.length}, baş=${imageBase64.slice(0, 20)}, lang=${language}`);

    const rules = OCCASION_RULES[occasion] || [];
    const rulesText = rules.map((r, i) => `${i + 1}. ${r}`).join("\n");
    const occasionText = occasionLabel || occasion;

    const systemPrompt = `${EDITOR_PERSONA}

${CURRENT_FASHION_CONTEXT}

${languageInstruction(language)}

Kullanıcının yüklediği kıyafet fotoğrafını "${occasionText}" ortamı için değerlendireceksin. Değerlendirmede ÜÇ kaynağı birleştir:
1) Aşağıdaki SABİT KURALLAR (bunlar sert alt sınırlar — ihlal varsa mutlaka belirt, ama yorumunun TAMAMI bunlardan ibaret olmasın):
${rulesText}

2) Yukarıdaki güncel moda bağlamı ve genel stilist bilginle: siluet, oran, renk uyumu, kumaş/doku dili, ve kombinin bir "bakış açısı" taşıyıp taşımadığını değerlendir.

3) Ortama genel uygunluk.

SADECE aşağıdaki JSON formatında yanıt ver, başka hiçbir metin ekleme:
{
  "score": <0 ile 10 arasında, virgüllü olabilir>,
  "verdict": "<3-5 kelimelik kısa başlık>",
  "summary": "<2-3 cümlelik genel değerlendirme>",
  "strengths": ["<güçlü yön 1>", "<güçlü yön 2>"],
  "improvements": ["<geliştirilecek nokta 1>", "<geliştirilecek nokta 2>"]
}`;

    const userText = destination
      ? `Bu kıyafetle "${occasionText}" ortamına, özellikle şuraya gidiyorum: ${destination}. Değerlendirir misin?`
      : `Bu kıyafetle "${occasionText}" ortamına gidiyorum. Değerlendirir misin?`;

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
    const { imageABase64, imageAMediaType, imageBBase64, imageBMediaType, occasion, occasionLabel, destination, language } = req.body;

    if (!imageABase64 || !imageBBase64 || !occasion) {
      return res.status(400).json({ error: "imageABase64, imageBBase64 ve occasion zorunlu" });
    }

    console.log(`Karşılaştırma isteği: occasion=${occasion}, A uzunluk=${imageABase64.length}, B uzunluk=${imageBBase64.length}, lang=${language}`);

    const rules = OCCASION_RULES[occasion] || [];
    const rulesText = rules.map((r, i) => `${i + 1}. ${r}`).join("\n");
    const occasionText = occasionLabel || occasion;

    const systemPrompt = `${EDITOR_PERSONA}

${CURRENT_FASHION_CONTEXT}

${languageInstruction(language)}

Kullanıcı iki farklı kombin fotoğrafı (A ve B) yükledi ve bunları "${occasionText}" ortamı için karşılaştırmanı istiyor. Değerlendirmede ÜÇ kaynağı birleştir:
1) Aşağıdaki SABİT KURALLAR (bunlar sert alt sınırlar — ihlal varsa mutlaka belirt, ama yorumunun TAMAMI bunlardan ibaret olmasın):
${rulesText}

2) Yukarıdaki güncel moda bağlamı ve genel stilist bilginle: her iki kombinin siluetini, oranını, renk uyumunu, kumaş/doku dilini karşılaştır.

3) Ortama genel uygunluk.

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
      ? `"${occasionText}" ortamı için, özellikle şuraya gidiyorum: ${destination}. A ve B kombinlerini karşılaştırır mısın?`
      : `"${occasionText}" ortamı için A ve B kombinlerini karşılaştırır mısın?`;

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
