import { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldCheck, Copy, Trash2, Eye, EyeOff, ToggleLeft, ToggleRight,
  CreditCard, Phone, User, AlertCircle, CheckCircle2, ChevronDown,
} from 'lucide-react';
import { maskSensitiveData, highlightSensitiveData } from '../utils/kvkkMasker';

const SAMPLE_TEXT = `Müşteri Adı: Ahmet Yılmaz
TC Kimlik No: 34521678904
Telefon: 0532 123 45 67
İkinci İletişim: +90 216 444 55 66

Görüşme Özeti:
Sayın Mehmet Demir bugün saat 14:30'da aradı. TC no 85236547896 olan
müşterimiz fatura konusunda yardım istedi. 05321234567 numarasından
ulaşılabilir. Zeynep Kaya da aynı konuyu 0312 555 44 33 numarasından iletti.`;

export default function MaskingToolPage() {
  const [inputText, setInputText] = useState('');
  const [options, setOptions] = useState({
    maskTCEnabled: true,
    maskPhoneEnabled: true,
    maskNamesEnabled: true,
  });
  const [viewMode, setViewMode] = useState('split'); // 'split' | 'highlight'
  const [copied, setCopied] = useState(false);
  const [showStats, setShowStats] = useState(true);

  const result = useMemo(() => {
    if (!inputText.trim()) return null;
    return maskSensitiveData(inputText, options);
  }, [inputText, options]);

  const highlightedHtml = useMemo(() => {
    if (!inputText.trim() || !result) return '';
    return highlightSensitiveData(inputText, result.findings);
  }, [inputText, result]);

  const handleCopy = useCallback(async () => {
    if (!result?.maskedText) return;
    await navigator.clipboard.writeText(result.maskedText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [result]);

  const toggleOption = (key) =>
    setOptions((prev) => ({ ...prev, [key]: !prev[key] }));

  const loadSample = () => setInputText(SAMPLE_TEXT);
  const clearAll = () => setInputText('');

  const stats = result?.stats ?? { tc: 0, phone: 0, name: 0, total: 0 };
  const hasInput = inputText.trim().length > 0;

  return (
    <div className="min-h-screen bg-dark-900 text-slate-800 font-sans">
      {/* Header */}
      <div className="border-b border-indigo-100 bg-dark-800/60 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-safe-500 to-vox-600 flex items-center justify-center shadow-lg shadow-safe-500/20">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-display font-bold text-slate-800 leading-none">
                KVKK Maskeleme
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">TC · Telefon · İsim Soyisim</p>
            </div>
          </div>

          {/* Seçenekler */}
          <div className="flex items-center gap-2">
            <OptionToggle
              icon={<CreditCard className="w-3.5 h-3.5" />}
              label="TC"
              active={options.maskTCEnabled}
              color="red"
              onClick={() => toggleOption('maskTCEnabled')}
            />
            <OptionToggle
              icon={<Phone className="w-3.5 h-3.5" />}
              label="Telefon"
              active={options.maskPhoneEnabled}
              color="yellow"
              onClick={() => toggleOption('maskPhoneEnabled')}
            />
            <OptionToggle
              icon={<User className="w-3.5 h-3.5" />}
              label="İsim"
              active={options.maskNamesEnabled}
              color="blue"
              onClick={() => toggleOption('maskNamesEnabled')}
            />
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-4">

        {/* Stats */}
        <AnimatePresence>
          {hasInput && result && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="grid grid-cols-2 md:grid-cols-4 gap-3"
            >
              <StatCard
                icon={<AlertCircle className="w-4 h-4" />}
                label="Toplam Tespit"
                value={stats.total}
                color="purple"
                highlight
              />
              <StatCard
                icon={<CreditCard className="w-4 h-4" />}
                label="TC Kimlik"
                value={stats.tc}
                color="red"
              />
              <StatCard
                icon={<Phone className="w-4 h-4" />}
                label="Telefon"
                value={stats.phone}
                color="yellow"
              />
              <StatCard
                icon={<User className="w-4 h-4" />}
                label="İsim"
                value={stats.name}
                color="blue"
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Araç çubuğu */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <button
              onClick={loadSample}
              className="px-3 py-1.5 text-xs font-medium text-slate-500 bg-indigo-50/60 hover:bg-indigo-50 border border-indigo-100 rounded-lg transition-colors"
            >
              Örnek Yükle
            </button>
            <button
              onClick={clearAll}
              disabled={!hasInput}
              className="px-3 py-1.5 text-xs font-medium text-slate-400 hover:text-red-400 bg-indigo-50/60 hover:bg-red-500/10 border border-indigo-100 hover:border-red-500/30 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Temizle
            </button>
          </div>

          <div className="flex items-center gap-2">
            {/* Görünüm modu */}
            <div className="flex items-center bg-indigo-50/60 border border-indigo-100 rounded-lg p-0.5 text-xs">
              <button
                onClick={() => setViewMode('split')}
                className={`px-3 py-1.5 rounded-md transition-colors font-medium ${
                  viewMode === 'split'
                    ? 'bg-indigo-50 text-slate-800'
                    : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                Yan Yana
              </button>
              <button
                onClick={() => setViewMode('highlight')}
                className={`px-3 py-1.5 rounded-md transition-colors font-medium flex items-center gap-1 ${
                  viewMode === 'highlight'
                    ? 'bg-indigo-50 text-slate-800'
                    : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                <Eye className="w-3 h-3" />
                Vurgula
              </button>
            </div>

            <button
              onClick={handleCopy}
              disabled={!result?.maskedText}
              className="px-3 py-1.5 text-xs font-medium text-slate-800 bg-gradient-to-r from-safe-600 to-vox-600 hover:opacity-90 rounded-lg transition-all flex items-center gap-1.5 disabled:opacity-30 disabled:cursor-not-allowed shadow-lg shadow-safe-500/20"
            >
              {copied ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Kopyalandı!
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  Maskeliyi Kopyala
                </>
              )}
            </button>
          </div>
        </div>

        {/* Ana içerik alanı */}
        {viewMode === 'split' ? (
          <div className="grid md:grid-cols-2 gap-4">
            {/* Giriş */}
            <div className="flex flex-col">
              <label className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <EyeOff className="w-3.5 h-3.5" />
                Ham Metin
              </label>
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Çağrı görüşme metnini buraya yapıştırın...&#10;&#10;TC kimlik, telefon ve isimler otomatik tespit edilir."
                className="flex-1 min-h-[420px] w-full bg-dark-800 border border-indigo-100 rounded-xl p-4 text-sm text-slate-700 placeholder:text-slate-400 resize-none focus:outline-none focus:border-safe-500/50 focus:ring-1 focus:ring-safe-500/20 font-mono leading-relaxed transition-colors"
              />
              <p className="text-xs text-slate-400 mt-2 text-right">
                {inputText.length} karakter
              </p>
            </div>

            {/* Çıkış */}
            <div className="flex flex-col">
              <label className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-safe-400" />
                Maskeli Metin
                {result && stats.total > 0 && (
                  <span className="ml-auto text-safe-400 font-medium">
                    {stats.total} veri maskelendi
                  </span>
                )}
              </label>
              <div className="flex-1 min-h-[420px] bg-dark-800 border border-indigo-100 rounded-xl p-4 text-sm text-slate-700 font-mono leading-relaxed overflow-auto whitespace-pre-wrap">
                {result?.maskedText ? (
                  <span className="text-green-700">{result.maskedText}</span>
                ) : (
                  <span className="text-slate-400">
                    {hasInput ? 'İşleniyor...' : 'Maskeli metin burada görünecek'}
                  </span>
                )}
              </div>
              {result && (
                <p className="text-xs text-slate-400 mt-2 text-right">
                  {result.maskedText.length} karakter
                </p>
              )}
            </div>
          </div>
        ) : (
          /* Vurgulama modu */
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-xs flex-wrap">
              <span className="text-slate-400">Renk anahtarı:</span>
              <span className="px-2 py-0.5 rounded bg-red-100 border border-red-300 text-red-700">TC Kimlik</span>
              <span className="px-2 py-0.5 rounded bg-yellow-100 border border-yellow-300 text-yellow-800">Telefon</span>
              <span className="px-2 py-0.5 rounded bg-blue-100 border border-blue-300 text-blue-700">İsim</span>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2 block">
                  Giriş
                </label>
                <textarea
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Metni buraya yazın..."
                  className="w-full min-h-[420px] bg-dark-800 border border-indigo-100 rounded-xl p-4 text-sm text-slate-700 placeholder:text-slate-400 resize-none focus:outline-none focus:border-safe-500/50 font-mono leading-relaxed transition-colors"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2 block">
                  Tespit Edilenler Vurgulandı
                </label>
                <div
                  className="w-full min-h-[420px] bg-dark-800 border border-indigo-100 rounded-xl p-4 text-sm font-mono leading-relaxed overflow-auto"
                  dangerouslySetInnerHTML={{
                    __html: highlightedHtml || '<span class="text-slate-400">Vurgulama burada görünecek</span>',
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Tespit listesi */}
        <AnimatePresence>
          {result && result.findings.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="bg-dark-800 border border-indigo-100 rounded-xl overflow-hidden"
            >
              <button
                onClick={() => setShowStats(!showStats)}
                className="w-full flex items-center justify-between px-5 py-3 text-sm font-medium text-slate-600 hover:text-slate-800 transition-colors"
              >
                <span>Tespit Edilen Veriler ({result.findings.length})</span>
                <ChevronDown
                  className={`w-4 h-4 transition-transform ${showStats ? 'rotate-180' : ''}`}
                />
              </button>
              <AnimatePresence>
                {showStats && (
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: 'auto' }}
                    exit={{ height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="border-t border-indigo-100 divide-y divide-white/5">
                      {result.findings.map((f, i) => (
                        <div
                          key={i}
                          className="flex items-center gap-4 px-5 py-3 text-sm hover:bg-white/3 transition-colors"
                        >
                          <TypeBadge type={f.type} label={f.label} />
                          <code className="text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded text-xs font-mono flex-1">
                            {f.original}
                          </code>
                          <span className="text-slate-400">→</span>
                          <code className="text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded text-xs font-mono flex-1">
                            {f.masked}
                          </code>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Boş durum */}
        {!hasInput && (
          <div className="text-center py-16 text-slate-400">
            <ShieldCheck className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p className="text-sm">Metni yapıştırın veya "Örnek Yükle"ye tıklayın</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Alt Bileşenler ───────────────────────────────────────────────────────────

function OptionToggle({ icon, label, active, color, onClick }) {
  const colorMap = {
    red: active ? 'bg-red-100 border-red-300 text-red-700' : 'bg-indigo-50/60 border-indigo-100 text-slate-400',
    yellow: active ? 'bg-yellow-100 border-yellow-300 text-yellow-800' : 'bg-indigo-50/60 border-indigo-100 text-slate-400',
    blue: active ? 'bg-blue-100 border-blue-300 text-blue-700' : 'bg-indigo-50/60 border-indigo-100 text-slate-400',
  };
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all ${colorMap[color]}`}
    >
      {icon}
      {label}
    </button>
  );
}

function StatCard({ icon, label, value, color, highlight }) {
  const colorMap = {
    purple: 'text-vox-600 bg-vox-500/10 border-vox-500/20',
    red: 'text-red-600 bg-red-50 border-red-200',
    yellow: 'text-yellow-700 bg-yellow-50 border-yellow-200',
    blue: 'text-blue-600 bg-blue-50 border-blue-200',
  };
  return (
    <div className={`rounded-xl border p-4 ${colorMap[color]} ${highlight ? 'ring-1 ring-vox-500/20' : ''}`}>
      <div className="flex items-center gap-2 mb-1">
        <span className="opacity-70">{icon}</span>
        <span className="text-xs opacity-70 font-medium">{label}</span>
      </div>
      <p className="text-2xl font-display font-bold">{value}</p>
    </div>
  );
}

function TypeBadge({ type, label }) {
  const map = {
    TC: 'bg-red-100 text-red-700 border-red-300',
    PHONE: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    NAME: 'bg-blue-100 text-blue-700 border-blue-300',
  };
  return (
    <span className={`px-2 py-0.5 rounded border text-xs font-medium ${map[type]}`}>
      {label}
    </span>
  );
}
