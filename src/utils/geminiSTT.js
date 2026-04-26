import { GoogleGenerativeAI } from '@google/generative-ai';

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

const MIME_MAP = {
  mp3: 'audio/mpeg', mpeg: 'audio/mpeg',
  wav: 'audio/wav',  ogg: 'audio/ogg',
  m4a: 'audio/mp4',  mp4: 'audio/mp4',
  webm: 'audio/webm', flac: 'audio/flac', aac: 'audio/aac',
};

function getMimeType(file) {
  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  return MIME_MAP[ext] || file.type || 'audio/mpeg';
}

// File → base64 string (data URL'den sadece veriyi al)
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export async function transcribeWithGemini(file, onStatus) {
  if (!API_KEY) throw new Error('VITE_GEMINI_API_KEY .env dosyasında tanımlı değil');
  if (file.size > 20 * 1024 * 1024) throw new Error('Dosya 20MB\'dan büyük olamaz');

  onStatus('Dosya okunuyor...');
  // setTimeout(0) ile UI'ye nefes aldır, freeze önle
  await new Promise((r) => setTimeout(r, 0));
  const base64 = await fileToBase64(file);
  const mimeType = getMimeType(file);

  onStatus('Gemini\'ye gönderiliyor...');
  await new Promise((r) => setTimeout(r, 0));

  const genAI = new GoogleGenerativeAI(API_KEY);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

  // 90 saniyelik timeout
  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('Zaman aşımı — Gemini 90sn içinde yanıt vermedi')), 90_000)
  );

  let result;
  try {
    result = await Promise.race([
      model.generateContent([
        { inlineData: { mimeType, data: base64 } },
        'Bu ses kaydını Türkçe olarak kelimesi kelimesine transkribe et. Sadece konuşulan metni yaz, başka açıklama ekleme.',
      ]),
      timeoutPromise,
    ]);
  } catch (err) {
    console.error('[Gemini STT error]', err);
    throw err;
  }

  const text = result.response.text().trim();
  if (!text) throw new Error('Gemini boş yanıt döndü');
  return text;
}

export function parseGeminiError(err) {
  const msg = err?.message || '';

  if (msg.includes('429')) {
    // retryDelay'i mesajdan çıkar: "retry in 57.86s"
    const match = msg.match(/retry[^\d]*(\d+(?:\.\d+)?)\s*s/i);
    const secs = match ? Math.ceil(parseFloat(match[1])) : 60;
    return `Kota aşıldı — ${secs} saniye bekleyip tekrar dene`;
  }
  if (msg.includes('API_KEY_INVALID') || msg.includes('expired')) return 'API key geçersiz veya süresi dolmuş — .env dosyasını güncelle';
  if (msg.includes('403')) return 'API key geçersiz veya izin yok';
  if (msg.includes('400')) return 'Dosya formatı desteklenmiyor';
  if (msg.includes('timeout') || msg.includes('Zaman')) return 'Zaman aşımı — tekrar dene';
  if (msg.includes('20MB')) return msg;
  if (msg.includes('fetch')) return 'İnternet bağlantısı yok';
  return msg;
}
