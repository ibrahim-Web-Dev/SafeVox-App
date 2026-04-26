// Mock CRM — TC kimlik numarasına göre müşteri verisi
export const MOCK_CUSTOMERS = {
  '12345678901': {
    tc: '12345678901',
    ad: 'Ahmet Yılmaz',
    telefon: '0532 123 45 67',
    segment: 'Bireysel',
    paket: 'Turkcell Süper 30GB',
    aylikUcret: 299,
    sozlesmeBitis: '2026-08-15',
    sozlesmeBaslangic: '2024-08-15',
    kalanAy: 4,
    caymaUcreti: 1196,          // kalanAy * aylikUcret
    abonerlikSuresi: '20 ay',
    sonFaturalar: [
      { ay: 'Nisan 2026',   tutar: 299, durum: 'Ödendi' },
      { ay: 'Mart 2026',    tutar: 342, durum: 'Ödendi' },
      { ay: 'Şubat 2026',   tutar: 299, durum: 'Ödendi' },
      { ay: 'Ocak 2026',    tutar: 299, durum: 'Ödendi' },
    ],
    internet: { kullanim: 18.4, limit: 30 },
    kalanInternet: 11.6,
    kayitliCihaz: 2,
    sadakatPuani: 1240,
    riskSeviyesi: 'orta',
    acikSikayet: 0,
    notlar: 'Geçen ay tarifesini sormuş.',
  },
  '98765432109': {
    tc: '98765432109',
    ad: 'Fatma Kaya',
    telefon: '0544 987 65 43',
    segment: 'Bireysel',
    paket: 'Turkcell Sınırsız Plus',
    aylikUcret: 549,
    sozlesmeBitis: '2026-12-01',
    sozlesmeBaslangic: '2024-12-01',
    kalanAy: 8,
    caymaUcreti: 4392,
    abonerlikSuresi: '34 ay',
    sonFaturalar: [
      { ay: 'Nisan 2026',   tutar: 549, durum: 'Ödendi' },
      { ay: 'Mart 2026',    tutar: 612, durum: 'Gecikmiş' },
      { ay: 'Şubat 2026',   tutar: 549, durum: 'Ödendi' },
      { ay: 'Ocak 2026',    tutar: 549, durum: 'Ödendi' },
    ],
    internet: { kullanim: 48.2, limit: 999 },
    kalanInternet: null,         // sınırsız
    kayitliCihaz: 4,
    sadakatPuani: 3870,
    riskSeviyesi: 'yüksek',
    acikSikayet: 1,
    notlar: 'Şubat 2026 gecikmiş fatura. Şikayeti açık.',
  },
  '11223344556': {
    tc: '11223344556',
    ad: 'Mehmet Demir',
    telefon: '0505 112 33 44',
    segment: 'Kurumsal',
    paket: 'Turkcell Kurumsal 50GB',
    aylikUcret: 699,
    sozlesmeBitis: '2027-03-20',
    sozlesmeBaslangic: '2025-03-20',
    kalanAy: 11,
    caymaUcreti: 7689,
    abonerlikSuresi: '13 ay',
    sonFaturalar: [
      { ay: 'Nisan 2026',   tutar: 699, durum: 'Ödendi' },
      { ay: 'Mart 2026',    tutar: 699, durum: 'Ödendi' },
      { ay: 'Şubat 2026',   tutar: 782, durum: 'Ödendi' },
      { ay: 'Ocak 2026',    tutar: 699, durum: 'Ödendi' },
    ],
    internet: { kullanim: 32.1, limit: 50 },
    kalanInternet: 17.9,
    kayitliCihaz: 1,
    sadakatPuani: 890,
    riskSeviyesi: 'düşük',
    acikSikayet: 0,
    notlar: '',
  },
  '55667788990': {
    tc: '55667788990',
    ad: 'Zeynep Arslan',
    telefon: '0533 556 67 89',
    segment: 'Bireysel',
    paket: 'Turkcell Akıllı 15GB',
    aylikUcret: 179,
    sozlesmeBitis: '2026-06-10',
    sozlesmeBaslangic: '2024-06-10',
    kalanAy: 2,
    caymaUcreti: 358,
    abonerlikSuresi: '22 ay',
    sonFaturalar: [
      { ay: 'Nisan 2026',   tutar: 179, durum: 'Ödendi' },
      { ay: 'Mart 2026',    tutar: 179, durum: 'Ödendi' },
      { ay: 'Şubat 2026',   tutar: 195, durum: 'Ödendi' },
      { ay: 'Ocak 2026',    tutar: 179, durum: 'Ödendi' },
    ],
    internet: { kullanim: 12.3, limit: 15 },
    kalanInternet: 2.7,
    kayitliCihaz: 1,
    sadakatPuani: 2100,
    riskSeviyesi: 'düşük',
    acikSikayet: 0,
    notlar: 'Sadık müşteri, 22 ay.',
  },
};

// TC numarası, telefon numarası veya ad soyad ile ara
export function lookupCustomer(query) {
  query = query.trim();
  // Doğrudan TC eşleşmesi
  if (MOCK_CUSTOMERS[query]) return MOCK_CUSTOMERS[query];
  // Telefon numarası eşleşmesi (boşluksuz karşılaştır)
  const cleanQ = query.replace(/\s|-/g, '');
  const byPhone = Object.values(MOCK_CUSTOMERS).find(
    (c) => c.telefon.replace(/\s|-/g, '') === cleanQ
  );
  if (byPhone) return byPhone;
  // Ad soyad eşleşmesi
  const byName = Object.values(MOCK_CUSTOMERS).find(
    (c) => c.ad.toLowerCase() === query.toLowerCase()
  );
  return byName || null;
}

// İsme göre müşteri bul (tam ad veya yalnız ad ile)
export function findCustomerByName(text) {
  const lower = text.toLowerCase();
  // Tam ad eşleşmesi
  let found = Object.values(MOCK_CUSTOMERS).find((c) => lower.includes(c.ad.toLowerCase()));
  if (found) return found;
  // Sadece ad ile eşleşme (4+ harf, yanlış pozitif önlemi)
  found = Object.values(MOCK_CUSTOMERS).find((c) => {
    const firstName = c.ad.split(' ')[0].toLowerCase();
    return firstName.length >= 4 && lower.includes(firstName);
  });
  return found || null;
}

// Transcriptten TC numarası çıkar (11 basamaklı)
export function extractTC(text) {
  const clean = text.replace(/\s/g, '');
  const match = clean.match(/\b[1-9]\d{10}\b/);
  return match ? match[0] : null;
}

// Transcriptten telefon numarası çıkar (05xx...)
export function extractPhone(text) {
  const clean = text.replace(/\s/g, '');
  const match = clean.match(/0[5][0-9]{9}/);
  return match ? match[0] : null;
}

// Keyword → panel eşleşmesi
export const KEYWORD_PANELS = [
  { keywords: ['cayma', 'cayacağım', 'iptal', 'vazgeç', 'bırakmak', 'ayrılmak', 'fesih'],   panel: 'cayma' },
  { keywords: ['fatura', 'ödeme', 'borç', 'ücret', 'para', 'ekstre', 'gecikmiş'],             panel: 'fatura' },
  { keywords: ['paket', 'tarife', 'internet', 'gb', 'limit', 'data', 'kota'],                 panel: 'paket' },
  { keywords: ['şikayet', 'sorun', 'problem', 'çalışmıyor', 'kesinti', 'yavaş', 'bağlan'],   panel: 'sikayet' },
  { keywords: ['puan', 'hediye', 'sadakat', 'ödül', 'kampanya', 'indirim'],                  panel: 'sadakat' },
];

export function detectPanels(text) {
  const lower = text.toLowerCase();
  const found = new Set();
  for (const { keywords, panel } of KEYWORD_PANELS) {
    if (keywords.some((k) => lower.includes(k))) found.add(panel);
  }
  return [...found];
}
