'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mic, MicOff, PhoneOff, User, CreditCard, Wifi, Star,
  AlertTriangle, CheckCircle2, ChevronRight,
  Loader2, Zap, Search, Phone, Pencil, X, Check, ClipboardList,
  ShieldCheck, History, TrendingUp, Award, Play, BarChart2,
} from 'lucide-react';
import { lookupCustomer, findCustomerByName, extractTC, extractPhone, detectPanels } from '../utils/mockCRM';
const GROQ_KEY = import.meta.env.VITE_GROQ_API_KEY;

// ── Duygu tespiti ─────────────────────────────────────────────────────────────
const NEGATIVE_WORDS = [
  'cayma','iptal','şikayet','kötü','berbat','bıktım','istemiyorum','sorun',
  'problem','çalışmıyor','yavaş','kesinti','gecikmiş','mağdur','haksız',
  'rezalet','şikayetim','sinirli','üzgün','memnun değil','hayal kırıklığı',
];
const POSITIVE_WORDS = [
  'teşekkür','memnun','güzel','harika','tamam','olur','sağ ol','süper',
  'iyi','mükemmel','sevindim','mutlu','çözüldü','anlaştık','başarılı',
  'sevindim','seve seve','evet','tabii','kesinlikle',
];
function detectEmotion(text) {
  const lower = text.toLowerCase();
  const neg = NEGATIVE_WORDS.filter((w) => lower.includes(w)).length;
  const pos = POSITIVE_WORDS.filter((w) => lower.includes(w)).length;
  if (neg > pos) return 'negative';
  if (pos > neg) return 'positive';
  return 'neutral';
}
const EMOTION_META = {
  positive: { emoji: '😊', color: 'text-emerald-500', bg: 'bg-emerald-50 border-emerald-100' },
  neutral:  { emoji: '😐', color: 'text-slate-400',   bg: 'bg-slate-50 border-slate-100' },
  negative: { emoji: '😠', color: 'text-red-500',     bg: 'bg-red-50 border-red-100' },
};

// ── KVKK maskeleme ────────────────────────────────────────────────────────────
function maskPII(text) {
  // TC: 11 rakam, ilki sıfır olmaz — boşluklu gelirse de (ses tanıma) maskele
  return text
    .replace(/\b[1-9](?:\s*\d){10}\b/g, (m) =>
      m.replace(/\s/g, '').length === 11 ? '[TC GİZLENDİ]' : m
    )
    .replace(/0[5]\d{9}/g, '[TEL GİZLENDİ]')
    .replace(/\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g, '[KART GİZLENDİ]');
}

// ── SGS Risk Tespiti (Hatalı Bilgi) ──────────────────────────────────────────
function checkSGSRisk(text, customer) {
  if (!customer) return null;
  const t = text.toLowerCase();

  // GB / internet kota kontrolü
  const gbMatch = t.match(/(\d+)\s*gb/);
  if (gbMatch) {
    const val = parseInt(gbMatch[1]);
    const limit = customer.internet?.limit;
    if (limit && Math.abs(val - limit) > 2 && val !== customer.internet?.kullanim) {
      return `⚠ İnternet kotası ${limit} GB — "${val} GB" hatalı bilgi`;
    }
  }

  // Kalan ay kontrolü
  const ayMatch = t.match(/(\d+)\s*ay\s*(?:kaldı|kalan|sonra|daha)/);
  if (ayMatch) {
    const val = parseInt(ayMatch[1]);
    if (Math.abs(val - customer.kalanAy) > 1) {
      return `⚠ Sözleşmede ${customer.kalanAy} ay kaldı — "${val} ay" hatalı bilgi`;
    }
  }

  // Aylık ücret kontrolü
  const tlMatch = t.match(/(\d+)\s*(?:tl|lira)/);
  if (tlMatch) {
    const val = parseInt(tlMatch[1]);
    const fee = customer.aylikUcret;
    if (val > 10 && Math.abs(val - fee) > 15 && Math.abs(val - customer.caymaUcreti) > 15) {
      if (val < fee * 0.5 || val > fee * 2) {
        return `⚠ Aylık ücret ${fee} TL — "${val} TL" hatalı bilgi`;
      }
    }
  }

  return null;
}

// ── Demo senaryosu ────────────────────────────────────────────────────────────
const DEMO_LINES = [
  { text: 'Merhaba, Turkcell müşteri hizmetlerini aradınız, size nasıl yardımcı olabilirim?', speaker: 'agent' },
  { text: 'Merhaba, faturamda beklenmedik bir ücret var neden bu kadar yüksek geldi anlamadım.', speaker: 'customer' },
  { text: 'TC kimlik numaranızı alabilir miyim?', speaker: 'agent' },
  { text: 'Evet buyurun 12345678901', speaker: 'customer' },
  { text: 'Teşekkürler, faturanıza bakıyorum. Geçen ay ek internet paketi kullanmışsınız.', speaker: 'agent' },
  { text: 'Ben öyle bir şey almadım bu çok haksız bir durum bence şikayet etmek istiyorum.', speaker: 'customer' },
  { text: 'Anlıyorum müşterimiz haklısınız, hemen inceliyorum.', speaker: 'agent' },
  { text: 'Bıktım ya her ay farklı sorun çıkıyor berbat bir hizmet.', speaker: 'customer' },
  { text: 'Özür dileriz, şikayet kaydı oluşturuyorum. 48 saat içinde geri dönüş yapılacak ve ücret iade edilecek.', speaker: 'agent' },
  { text: 'Tamam teşekkür ederim umarım çözülür.', speaker: 'customer' },
  { text: 'Kesinlikle çözülecek, yardımcı olabildiğim için memnunum, iyi günler dilerim.', speaker: 'agent' },
];

// ── Çağrı geçmişi ─────────────────────────────────────────────────────────────
function getHistory() {
  try { return JSON.parse(localStorage.getItem('sv_call_history') || '[]'); }
  catch { return []; }
}
function saveToHistory(entry) {
  const h = getHistory();
  h.unshift(entry);
  localStorage.setItem('sv_call_history', JSON.stringify(h.slice(0, 50)));
}

// ── Performans skoru ─────────────────────────────────────────────────────────
function calcScore(lines, form) {
  if (!lines.length) return 0;
  const pos = lines.filter((l) => l.emotion === 'positive').length;
  const neg = lines.filter((l) => l.emotion === 'negative').length;
  let score = 50;
  score += (pos / lines.length) * 30;
  score -= (neg / lines.length) * 20;
  if (form.sonuc === 'Çözüldü')       score += 20;
  else if (form.sonuc === 'Yönlendirildi') score += 10;
  else if (form.sonuc === 'Çözümsüz') score -= 10;
  return Math.max(0, Math.min(100, Math.round(score)));
}

// ── Çağrı sayacı ──────────────────────────────────────────────────────────────
function CallTimer({ active }) {
  const [secs, setSecs] = useState(0);
  useEffect(() => {
    if (!active) { setSecs(0); return; }
    const t = setInterval(() => setSecs((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [active]);
  const m = String(Math.floor(secs / 60)).padStart(2, '0');
  const s = String(secs % 60).padStart(2, '0');
  return <span className="font-mono text-sm font-semibold text-slate-700">{m}:{s}</span>;
}

// ── Dashboard Özet Kartları ───────────────────────────────────────────────────
function DashboardCards({ history }) {
  const today      = new Date().toDateString();
  const todayCalls = history.filter((h) => new Date(h.date).toDateString() === today).length;
  const avgScore   = history.length
    ? Math.round(history.reduce((s, h) => s + (h.score || 0), 0) / history.length)
    : 0;
  const solvedPct  = history.length
    ? Math.round((history.filter((h) => h.sonuc === 'Çözüldü').length / history.length) * 100)
    : 0;
  const katMap     = history.reduce((acc, h) => { acc[h.kategori] = (acc[h.kategori] || 0) + 1; return acc; }, {});
  const topKat     = Object.entries(katMap).sort((a, b) => b[1] - a[1])[0]?.[0] || '—';

  const cards = [
    { label: 'Bugünkü Çağrı', value: todayCalls,      icon: Phone,        color: 'text-indigo-600',  bg: 'bg-indigo-50 border-indigo-100'   },
    { label: 'Ort. Skor',     value: `${avgScore}/100`, icon: TrendingUp,  color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-100' },
    { label: 'Çözüm Oranı',  value: `%${solvedPct}`,  icon: CheckCircle2, color: 'text-blue-600',    bg: 'bg-blue-50 border-blue-100'       },
    { label: 'En Sık Konu',  value: topKat,            icon: BarChart2,    color: 'text-violet-600',  bg: 'bg-violet-50 border-violet-100'   },
  ];

  return (
    <div className="grid grid-cols-4 gap-4 mb-5">
      {cards.map(({ label, value, icon: Icon, color, bg }) => (
        <motion.div
          key={label}
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className={`border rounded-2xl px-4 py-3 ${bg} flex items-center gap-3`}
        >
          <div className="w-9 h-9 rounded-xl bg-white/80 flex items-center justify-center shadow-sm flex-shrink-0">
            <Icon className={`w-4 h-4 ${color}`} />
          </div>
          <div>
            <p className="text-xs text-slate-400">{label}</p>
            <p className={`text-lg font-bold leading-tight ${color}`}>{value}</p>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

// ── Çağrı Geçmişi Paneli ──────────────────────────────────────────────────────
function HistoryPanel({ history, onClose }) {
  const sc = (s) =>
    s >= 75 ? 'text-emerald-600 bg-emerald-50 border-emerald-200'
    : s >= 50 ? 'text-amber-600 bg-amber-50 border-amber-200'
    : 'text-red-600 bg-red-50 border-red-200';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-40 flex justify-end"
    >
      <div className="flex-1 bg-slate-900/30 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ x: 320 }}
        animate={{ x: 0 }}
        exit={{ x: 320 }}
        transition={{ type: 'spring', stiffness: 340, damping: 32 }}
        className="w-80 bg-white h-full overflow-y-auto shadow-2xl shadow-slate-900/20 flex flex-col"
      >
        <div className="sticky top-0 bg-white border-b border-slate-100 px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-indigo-500" />
            <h2 className="font-bold text-slate-800 text-sm">Çağrı Geçmişi</h2>
            {history.length > 0 && (
              <span className="text-xs bg-indigo-100 text-indigo-600 font-semibold px-2 py-0.5 rounded-full">
                {history.length}
              </span>
            )}
          </div>
          <button onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition p-1 rounded-lg hover:bg-slate-100">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 p-4 space-y-3">
          {history.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-12 text-center">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center">
                <History className="w-6 h-6 text-slate-300" />
              </div>
              <p className="text-sm text-slate-400">Henüz çağrı kaydı yok</p>
              <p className="text-xs text-slate-300">Çağrı bittiğinde kayıtlar burada görünür</p>
            </div>
          ) : (
            history.map((h, i) => (
              <motion.div
                key={h.id || i}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
                className="bg-slate-50 border border-slate-200 rounded-xl p-3 hover:border-indigo-200 transition"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm font-semibold text-slate-700">{h.customer}</span>
                  {h.score != null && (
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${sc(h.score)}`}>
                      {h.score}/100
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-1.5 text-xs mb-1.5">
                  <span className="bg-indigo-50 text-indigo-600 border border-indigo-100 px-2 py-0.5 rounded-full font-medium">{h.kategori}</span>
                  <span className={`px-2 py-0.5 rounded-full font-medium border ${
                    h.sonuc === 'Çözüldü' ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                    : h.sonuc === 'Çözümsüz' ? 'bg-red-50 text-red-600 border-red-100'
                    : 'bg-amber-50 text-amber-600 border-amber-100'
                  }`}>{h.sonuc}</span>
                  <span className="text-slate-400">{new Date(h.date).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' })}</span>
                </div>
                {h.musteriTalebi && (
                  <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">{h.musteriTalebi}</p>
                )}
              </motion.div>
            ))
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Risk rozeti ───────────────────────────────────────────────────────────────
function RiskBadge({ level }) {
  const cfg = {
    yüksek: 'bg-red-50 text-red-600 border-red-200',
    orta:   'bg-amber-50 text-amber-600 border-amber-200',
    düşük:  'bg-emerald-50 text-emerald-600 border-emerald-200',
  };
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${cfg[level] || cfg.orta}`}>
      {level === 'yüksek' ? '⚠ Yüksek Risk' : level === 'orta' ? '● Orta Risk' : '✓ Düşük Risk'}
    </span>
  );
}

// ── Müşteri bilgi kartı ───────────────────────────────────────────────────────
function CustomerCard({ customer, notes, onNotesChange }) {
  const [editing, setEditing] = useState(false);
  const [draft,   setDraft]   = useState(notes);
  const textareaRef = useRef(null);

  useEffect(() => { setDraft(notes); setEditing(false); }, [notes]);
  useEffect(() => { if (editing) textareaRef.current?.focus(); }, [editing]);

  const save = () => { onNotesChange(draft); setEditing(false); };
  const cancel = () => { setDraft(notes); setEditing(false); };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="bg-white border border-indigo-100 rounded-2xl p-5 shadow-md shadow-indigo-50"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-safe-500 to-vox-600 flex items-center justify-center text-white font-bold text-lg shadow-md shadow-safe-500/20">
            {customer.ad[0]}
          </div>
          <div>
            <p className="font-semibold text-slate-800">{customer.ad}</p>
            <p className="text-xs text-slate-400">{customer.segment} · {customer.abonerlikSuresi}</p>
          </div>
        </div>
        <RiskBadge level={customer.riskSeviyesi} />
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="bg-slate-50 rounded-xl p-3">
          <p className="text-xs text-slate-400 mb-1">Aktif Paket</p>
          <p className="font-semibold text-slate-700 text-xs leading-snug">{customer.paket}</p>
          <p className="text-safe-600 font-bold mt-1">{customer.aylikUcret} ₺/ay</p>
        </div>
        <div className="bg-slate-50 rounded-xl p-3">
          <p className="text-xs text-slate-400 mb-1">Sözleşme Bitiş</p>
          <p className="font-semibold text-slate-700">{customer.sozlesmeBitis}</p>
          <p className="text-xs text-slate-500 mt-1">{customer.kalanAy} ay kaldı</p>
        </div>
        <div className="bg-slate-50 rounded-xl p-3">
          <p className="text-xs text-slate-400 mb-1">İnternet</p>
          {customer.kalanInternet === null ? (
            <p className="font-semibold text-slate-700">Sınırsız ∞</p>
          ) : (
            <>
              <p className="font-semibold text-slate-700">{customer.internet.kullanim} / {customer.internet.limit} GB</p>
              <div className="mt-1.5 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-safe-400 to-safe-500 rounded-full"
                  style={{ width: `${Math.min(100, (customer.internet.kullanim / customer.internet.limit) * 100)}%` }}
                />
              </div>
            </>
          )}
        </div>
        <div className="bg-slate-50 rounded-xl p-3">
          <p className="text-xs text-slate-400 mb-1">Sadakat Puanı</p>
          <p className="font-semibold text-slate-700">{customer.sadakatPuani.toLocaleString('tr')} P</p>
          {customer.acikSikayet > 0 && (
            <p className="text-xs text-red-500 mt-1">{customer.acikSikayet} açık şikayet</p>
          )}
        </div>
      </div>

      {/* Düzenlenebilir notlar */}
      <div className="mt-3">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">CRM Notu</span>
          {!editing ? (
            <button
              onClick={() => setEditing(true)}
              className="flex items-center gap-1 text-xs text-indigo-500 hover:text-indigo-700 transition px-2 py-0.5 rounded-lg hover:bg-indigo-50"
            >
              <Pencil className="w-3 h-3" /> Düzenle
            </button>
          ) : (
            <div className="flex items-center gap-1">
              <button onClick={save}
                className="flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-700 transition px-2 py-0.5 rounded-lg hover:bg-emerald-50">
                <Check className="w-3 h-3" /> Kaydet
              </button>
              <button onClick={cancel}
                className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 transition px-2 py-0.5 rounded-lg hover:bg-slate-100">
                <X className="w-3 h-3" /> İptal
              </button>
            </div>
          )}
        </div>
        {editing ? (
          <textarea
            ref={textareaRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={3}
            placeholder="Bu müşteri hakkında not ekleyin..."
            className="w-full text-xs text-slate-700 bg-amber-50 border border-amber-300 rounded-xl px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-amber-300/40 focus:border-amber-400 transition placeholder-slate-400"
          />
        ) : (
          <div
            onClick={() => setEditing(true)}
            className={`min-h-[2.5rem] text-xs rounded-xl px-3 py-2 border cursor-text transition ${
              notes
                ? 'bg-amber-50 border-amber-200 text-amber-700'
                : 'bg-slate-50 border-dashed border-slate-200 text-slate-300 italic'
            }`}
          >
            {notes || 'Not eklemek için tıklayın...'}
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ── Akıllı Panel: Cayma Bedeli ────────────────────────────────────────────────
function CaymaPanel({ customer }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      className="bg-red-50 border border-red-200 rounded-2xl p-4 shadow-sm"
    >
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-lg bg-red-500 flex items-center justify-center">
          <PhoneOff className="w-4 h-4 text-white" />
        </div>
        <div>
          <p className="text-sm font-bold text-red-700">Cayma / İptal Talebi</p>
          <p className="text-xs text-red-500">Otomatik tespit edildi</p>
        </div>
      </div>
      <div className="space-y-2">
        <div className="flex justify-between items-center bg-white rounded-xl px-4 py-2.5 border border-red-100">
          <span className="text-sm text-slate-600">Cayma Ücreti</span>
          <span className="font-bold text-red-600 text-lg">{customer.caymaUcreti.toLocaleString('tr')} ₺</span>
        </div>
        <div className="flex justify-between items-center bg-white rounded-xl px-4 py-2.5 border border-red-100">
          <span className="text-sm text-slate-600">Kalan Ay</span>
          <span className="font-semibold text-slate-700">{customer.kalanAy} ay</span>
        </div>
        <div className="flex justify-between items-center bg-white rounded-xl px-4 py-2.5 border border-red-100">
          <span className="text-sm text-slate-600">Sözleşme Bitiş</span>
          <span className="font-semibold text-slate-700">{customer.sozlesmeBitis}</span>
        </div>
      </div>
      <div className="mt-3 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 text-xs text-amber-700">
        💡 <strong>İpucu:</strong> Sadakat paketi teklifi sunabilirsiniz. Müşterinin {customer.sadakatPuani} puanı var.
      </div>
    </motion.div>
  );
}

// ── Akıllı Panel: Son Faturalar ───────────────────────────────────────────────
function FaturaPanel({ customer }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      className="bg-blue-50 border border-blue-200 rounded-2xl p-4 shadow-sm"
    >
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center">
          <CreditCard className="w-4 h-4 text-white" />
        </div>
        <p className="text-sm font-bold text-blue-700">Son Faturalar</p>
      </div>
      <div className="space-y-1.5">
        {customer.sonFaturalar.map((f, i) => (
          <div key={i} className="flex justify-between items-center bg-white rounded-xl px-4 py-2 border border-blue-100">
            <span className="text-sm text-slate-600">{f.ay}</span>
            <div className="flex items-center gap-3">
              <span className="font-semibold text-slate-800">{f.tutar} ₺</span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                f.durum === 'Ödendi' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'
              }`}>{f.durum}</span>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

// ── Akıllı Panel: Paket Bilgisi ───────────────────────────────────────────────
function PaketPanel({ customer }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      className="bg-violet-50 border border-violet-200 rounded-2xl p-4 shadow-sm"
    >
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-lg bg-violet-500 flex items-center justify-center">
          <Wifi className="w-4 h-4 text-white" />
        </div>
        <p className="text-sm font-bold text-violet-700">Paket Detayı</p>
      </div>
      <div className="space-y-2">
        <div className="bg-white rounded-xl px-4 py-3 border border-violet-100">
          <p className="text-xs text-slate-400 mb-0.5">Aktif Paket</p>
          <p className="font-semibold text-slate-800">{customer.paket}</p>
          <p className="text-safe-600 font-bold mt-1">{customer.aylikUcret} ₺/ay</p>
        </div>
        {customer.kalanInternet !== null ? (
          <div className="bg-white rounded-xl px-4 py-3 border border-violet-100">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-slate-500">İnternet Kullanımı</span>
              <span className="font-semibold text-slate-700">{customer.internet.kullanim} / {customer.internet.limit} GB</span>
            </div>
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-violet-400 to-violet-600"
                style={{ width: `${Math.min(100, (customer.internet.kullanim / customer.internet.limit) * 100)}%` }}
              />
            </div>
            <p className="text-xs text-slate-500 mt-1.5">{customer.kalanInternet} GB kalan</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl px-4 py-3 border border-violet-100 text-center">
            <p className="font-bold text-violet-600 text-lg">∞ Sınırsız</p>
            <p className="text-xs text-slate-400">İnternet kotası yok</p>
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ── Akıllı Panel: Sadakat ─────────────────────────────────────────────────────
function SadakatPanel({ customer }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      className="bg-amber-50 border border-amber-200 rounded-2xl p-4 shadow-sm"
    >
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center">
          <Star className="w-4 h-4 text-white" />
        </div>
        <p className="text-sm font-bold text-amber-700">Sadakat & Kampanyalar</p>
      </div>
      <div className="bg-white rounded-xl px-4 py-3 border border-amber-100 mb-2">
        <p className="text-xs text-slate-400 mb-1">Mevcut Puanı</p>
        <p className="text-2xl font-bold text-amber-600">{customer.sadakatPuani.toLocaleString('tr')}</p>
        <p className="text-xs text-slate-500">Türkcell Sadakat Puanı</p>
      </div>
      <div className="space-y-1.5 text-xs">
        {[
          '🎁 500 puan ile 5 GB ek internet',
          '🎬 1000 puan ile 1 aylık TV+ üyelik',
          '☕ 200 puan ile Starbucks içecek',
        ].map((o, i) => (
          <div key={i} className="bg-white rounded-xl px-3 py-2 border border-amber-100 flex items-center justify-between">
            <span className="text-slate-600">{o}</span>
            <ChevronRight className="w-3 h-3 text-slate-400 flex-shrink-0" />
          </div>
        ))}
      </div>
    </motion.div>
  );
}

// ── Akıllı Panel: Şikayet ────────────────────────────────────────────────────
function SikayetPanel({ customer }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      className="bg-orange-50 border border-orange-200 rounded-2xl p-4 shadow-sm"
    >
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-lg bg-orange-500 flex items-center justify-center">
          <AlertTriangle className="w-4 h-4 text-white" />
        </div>
        <div>
          <p className="text-sm font-bold text-orange-700">Şikayet / Sorun Talebi</p>
          {customer.acikSikayet > 0 && (
            <p className="text-xs text-red-500">{customer.acikSikayet} açık şikayet mevcut!</p>
          )}
        </div>
      </div>
      <div className="space-y-2 text-sm">
        {[
          { label: 'Teknik Sorun Bildir', color: 'bg-white border-orange-100' },
          { label: 'Fatura İtirazı Aç', color: 'bg-white border-orange-100' },
          { label: 'Genel Şikayet Oluştur', color: 'bg-white border-orange-100' },
        ].map((a, i) => (
          <div key={i} className={`flex items-center justify-between rounded-xl px-4 py-2.5 border ${a.color}`}>
            <span className="text-slate-700">{a.label}</span>
            <ChevronRight className="w-4 h-4 text-slate-400" />
          </div>
        ))}
      </div>
    </motion.div>
  );
}

// ── Çağrı Formu Modal ─────────────────────────────────────────────────────────
const SONUC_OPTIONS    = ['Çözüldü', 'Beklemede', 'Yönlendirildi', 'Çözümsüz'];
const KATEGORI_OPTIONS = ['Cayma', 'Fatura', 'Paket', 'Şikayet', 'Genel'];
const ONCELIK_OPTIONS  = ['Düşük', 'Orta', 'Yüksek'];

function analyzeLocally(transcript, customer) {
  const t = transcript.toLowerCase();

  let kategori = 'Genel';
  if (/(cayma|iptal|vazgeç|bırakıyorum|ayrıl)/.test(t))                          kategori = 'Cayma';
  else if (/(fatura|ödeme|ücret|borç|tahsilat|ekstre)/.test(t))                  kategori = 'Fatura';
  else if (/(şikayet|sorun|problem|bozuk|çalışmıyor|kesinti|yavaş)/.test(t))     kategori = 'Şikayet';
  else if (/(paket|tarife|internet|gb|sınırsız|kota|hat)/.test(t))               kategori = 'Paket';

  let sonuc = 'Beklemede';
  if (/(tamam|çözüldü|hallettik|tamamlandı|anlaştık|memnun)/.test(t))            sonuc = 'Çözüldü';
  else if (/(aktarıyorum|yönlendiriyorum|teknik ekip|ilgili birim)/.test(t))     sonuc = 'Yönlendirildi';
  else if (/(yapamam|mümkün değil|çözüm yok|reddedil)/.test(t))                  sonuc = 'Çözümsüz';

  let oncelik = 'Orta';
  if (/(acil|hemen|bekleyemem|çok önemli|kritik)/.test(t) || customer?.riskSeviyesi === 'yüksek') oncelik = 'Yüksek';
  else if (/(bilgi|merak|genel|rutin)/.test(t) && kategori === 'Genel')           oncelik = 'Düşük';

  const talepler = {
    Cayma:    'Müşteri aboneliğini iptal ettirmek istemektedir.',
    Fatura:   'Müşteri fatura veya ödeme bilgilerini sorgulamaktadır.',
    Şikayet:  'Müşteri yaşadığı teknik veya hizmet sorununu bildirmektedir.',
    Paket:    'Müşteri mevcut paket bilgisi veya değişikliği hakkında bilgi almaktadır.',
    Genel:    'Müşteri genel bilgi talebiyle aramıştır.',
  };
  const islemler = {
    Cayma:    `Cayma talebi alındı. Müşteriye mevcut sadakat puanı (${customer?.sadakatPuani ?? '—'} P) hatırlatıldı, alternatif paket seçenekleri sunuldu.`,
    Fatura:   'Fatura detayları müşteriyle paylaşıldı, varsa ödenmemiş borç bildirildi.',
    Şikayet:  'Sorun kaydı oluşturuldu, teknik ekibe iletildi ve müşteriye bilgi verildi.',
    Paket:    'Mevcut paket bilgisi açıklandı, uygun alternatifler sunuldu.',
    Genel:    'Müşteri bilgilendirildi, gerekli işlemler gerçekleştirildi.',
  };
  const aksiyonlar = {
    Cayma:    'Sadakat paketi veya tazminat teklifi yapılması önerilir.',
    Fatura:   'Fatura itirazı varsa ilgili birime yönlendirilmeli, takip numarası verilmelidir.',
    Şikayet:  'Teknik ekip geri dönüşü beklenmeli, 24 saat içinde müşteri aranmalıdır.',
    Paket:    'Paket değişikliği yapılacaksa onay alınmalı ve yansıma süresi bildirilmelidir.',
    Genel:    '',
  };

  return {
    kategori,
    oncelik,
    sonuc,
    musteriTalebi:   talepler[kategori],
    yapilanIslem:    islemler[kategori],
    onerilenAksiyon: aksiyonlar[kategori],
  };
}

function CallFormModal({ lines, customer, notes, onSave, onClose, onScored }) {
  const maskedTranscript = lines.map((l) => l.text).join(' ');
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [source, setSource]   = useState('');
  const [form, setForm] = useState({
    kategori:        'Genel',
    oncelik:         'Orta',
    musteriTalebi:   '',
    yapilanIslem:    '',
    sonuc:           'Beklemede',
    onerilenAksiyon: '',
    crmNotu:         notes || '',
  });

  useEffect(() => {
    async function generate() {
      if (!maskedTranscript.trim()) {
        setForm((prev) => ({ ...prev, ...analyzeLocally('', customer) }));
        setLoading(false);
        return;
      }

      if (GROQ_KEY) {
        try {
          const prompt = `Sen bir çağrı merkezi analiz asistanısın. Aşağıdaki Türkçe görüşme transkriptini analiz et ve yalnızca JSON döndür.
${customer ? `Müşteri: ${customer.ad} | Segment: ${customer.segment} | Paket: ${customer.paket}` : ''}
Transkript: """${maskedTranscript}"""
JSON formatı (başka hiçbir şey yazma):
{"musteriTalebi":"Müşterinin 1 cümlelik talebi","yapilanIslem":"Yapılan işlem 1-2 cümle","sonuc":"Çözüldü|Beklemede|Yönlendirildi|Çözümsüz","onerilenAksiyon":"Sonraki adım (yoksa boş)","kategori":"Cayma|Fatura|Paket|Şikayet|Genel","oncelik":"Düşük|Orta|Yüksek"}`;

          const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${GROQ_KEY}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              model: 'llama-3.3-70b-versatile',
              messages: [{ role: 'user', content: prompt }],
              response_format: { type: 'json_object' },
              temperature: 0.2,
            }),
          });
          const data   = await res.json();
          const parsed = JSON.parse(data.choices[0].message.content);
          setForm((prev) => ({
            ...prev,
            musteriTalebi:   parsed.musteriTalebi   || '',
            yapilanIslem:    parsed.yapilanIslem     || '',
            sonuc:           parsed.sonuc            || 'Beklemede',
            onerilenAksiyon: parsed.onerilenAksiyon  || '',
            kategori:        parsed.kategori         || 'Genel',
            oncelik:         parsed.oncelik          || 'Orta',
          }));
          setSource('groq');
          setLoading(false);
          return;
        } catch {
          // Groq başarısız → local analiz
        }
      }

      // Local fallback
      setForm((prev) => ({ ...prev, ...analyzeLocally(maskedTranscript, customer) }));
      setSource('local');
      setLoading(false);
    }
    generate();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const update = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const score = calcScore(lines, form);
  const scoreCfg = score >= 75
    ? { color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200', label: 'Mükemmel' }
    : score >= 50
    ? { color: 'text-amber-600',   bg: 'bg-amber-50 border-amber-200',     label: 'İyi' }
    : { color: 'text-red-600',     bg: 'bg-red-50 border-red-200',         label: 'Geliştirilmeli' };

  const handleSave = () => {
    const text = `ÇAĞRI FORMU\n${'─'.repeat(40)}\nMüşteri: ${customer?.ad || '—'} | ${customer?.paket || '—'}\nKategori: ${form.kategori} | Öncelik: ${form.oncelik} | Skor: ${score}/100\n\nMüşteri Talebi:\n${form.musteriTalebi}\n\nYapılan İşlem:\n${form.yapilanIslem}\n\nSonuç: ${form.sonuc}\n\nÖnerilen Aksiyon:\n${form.onerilenAksiyon}\n\nCRM Notu:\n${form.crmNotu}`;
    navigator.clipboard?.writeText(text);
    onSave(form, score);
  };

  const oncelikColor = { Düşük: 'text-emerald-600 bg-emerald-50 border-emerald-200', Orta: 'text-amber-600 bg-amber-50 border-amber-200', Yüksek: 'text-red-600 bg-red-50 border-red-200' };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-3xl shadow-2xl shadow-indigo-200 w-full max-w-2xl border border-indigo-100 flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-7 pt-7 pb-5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-vox-600 flex items-center justify-center shadow-md shadow-indigo-500/20">
              <ClipboardList className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-bold text-slate-800">Çağrı Formu</h2>
              <p className="text-xs text-slate-400">
                {!source ? 'Analiz ediliyor...' : 'Her alanı düzenleyebilirsiniz'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 ml-auto">
            {!loading && (
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold ${scoreCfg.bg} ${scoreCfg.color}`}>
                <Award className="w-3.5 h-3.5" />
                {score}/100 · {scoreCfg.label}
              </div>
            )}
            {customer && (
              <div className="flex items-center gap-2 bg-indigo-50 border border-indigo-100 rounded-xl px-3 py-1.5">
                <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-safe-500 to-vox-600 flex items-center justify-center text-white text-xs font-bold">
                  {customer.ad[0]}
                </div>
                <span className="text-xs font-semibold text-slate-700">{customer.ad}</span>
              </div>
            )}
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-7 py-5 space-y-4">
          {loading ? (
            <div className="flex flex-col items-center gap-3 py-16">
              <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
              <p className="text-sm text-slate-500">Görüşme analiz ediliyor...</p>
              <p className="text-xs text-slate-400">Görüşme analiz ediliyor...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center gap-3 py-16">
              <div className="w-12 h-12 rounded-2xl bg-red-50 border border-red-200 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-500" />
              </div>
              <p className="text-sm font-semibold text-red-600">Analiz başarısız</p>
              <p className="text-xs text-slate-500 text-center max-w-xs">{error}</p>
              <p className="text-xs text-slate-400">Alanları manuel olarak doldurup kaydedebilirsiniz.</p>
            </div>
          ) : (
            <>
              {/* Meta satırı */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Kategori</label>
                  <select value={form.kategori} onChange={update('kategori')}
                    className="w-full text-sm bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20 transition">
                    {KATEGORI_OPTIONS.map((o) => <option key={o}>{o}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Sonuç</label>
                  <select value={form.sonuc} onChange={update('sonuc')}
                    className="w-full text-sm bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20 transition">
                    {SONUC_OPTIONS.map((o) => <option key={o}>{o}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Öncelik</label>
                  <select value={form.oncelik} onChange={update('oncelik')}
                    className={`w-full text-sm border rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400/20 transition font-semibold ${oncelikColor[form.oncelik]}`}>
                    {ONCELIK_OPTIONS.map((o) => <option key={o}>{o}</option>)}
                  </select>
                </div>
              </div>

              {/* Müşteri Talebi */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Müşteri Talebi</label>
                <input value={form.musteriTalebi} onChange={update('musteriTalebi')}
                  className="w-full text-sm bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20 transition text-slate-800"
                  placeholder="Müşterinin ana talebi..." />
              </div>

              {/* Yapılan İşlem */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Yapılan İşlem</label>
                <textarea value={form.yapilanIslem} onChange={update('yapilanIslem')} rows={3}
                  className="w-full text-sm bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 resize-none focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20 transition text-slate-800"
                  placeholder="Yapılan veya önerilen işlem..." />
              </div>

              {/* Önerilen Aksiyon */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Önerilen Aksiyon</label>
                <input value={form.onerilenAksiyon} onChange={update('onerilenAksiyon')}
                  className="w-full text-sm bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20 transition text-slate-800"
                  placeholder="Sonraki adım (varsa)..." />
              </div>

              {/* CRM Notu */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                  CRM Notu
                  <span className="ml-1.5 normal-case font-normal text-amber-500">(müşteri kaydına işlenecek)</span>
                </label>
                <textarea value={form.crmNotu} onChange={update('crmNotu')} rows={2}
                  className="w-full text-sm bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 resize-none focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 transition text-amber-800"
                  placeholder="CRM'e not ekle..." />
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-7 pb-7 pt-4 border-t border-slate-100">
          <button onClick={onClose}
            className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50 transition">
            İptal
          </button>
          <button onClick={handleSave} disabled={loading}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-vox-600 text-white text-sm font-semibold shadow-md shadow-indigo-500/25 hover:from-indigo-400 hover:to-vox-500 transition disabled:opacity-50">
            <CheckCircle2 className="w-4 h-4" />
            Onayla & Kaydet
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Ana Sayfa ─────────────────────────────────────────────────────────────────
export default function LiveAssistPage() {
  const [isListening, setIsListening]     = useState(false);
  const [transcript, setTranscript]       = useState('');
  const [interim, setInterim]             = useState('');
  const [customer, setCustomer]           = useState(null);
  const [notes, setNotes]                 = useState('');
  const [activePanels, setActivePanels]   = useState([]);
  const [manualQuery, setManualQuery]     = useState('');
  const [callActive, setCallActive]       = useState(false);
  const [showSummary, setShowSummary]     = useState(false);
  const [lines, setLines]                 = useState([]);
  const [history, setHistory]             = useState(getHistory);
  const [showHistory, setShowHistory]     = useState(false);
  const recognitionRef                    = useRef(null);
  const demoTimersRef                     = useRef([]);
  const transcriptRef                     = useRef('');
  const scrollRef                         = useRef(null);

  // TC / telefon / isim tespiti
  useEffect(() => {
    const full = transcript + interim;
    if (!customer) {
      const tc    = extractTC(full);
      const phone = extractPhone(full);
      const found = tc         ? lookupCustomer(tc)
                  : phone      ? lookupCustomer(phone)
                  : findCustomerByName(full);
      if (found) { setCustomer(found); setNotes(found.notlar || ''); }
    }
    const panels = detectPanels(full);
    setActivePanels(panels);
  }, [transcript, interim, customer]);


  const startCall = useCallback(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    const rec = new SR();
    rec.lang = 'tr-TR';
    rec.continuous = true;
    rec.interimResults = true;
    let buffer = transcriptRef.current;
    rec.onresult = (e) => {
      let final = '', intr = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) final += t + ' ';
        else intr += t;
      }
      if (final) {
        buffer += final;
        transcriptRef.current = buffer;
        setTranscript(buffer);
        setInterim('');
        const emotion  = detectEmotion(final);
        const masked   = maskPII(final.trim());
        const sgsRisk  = checkSGSRisk(final, customer);
        setLines((prev) => [...prev, { text: masked, emotion, raw: final.trim(), sgsRisk }]);
        setTimeout(() => scrollRef.current?.scrollTo({ top: 9999, behavior: 'smooth' }), 50);
      } else {
        setInterim(intr);
      }
    };
    rec.onerror = () => setIsListening(false);
    rec.onend   = () => setIsListening(false);
    recognitionRef.current = rec;
    rec.start();
    setIsListening(true);
    setCallActive(true);
  }, []);

  const pauseCall = useCallback(() => {
    recognitionRef.current?.stop();
    setIsListening(false);
  }, []);

  const stopCall = useCallback(() => {
    recognitionRef.current?.stop();
    setIsListening(false);
    setShowSummary(true);
  }, []);

  const resetCall = () => {
    recognitionRef.current?.stop();
    demoTimersRef.current.forEach(clearTimeout);
    demoTimersRef.current = [];
    setTranscript('');
    setInterim('');
    setCustomer(null);
    setNotes('');
    setActivePanels([]);
    setLines([]);
    setCallActive(false);
    setShowSummary(false);
    transcriptRef.current = '';
  };

  const startDemo = () => {
    resetCall();
    setCallActive(true);
    DEMO_LINES.forEach(({ text }, i) => {
      const t = setTimeout(() => {
        const emotion  = detectEmotion(text);
        const masked   = maskPII(text);
        const sgsRisk  = checkSGSRisk(text, null);
        transcriptRef.current += text + ' ';
        setTranscript(transcriptRef.current);
        setInterim('');
        setLines((prev) => [...prev, { text: masked, emotion, raw: text, sgsRisk }]);
        setTimeout(() => scrollRef.current?.scrollTo({ top: 9999, behavior: 'smooth' }), 50);
      }, i * 1600);
      demoTimersRef.current.push(t);
    });
  };

  const handleManualLookup = (e) => {
    e.preventDefault();
    const found = lookupCustomer(manualQuery);
    if (found) { setCustomer(found); setNotes(found.notlar || ''); setManualQuery(''); }
  };

  const panelComponents = {
    cayma:   customer && <CaymaPanel   key="cayma"   customer={customer} />,
    fatura:  customer && <FaturaPanel  key="fatura"  customer={customer} />,
    paket:   customer && <PaketPanel   key="paket"   customer={customer} />,
    sadakat: customer && <SadakatPanel key="sadakat" customer={customer} />,
    sikayet: customer && <SikayetPanel key="sikayet" customer={customer} />,
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-slate-50 font-sans">

      {/* ── Header ── */}
      <div className="border-b border-indigo-100 bg-white/80 backdrop-blur-md sticky top-0 z-20 shadow-sm shadow-indigo-50">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-safe-500 to-vox-600 flex items-center justify-center shadow-md shadow-safe-500/20">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-slate-800 leading-none">Live Assist</h1>
              <p className="text-xs text-slate-400 mt-0.5">Gerçek zamanlı müşteri asistanı</p>
            </div>
          </div>

          {/* Çağrı durumu */}
          <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-100 border border-slate-200">
            <motion.div
              className={`w-2 h-2 rounded-full ${isListening ? 'bg-red-500' : callActive ? 'bg-amber-400' : 'bg-slate-400'}`}
              animate={isListening ? { scale: [1, 1.4, 1] } : {}}
              transition={{ duration: 0.8, repeat: Infinity }}
            />
            <span className="text-xs font-medium text-slate-600">
              {isListening ? 'Dinleniyor' : callActive ? 'Duraklatıldı' : 'Hazır'}
            </span>
            {callActive && <CallTimer active={isListening} />}
          </div>

          {/* Manuel arama */}
          <form onSubmit={handleManualLookup} className="flex items-center gap-2 ml-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                value={manualQuery}
                onChange={(e) => setManualQuery(e.target.value)}
                placeholder="TC veya telefon no..."
                className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-safe-400 focus:ring-2 focus:ring-safe-400/20 w-44 transition"
              />
            </div>
            <button type="submit"
              className="text-xs px-3 py-1.5 bg-safe-500 text-white rounded-xl hover:bg-safe-600 transition font-medium">
              Ara
            </button>
          </form>

          {/* Demo müşteri hızlı seç */}
          <div className="flex items-center gap-1.5 ml-auto">
            <span className="text-xs text-slate-400">Demo:</span>
            {[
              { tc: '12345678901', label: 'Ahmet' },
              { tc: '98765432109', label: 'Fatma' },
              { tc: '11223344556', label: 'Mehmet' },
              { tc: '55667788990', label: 'Zeynep' },
            ].map(({ tc, label }) => (
              <button key={tc} onClick={() => { const f = lookupCustomer(tc); setCustomer(f); setNotes(f?.notlar || ''); }}
                className="text-xs px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-600 rounded-lg transition font-medium">
                {label}
              </button>
            ))}
          </div>

          {/* Geçmiş butonu */}
          <button
            onClick={() => setShowHistory((v) => !v)}
            className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl border font-medium transition ml-2 ${
              showHistory
                ? 'bg-indigo-500 border-indigo-500 text-white shadow-md shadow-indigo-500/25'
                : 'bg-white border-slate-200 text-slate-600 hover:border-indigo-300 hover:text-indigo-600'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            Geçmiş
            {history.length > 0 && (
              <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ml-0.5 ${
                showHistory ? 'bg-white/20 text-white' : 'bg-indigo-100 text-indigo-600'
              }`}>{history.length}</span>
            )}
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        <DashboardCards history={history} />
        <div className="grid grid-cols-[1fr_400px] gap-6 h-[calc(100vh-200px)]">

          {/* ── Sol: Transkript ── */}
          <div className="flex flex-col gap-4">

            {/* Transkript kutusu */}
            <div className="flex-1 bg-white border border-indigo-100 rounded-2xl shadow-md shadow-indigo-50 flex flex-col overflow-hidden">
              <div className="px-5 py-4 border-b border-indigo-50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Mic className="w-4 h-4 text-slate-400" />
                  <span className="text-sm font-semibold text-slate-700">Canlı Transkript</span>
                </div>
                {lines.length > 0 && (
                  <span className="text-xs text-slate-400">{lines.length} cümle</span>
                )}
              </div>

              <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 space-y-2">
                {lines.length === 0 && !interim && (
                  <div className="h-full flex flex-col items-center justify-center gap-3 text-center">
                    <div className="w-16 h-16 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center">
                      <Phone className="w-7 h-7 text-indigo-300" />
                    </div>
                    <p className="text-sm text-slate-400 max-w-xs">
                      Çağrıyı başlatın. Müşteri konuşmaya başladığında transkript burada görünür.
                    </p>
                    <p className="text-xs text-slate-300">TC veya telefon numarası tespit edildiğinde müşteri kartı otomatik açılır.</p>
                  </div>
                )}

                <AnimatePresence initial={false}>
                  {lines.map((line, i) => {
                    const meta = EMOTION_META[line.emotion];
                    return (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex items-start gap-2"
                      >
                        {/* Duygu emoji */}
                        <span className={`text-base flex-shrink-0 mt-1.5 ${meta.color}`} title={line.emotion}>
                          {meta.emoji}
                        </span>
                        <div className="flex-1">
                          <p className={`text-sm text-slate-700 leading-relaxed rounded-xl px-4 py-2 border ${meta.bg}`}>
                            {line.text.split(/(\[TC GİZLENDİ\]|\[TEL GİZLENDİ\]|\[KART GİZLENDİ\])/g).map((part, j) =>
                              part.startsWith('[') && part.endsWith(']') ? (
                                <span key={j} className="inline-flex items-center gap-1 bg-safe-100 text-safe-700 text-xs font-semibold px-2 py-0.5 rounded-md border border-safe-200 mx-0.5">
                                  <ShieldCheck className="w-3 h-3" />{part}
                                </span>
                              ) : part
                            )}
                          </p>
                          {line.sgsRisk && (
                            <motion.div
                              initial={{ opacity: 0, y: -4 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="mt-1 flex items-center gap-1.5 text-xs text-red-600 font-semibold bg-red-50 border border-red-200 rounded-lg px-3 py-1.5"
                            >
                              <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                              <span>SGS Riski: {line.sgsRisk}</span>
                            </motion.div>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>

                {interim && (
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-safe-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Mic className="w-3 h-3 text-safe-500" />
                    </div>
                    <p className="text-sm text-slate-500 italic bg-safe-50 rounded-xl px-4 py-2 flex-1 border border-safe-100">
                      {interim}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Çağrı kontrolleri */}
            <div className="flex items-center gap-3">
              {!callActive ? (
                <>
                  <button onClick={startCall}
                    className="flex-1 flex items-center justify-center gap-3 py-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-bold text-sm shadow-lg shadow-emerald-500/25 hover:from-emerald-400 hover:to-teal-400 transition-all active:scale-95">
                    <Mic className="w-5 h-5" />
                    Çağrıyı Başlat
                  </button>
                  <button onClick={startDemo}
                    className="flex items-center gap-2 px-5 py-4 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-600 font-bold text-sm hover:bg-indigo-100 hover:border-indigo-300 transition-all active:scale-95">
                    <Play className="w-4 h-4" />
                    Demo
                  </button>
                </>
              ) : (
                <>
                  <button onClick={isListening ? pauseCall : startCall}
                    className={`flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl text-white font-bold text-sm shadow-lg transition-all active:scale-95 ${
                      isListening
                        ? 'bg-amber-500 hover:bg-amber-400 shadow-amber-500/25'
                        : 'bg-emerald-500 hover:bg-emerald-400 shadow-emerald-500/25'
                    }`}>
                    {isListening ? <><MicOff className="w-5 h-5" /> Duraklat</> : <><Mic className="w-5 h-5" /> Devam</>}
                  </button>
                  <button onClick={stopCall}
                    className="flex items-center gap-2 px-6 py-4 rounded-2xl bg-red-500 hover:bg-red-400 text-white font-bold text-sm shadow-lg shadow-red-500/25 transition-all active:scale-95">
                    <PhoneOff className="w-5 h-5" />
                    Bitir & Özetle
                  </button>
                  <button onClick={resetCall}
                    className="px-4 py-4 rounded-2xl bg-white border border-slate-200 text-slate-500 hover:text-slate-700 hover:border-slate-300 transition-all">
                    ↺
                  </button>
                </>
              )}
            </div>
          </div>

          {/* ── Sağ: Müşteri Paneli ── */}
          <div className="overflow-y-auto space-y-4 pb-2">

            {/* Müşteri bulunamadı placeholder */}
            {!customer && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-white border border-indigo-100 rounded-2xl p-8 text-center shadow-md shadow-indigo-50"
              >
                <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center mx-auto mb-4">
                  <User className="w-7 h-7 text-indigo-300" />
                </div>
                <p className="text-sm font-semibold text-slate-600 mb-1">Müşteri Bekleniyor</p>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Müşteri TC kimlik veya telefon numarasını söylediğinde profil otomatik açılır.
                </p>
                <div className="mt-4 space-y-2">
                  {['12345678901', '05321234567', 'Ahmet Yılmaz', 'Fatma Kaya'].map((hint) => (
                    <p key={hint} className="text-xs text-indigo-400 font-mono bg-indigo-50 rounded-lg py-1.5">{hint}</p>
                  ))}
                  <p className="text-xs text-slate-300 mt-1">TC · Telefon · veya isim söylenince açılır</p>
                </div>
              </motion.div>
            )}

            {/* Müşteri kartı */}
            <AnimatePresence>
              {customer && (
                <CustomerCard
                  customer={customer}
                  notes={notes}
                  onNotesChange={setNotes}
                />
              )}
            </AnimatePresence>

            {/* Akıllı paneller */}
            <AnimatePresence>
              {activePanels.map((p) => (
                <motion.div key={p} layout>
                  {panelComponents[p]}
                </motion.div>
              ))}
            </AnimatePresence>

            {/* Keyword yoksa ipucu */}
            {customer && activePanels.length === 0 && (
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-center">
                <p className="text-xs text-slate-400">
                  Müşteri <strong>cayma</strong>, <strong>fatura</strong>, <strong>paket</strong> veya <strong>şikayet</strong> dediğinde ilgili panel otomatik açılır.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Geçmiş Paneli ── */}
      <AnimatePresence>
        {showHistory && (
          <HistoryPanel history={history} onClose={() => setShowHistory(false)} />
        )}
      </AnimatePresence>

      {/* ── Özet Modal ── */}
      <AnimatePresence>
        {showSummary && (
          <CallFormModal
            lines={lines}
            customer={customer}
            notes={notes}
            onSave={(form, score) => {
              saveToHistory({
                id: Date.now(),
                date: new Date().toISOString(),
                customer: customer?.ad || 'Bilinmeyen',
                ...form,
                score,
              });
              setHistory(getHistory());
              setShowSummary(false);
              resetCall();
            }}
            onClose={() => { setShowSummary(false); resetCall(); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
