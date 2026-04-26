import { GoogleGenerativeAI } from '@google/generative-ai';

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

// ── Ses dosyasından duygu analizi (EmotionPage için) ─────────────────────────
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = () => resolve(reader.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Ses dosyasını Gemini'ye göndererek duygu analizi yapar.
 * @param {File} file  - Ses dosyası
 * @param {Function} setStatus - Durum mesajı setter (opsiyonel)
 */
export async function analyzeEmotionFromAudio(file, setStatus) {
  if (!API_KEY) throw new Error('VITE_GEMINI_API_KEY tanımlı değil');

  setStatus?.('Ses dosyası hazırlanıyor...');
  const base64 = await fileToBase64(file);

  const genAI = new GoogleGenerativeAI(API_KEY);
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    generationConfig: { temperature: 0.15, responseMimeType: 'application/json' },
  });

  setStatus?.('Gemini ile analiz ediliyor...');

  const prompt = `Bu ses kaydını dinle ve çağrı merkezi temsilcisinin duygusal durumunu analiz et.

ANALİZ KRİTERLERİ:
- Ses tonu, konuşma hızı, enerji seviyesi
- Stres, yorgunluk, öfke, kaygı, sakinlik belirtileri (0-100)
- Bağırma veya yüksek ses tonu var mı?
- Acil müdahale gerektiren durum var mı?

Sadece JSON döndür:
{
  "duygular": {
    "stres": 0-100,
    "yorgunluk": 0-100,
    "öfke": 0-100,
    "kaygı": 0-100,
    "sakinlik": 0-100
  },
  "baskın_duygu": "stres|yorgunluk|öfke|kaygı|sakinlik",
  "ses_tonu": "sakin|gergin|yorgun|enerjik|sinirli",
  "konuşma_hızı": "yavaş|normal|hızlı",
  "enerji_seviyesi": "düşük|orta|yüksek",
  "tükenmişlik_riski": "düşük|orta|yüksek|kritik",
  "bağırma_tespit": false,
  "acil_uyarı": false,
  "acil_uyarı_sebebi": "",
  "özet": "1-2 cümle Türkçe özet"
}`;

  const result = await model.generateContent([
    { inlineData: { mimeType: file.type || 'audio/webm', data: base64 } },
    { text: prompt },
  ]);

  setStatus?.('Sonuçlar işleniyor...');
  const raw     = result.response.text().trim();
  const match   = raw.match(/```json\s*([\s\S]*?)\s*```/) || raw.match(/(\{[\s\S]*\})/);
  const jsonStr = match ? match[1] : raw;

  try {
    return JSON.parse(jsonStr);
  } catch {
    throw new Error('Gemini geçersiz JSON döndürdü');
  }
}

/**
 * Görüşme metninden duygu analizi yapar.
 * @param {string} transcript
 * @returns {Promise<{ duygular, baskın_duygu, tükenmişlik_riski, özet }>}
 */
export async function analyzeEmotions(transcript) {
  if (!API_KEY) throw new Error('VITE_GEMINI_API_KEY tanımlı değil');

  const genAI = new GoogleGenerativeAI(API_KEY);
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    generationConfig: { temperature: 0.1, responseMimeType: 'application/json' },
  });

  const prompt = `Bir çağrı merkezi temsilcisinin görüşme metnini analiz et.
Temsilcinin konuşmasındaki duygusal durumu değerlendir.

METİN: "${transcript}"

KURALLAR:
- Duygu skorları 0-100 arasında olmalı
- stres: baskı, gerginlik, zorlanma belirtileri
- yorgunluk: enerjisizlik, tekdüzelik, ilgisizlik belirtileri
- öfke: sinirlilik, sertlik, sabırsızlık belirtileri
- kaygı: belirsizlik, tereddüt, hata korkusu belirtileri
- sakinlik: kontrol, güven, rahat ton belirtileri
- tükenmişlik_riski: "düşük" | "orta" | "yüksek" | "kritik"
- özet: 1-2 cümle, Türkçe, yöneticiye hitaben

Sadece JSON döndür:
{
  "duygular": {
    "stres": 0-100,
    "yorgunluk": 0-100,
    "öfke": 0-100,
    "kaygı": 0-100,
    "sakinlik": 0-100
  },
  "baskın_duygu": "stres|yorgunluk|öfke|kaygı|sakinlik",
  "tükenmişlik_riski": "düşük|orta|yüksek|kritik",
  "özet": "Analiz özeti buraya"
}`;

  const result = await model.generateContent(prompt);
  const raw    = result.response.text().trim();

  const match   = raw.match(/```json\s*([\s\S]*?)\s*```/) || raw.match(/(\{[\s\S]*\})/);
  const jsonStr = match ? match[1] : raw;

  try {
    return JSON.parse(jsonStr);
  } catch {
    throw new Error('Gemini geçersiz JSON döndürdü');
  }
}
