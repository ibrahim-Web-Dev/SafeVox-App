import { FIRST_NAMES, SURNAMES } from './nameData.js';


// ─── TC Kimlik Doğrulama Algoritması ─────────────────────────────────────────

function validateTC(tc) {
  if (!/^[1-9]\d{10}$/.test(tc)) return false;
  const d = tc.split('').map(Number);
  const sum10 = (d[0]+d[2]+d[4]+d[6]+d[8])*7 - (d[1]+d[3]+d[5]+d[7]);
  if (((sum10 % 10) + 10) % 10 !== d[9]) return false;
  const sum11 = d.slice(0, 10).reduce((a, b) => a + b, 0);
  return sum11 % 10 === d[10];
}

// ─── Maskeleme Fonksiyonları ──────────────────────────────────────────────────

function maskTC(tc) {
  // 12345678901 → 123*****901
  return tc.slice(0, 3) + '*'.repeat(5) + tc.slice(8);
}

function maskPhone(phone) {
  // Sadece rakamları al, sonra formatlı maskeyi uygula
  const digits = phone.replace(/\D/g, '');
  // Rakam konumlarını bul
  let digitCount = 0;
  return phone.replace(/\d/g, (ch) => {
    const pos = digitCount++;
    // İlk 2 ve son 2 rakamı göster, ortayı maskele
    if (pos < 2 || pos >= digits.length - 2) return ch;
    return '*';
  });
}

function maskName(name) {
  // İbrahim Yılmaz → İb***** Yı****
  return name.split(' ').map(word => {
    if (!word) return word;
    return word.slice(0, 2) + '*'.repeat(Math.max(word.length - 2, 1));
  }).join(' ');
}

// ─── Çakışma Temizleme ────────────────────────────────────────────────────────

function removeOverlaps(findings) {
  if (!findings.length) return findings;
  const sorted = [...findings].sort((a, b) => a.start - b.start || b.end - a.end);
  const result = [sorted[0]];
  for (let i = 1; i < sorted.length; i++) {
    const prev = result[result.length - 1];
    const curr = sorted[i];
    if (curr.start >= prev.end) {
      result.push(curr);
    }
    // Çakışıyorsa daha uzun olanı tut (prev zaten result'ta)
  }
  return result;
}

// ─── Ana Maskeleme Fonksiyonu ─────────────────────────────────────────────────

/**
 * Metindeki TC kimlik, telefon ve isimleri tespit edip maskeler.
 * @param {string} text - Ham metin
 * @param {{ maskTC?: boolean, maskPhone?: boolean, maskNames?: boolean }} options
 * @returns {{ maskedText: string, findings: Array, stats: object }}
 */
export function maskSensitiveData(text, options = {}) {
  const {
    maskTCEnabled = true,
    maskPhoneEnabled = true,
    maskNamesEnabled = true,
  } = options;

  const findings = [];

  // ── 1. TC Kimlik No ──────────────────────────────────────────────────────────
  if (maskTCEnabled) {
    // Boşluksuz: 12345678901
    const tcSolid = /\b([1-9]\d{10})\b/g;
    // Boşluklu: 495 190 491 24  (toplamda 11 rakam, boşluklarla ayrılmış)
    const tcSpaced = /\b([1-9]\d{0,3}(?:[ \-]\d{2,4}){2,4})\b/g;

    const pushTC = (raw, start) => {
      const digits = raw.replace(/\D/g, '');
      if (digits.length !== 11 || digits[0] === '0') return;
      const already = findings.some((f) => start < f.end && start + raw.length > f.start);
      if (already) return;
      findings.push({
        type: 'TC',
        label: 'TC Kimlik',
        start,
        end: start + raw.length,
        original: raw,
        masked: maskTC(digits), // maskeye saf rakamı ver
      });
    };

    let m;
    while ((m = tcSolid.exec(text)) !== null) pushTC(m[0], m.index);
    while ((m = tcSpaced.exec(text)) !== null) pushTC(m[0], m.index);
  }


  // ── 2. Telefon Numarası ──────────────────────────────────────────────────────
  if (maskPhoneEnabled) {
    // Türk telefon formatları:
    // +90 5XX XXX XX XX  |  0 5XX XXX XX XX  |  5XX XXX XX XX
    // +90 (5XX) XXX XX XX | 0212 XXX XX XX  vs.
    const phonePatterns = [
      // +90 ile başlayan mobil: +90 5XX ...
      /(\+90[\s\-.]?0?5\d{2}[\s\-.]?\d{3}[\s\-.]?\d{2}[\s\-.]?\d{2})/g,
      // +90 ile başlayan sabit hat: +90 2XX / +90 3XX / +90 4XX
      /(\+90[\s\-.]?0?[2-4]\d{2}[\s\-.]?\d{3}[\s\-.]?\d{2}[\s\-.]?\d{2})/g,
      // 0 ile başlayan mobil: 05XX XXX XX XX
      /\b(0[5][0-9]{2}[\s\-.]?\d{3}[\s\-.]?\d{2}[\s\-.]?\d{2})\b/g,
      // 0 ile başlayan sabit: 0212, 0216, 0312 vs.
      /\b(0[2-4]\d{2}[\s\-.]?\d{3}[\s\-.]?\d{2}[\s\-.]?\d{2})\b/g,
      // Sadece 5XX ile başlayan (ulusal format)
      /\b(5[0-9]{2}[\s\-.]?\d{3}[\s\-.]?\d{2}[\s\-.]?\d{2})\b/g,
    ];

    for (const regex of phonePatterns) {
      let m;
      while ((m = regex.exec(text)) !== null) {
        // TC ile çakışıyor mu?
        const alreadyFound = findings.some(
          (f) => m.index < f.end && m.index + m[0].length > f.start
        );
        if (!alreadyFound) {
          findings.push({
            type: 'PHONE',
            label: 'Telefon',
            start: m.index,
            end: m.index + m[0].length,
            original: m[0],
            masked: maskPhone(m[0]),
          });
        }
      }
    }
  }

  // ── 3. İsim Soyisim ──────────────────────────────────────────────────────────
  if (maskNamesEnabled) {
    // Türkçe büyük harfle başlayan kelime dizisi (2 veya 3 kelime)
    // \b Türkçe harfler için çalışmaz (İ,ş,ğ vs. \w'de yok), lookbehind/lookahead kullan
    const TR_CHARS = 'A-Za-zÇĞİÖŞÜçğışöüâîû';
    const wordPattern = '[A-ZÇĞİÖŞÜ][a-züçğışöüâîû]+';
    const nameRegex = new RegExp(
      `(?<![${TR_CHARS}])(${wordPattern}(?:\\s${wordPattern}){1,2})(?![${TR_CHARS}])`,
      'g'
    );

    let m;
    while ((m = nameRegex.exec(text)) !== null) {
      const name = m[1];
      const nameStart = text.indexOf(name, m.index);
      const nameEnd = nameStart + name.length;
      const words = name.split(' ');
      // İlk kelime mutlaka ad listesinde olmalı — "Eşim Yılmaz" gibi yanlış eşleşmeleri önler
      const firstWordIsName = FIRST_NAMES.has(words[0]);
      // Son kelime de sözlükte olmalı — "İbrahim Yılmaz Ankara" gibi şehir eklemelerini engeller
      const lastWord = words[words.length - 1];
      const lastWordIsKnown = SURNAMES.has(lastWord) || FIRST_NAMES.has(lastWord);

      const isLikelyName = firstWordIsName && words.length >= 2 && lastWordIsKnown;

      if (isLikelyName) {
        const alreadyFound = findings.some(
          (f) => nameStart < f.end && nameEnd > f.start
        );
        if (!alreadyFound) {
          findings.push({
            type: 'NAME',
            label: 'İsim',
            start: nameStart,
            end: nameEnd,
            original: name,
            masked: maskName(name),
          });
        }
      } else if (words.length >= 3) {
        // 3-kelime başarısız oldu — ilk 2 kelimeyi ayrıca dene ("İbrahim Yılmaz Ankara" → "İbrahim Yılmaz")
        const sub2 = words.slice(0, 2).join(' ');
        const sub2Start = nameStart;
        const sub2End = sub2Start + sub2.length;
        const sub2Last = words[1];
        const sub2LastKnown = SURNAMES.has(sub2Last) || FIRST_NAMES.has(sub2Last);
        if (FIRST_NAMES.has(words[0]) && sub2LastKnown) {
          const alreadyFound = findings.some((f) => sub2Start < f.end && sub2End > f.start);
          if (!alreadyFound) {
            findings.push({
              type: 'NAME', label: 'İsim',
              start: sub2Start, end: sub2End,
              original: sub2, masked: maskName(sub2),
            });
          }
        }
        // Geri sar — sonraki kelimeden tekrar başla ("Eşim Zeynep Kaya" → "Zeynep Kaya")
        nameRegex.lastIndex = m.index + words[0].length + 1;
      }
    }
  }

  // ── Çakışmaları temizle ve sırala ────────────────────────────────────────────
  const cleanFindings = removeOverlaps(findings);
  cleanFindings.sort((a, b) => a.start - b.start);

  // ── Metni maskele (sondan başa) ───────────────────────────────────────────────
  const descFindings = [...cleanFindings].sort((a, b) => b.start - a.start);
  let maskedText = text;
  for (const f of descFindings) {
    maskedText = maskedText.slice(0, f.start) + f.masked + maskedText.slice(f.end);
  }

  // ── Token modu: yıldız yerine [KİŞİ_1], [TC_1], [TELEFON_1] koy ─────────────
  const counters = { NAME: 0, TC: 0, PHONE: 0 };
  const tokenMap = {}; // original → token (aynı kişiye aynı token)

  const labelMap = { NAME: 'KİŞİ', TC: 'TC', PHONE: 'TELEFON' };

  for (const f of cleanFindings) {
    if (!(f.original in tokenMap)) {
      counters[f.type] = (counters[f.type] || 0) + 1;
      tokenMap[f.original] = `[${labelMap[f.type]}_${counters[f.type]}]`;
    }
    f.token = tokenMap[f.original];
  }

  const tokenDescFindings = [...cleanFindings].sort((a, b) => b.start - a.start);
  let tokenizedText = text;
  for (const f of tokenDescFindings) {
    tokenizedText = tokenizedText.slice(0, f.start) + f.token + tokenizedText.slice(f.end);
  }

  return {
    maskedText,
    tokenizedText,   // duygu analizi için — bağlam korunur, veri gizli
    tokenMap,        // { "İbrahim Yılmaz": "[KİŞİ_1]", ... }
    findings: cleanFindings,
    stats: {
      tc: cleanFindings.filter((f) => f.type === 'TC').length,
      phone: cleanFindings.filter((f) => f.type === 'PHONE').length,
      name: cleanFindings.filter((f) => f.type === 'NAME').length,
      total: cleanFindings.length,
    },
  };
}

/**
 * Metinde tespit edilen hassas verileri HTML olarak renklendirir (önizleme için).
 */
export function highlightSensitiveData(text, findings) {
  if (!findings.length) return escapeHtml(text);

  const sorted = [...findings].sort((a, b) => a.start - b.start);
  let result = '';
  let cursor = 0;

  const colorMap = {
    TC: 'bg-red-500/20 border border-red-500/40 text-red-300',
    PHONE: 'bg-yellow-500/20 border border-yellow-500/40 text-yellow-300',
    NAME: 'bg-blue-500/20 border border-blue-500/40 text-blue-300',
  };

  for (const f of sorted) {
    result += escapeHtml(text.slice(cursor, f.start));
    result += `<mark class="rounded px-0.5 ${colorMap[f.type]}" title="${f.label}">${escapeHtml(f.original)}</mark>`;
    cursor = f.end;
  }
  result += escapeHtml(text.slice(cursor));
  return result;
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/\n/g, '<br/>');
}
