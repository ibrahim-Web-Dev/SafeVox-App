import { GoogleGenerativeAI } from '@google/generative-ai';

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

/**
 * Temsilcinin söylediği cümleyi Gemini ile değerlendirir.
 * @param {string} transcript   - Kullanıcının söylediği metin
 * @param {object} scenario     - { label, beklenen, ipucu, anahtarlar }
 * @returns {Promise<{ puan: number, mesaj: string, bulunanlar: string[], eksikler: string[], detay: string }>}
 */
export async function evaluateWithGemini(transcript, scenario) {
  if (!API_KEY) throw new Error('VITE_GEMINI_API_KEY tanımlı değil');

  const genAI = new GoogleGenerativeAI(API_KEY);
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    generationConfig: { temperature: 0.1, responseMimeType: 'application/json' },
  });

  const prompt = `Sen bir çağrı merkezi eğitmenisin. Aşağıdaki temsilci cümlesini değerlendir.

SENARYO: ${scenario.label}
BEKLENEN CÜMLE: "${scenario.beklenen}"
İPUCU: ${scenario.ipucu}
ARANACAK ANAHTAR KELIMELER: ${scenario.anahtarlar.join(', ')}

TEMSİLCİNİN SÖYLEMESI: "${transcript}"

DEĞERLENDİRME KRİTERLERİ:
- Anahtar kelimelerin bulunması (her biri 20 puan, max 80)
- Genel ton, nezaket ve profesyonellik (max 20 puan)
- Anlam uyumu: beklenen cümleyle benzer mesaj verildi mi?
- Kısmi eşleşmeyi de say: "yardımcı olabilirim" → "yardımcı" bulundu sayılır
- Türkçe yazım hatalarını görmezden gel

Sadece JSON döndür:
{
  "puan": 0-100,
  "mesaj": "Teknocan'ın söyleyeceği kısa Türkçe geri bildirim (1-2 cümle, samimi ve motive edici)",
  "bulunanlar": ["bulunan anahtar kelimeler"],
  "eksikler": ["eksik anahtar kelimeler"],
  "detay": "Neden bu puanı verdiğinin kısa açıklaması"
}`;

  const result = await model.generateContent(prompt);
  const raw = result.response.text().trim();

  const jsonMatch = raw.match(/```json\s*([\s\S]*?)\s*```/) || raw.match(/(\{[\s\S]*\})/);
  const jsonStr = jsonMatch ? jsonMatch[1] : raw;

  try {
    return JSON.parse(jsonStr);
  } catch {
    throw new Error('Gemini geçersiz JSON döndürdü');
  }
}
