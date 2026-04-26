import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mic, MapPin, Phone, CheckCircle2, Brain,
  Volume2, Wifi, RefreshCw,
} from 'lucide-react';

// ── Mock Çağrı Senaryoları ────────────────────────────────────────────────────
const SCENARIOS = [
  {
    caller:   'Mehmet Karaçay',
    location: 'Trabzon',
    dialect:  'Karadeniz',
    flag:     '🌊',
    emotion:  { label: 'Sinirli', emoji: '😠', color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/25' },
    lines: [
      {
        raw:        'Hee ya bi bak şu işe, faturam gelmemiş gene, ne biçim iş böyle ya',
        normalized: 'Faturam bu ay da gelmedi, bu nasıl bir hizmet?',
        confidence: 91,
      },
      {
        raw:        'Geçen ay da öyle olmuştu, sen olmasan kim düzeldicek, ha?',
        normalized: 'Geçen ay da aynı sorun yaşandı, bu defalarca tekrar ediyor.',
        confidence: 88,
      },
      {
        raw:        'Tamam tamam hocam, sen bi hallet de, Allah razı olsun',
        normalized: 'Tamam, lütfen sorunu çözün, teşekkür ederim.',
        confidence: 96,
      },
    ],
  },
  {
    caller:   'Memo Aslan',
    location: 'Şanlıurfa',
    dialect:  'Kürtçe Etkili',
    flag:     '🌙',
    emotion:  { label: 'Endişeli', emoji: '😟', color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/25' },
    lines: [
      {
        raw:        'Heval, mesajım gitmedi yani, annem de arayamıyo beni',
        normalized: 'Arkadaşım, mesajım iletilmedi, annem de beni arayamıyor.',
        confidence: 74,
      },
      {
        raw:        'Hat her gün kesiliyo, her roj böyle, ne yapayım bilmiyom',
        normalized: 'Hat her gün kesiliyor, her gün aynı sorun, ne yapacağımı bilmiyorum.',
        confidence: 71,
      },
      {
        raw:        'Baş e heval, memnun kaldım, teşekkürler',
        normalized: 'Tamam, memnun kaldım, teşekkürler.',
        confidence: 89,
      },
    ],
  },
  {
    caller:   'Vasile Moldovan',
    location: 'Romanya (Yabancı)',
    dialect:  'Yabancı Aksanlı',
    flag:     '🌍',
    emotion:  { label: 'Çaresiz', emoji: '😓', color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/25' },
    lines: [
      {
        raw:        'Ben isterim konuşmak müşteri hizmet, numara çalışmıyor benim',
        normalized: 'Müşteri hizmetleriyle görüşmek istiyorum, numaram çalışmıyor.',
        confidence: 82,
      },
      {
        raw:        'Üç gün oldu, ben yapmak ödeme ama hat açılmadı hâlâ',
        normalized: 'Üç gün önce ödeme yaptım ancak hatım hâlâ açılmadı.',
        confidence: 79,
      },
      {
        raw:        'Tamam, anladım, sen çok iyi insan, teşekkürler',
        normalized: 'Tamam, anladım, çok teşekkür ederim.',
        confidence: 97,
      },
    ],
  },
];

// ── Typing animasyonu hook ────────────────────────────────────────────────────
function useTyping(text, speed = 38, startDelay = 0) {
  const [displayed, setDisplayed] = useState('');
  const [done, setDone]           = useState(false);

  useEffect(() => {
    setDisplayed('');
    setDone(false);
    let i = 0;
    let timer;
    const start = setTimeout(() => {
      timer = setInterval(() => {
        i++;
        setDisplayed(text.slice(0, i));
        if (i >= text.length) { clearInterval(timer); setDone(true); }
      }, speed);
    }, startDelay);
    return () => { clearTimeout(start); clearInterval(timer); };
  }, [text, speed, startDelay]);

  return { displayed, done };
}

// ── Ses dalgası ───────────────────────────────────────────────────────────────
function Waveform({ active }) {
  const bars = [3, 6, 9, 5, 12, 7, 10, 4, 8, 6, 11, 5, 9, 7, 4];
  return (
    <div className="flex items-center gap-0.5 h-8">
      {bars.map((h, i) => (
        <motion.div
          key={i}
          className="w-1 rounded-full bg-gradient-to-t from-safe-500 to-vox-400"
          animate={active
            ? { height: [h * 2, h * 3.5, h * 1.5, h * 4, h * 2] }
            : { height: 4 }}
          transition={{ duration: 0.6, repeat: active ? Infinity : 0, delay: i * 0.04, ease: 'easeInOut' }}
        />
      ))}
    </div>
  );
}

// ── Tek satır altyazı kutusu ──────────────────────────────────────────────────
function SubtitleLine({ line, index, isActive, isDone }) {
  const rawTyping  = useTyping(line.raw,        36, 0);
  const normTyping = useTyping(line.normalized, 30, line.raw.length * 36 + 600);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className={`rounded-2xl border overflow-hidden transition-all ${
        isActive
          ? 'bg-dark-700/80 border-safe-500/30 shadow-lg shadow-safe-500/5'
          : isDone
          ? 'bg-dark-800/40 border-indigo-100'
          : 'bg-dark-800/20 border-indigo-100 opacity-40'
      }`}
    >
      {/* Ham ses (dialect) */}
      <div className="px-4 pt-3 pb-2">
        <div className="flex items-center gap-1.5 mb-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Müşteri Sesi</span>
          {isActive && rawTyping.done && (
            <span className="ml-auto text-[10px] text-safe-400 font-mono">%{line.confidence} güven</span>
          )}
        </div>
        <p className="text-sm text-slate-600 font-medium min-h-[20px] leading-relaxed">
          {isActive ? (
            <>
              {rawTyping.displayed}
              {!rawTyping.done && <span className="inline-block w-0.5 h-4 bg-indigo-50/600 ml-0.5 animate-pulse align-middle" />}
            </>
          ) : isDone ? (
            <span className="text-slate-400">{line.raw}</span>
          ) : null}
        </p>
      </div>

      {/* Normalize edilmiş */}
      <AnimatePresence>
        {isActive && rawTyping.done && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, delay: 0.3 }}
            className="border-t border-indigo-100 px-4 py-2.5 bg-safe-500/5"
          >
            <div className="flex items-center gap-1.5 mb-1">
              <CheckCircle2 className="w-3 h-3 text-safe-400" />
              <span className="text-[10px] font-semibold text-safe-400 uppercase tracking-wider">Normalize Edildi</span>
            </div>
            <p className="text-sm text-slate-800 font-medium leading-relaxed min-h-[20px]">
              {normTyping.displayed}
              {!normTyping.done && <span className="inline-block w-0.5 h-4 bg-safe-400/80 ml-0.5 animate-pulse align-middle" />}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── Ana Sayfa ─────────────────────────────────────────────────────────────────
export default function SubtitleMockPage() {
  const [scenarioIdx, setScenarioIdx] = useState(0);
  const [lineIdx, setLineIdx]         = useState(0);
  const [callDuration, setCallDuration] = useState(0);
  const [doneLines, setDoneLines]     = useState([]);
  const timerRef = useRef(null);

  const scenario = SCENARIOS[scenarioIdx];

  // Çağrı süresi sayacı
  useEffect(() => {
    timerRef.current = setInterval(() => setCallDuration((d) => d + 1), 1000);
    return () => clearInterval(timerRef.current);
  }, [scenarioIdx]);

  // Her satırı otomatik ilerlet
  useEffect(() => {
    if (lineIdx >= scenario.lines.length) return;
    const line  = scenario.lines[lineIdx];
    const delay = (line.raw.length * 36) + (line.normalized.length * 30) + 1800;
    const t = setTimeout(() => {
      setDoneLines((d) => [...d, lineIdx]);
      if (lineIdx + 1 < scenario.lines.length) setLineIdx((i) => i + 1);
    }, delay);
    return () => clearTimeout(t);
  }, [lineIdx, scenarioIdx]); // eslint-disable-line

  const nextScenario = () => {
    setScenarioIdx((i) => (i + 1) % SCENARIOS.length);
    setLineIdx(0);
    setDoneLines([]);
    setCallDuration(0);
  };

  const fmt = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  return (
    <div className="min-h-screen bg-dark-900 text-slate-800 font-sans flex flex-col items-center justify-start py-8 px-4">

      {/* Sayfa başlığı */}
      <div className="w-full max-w-lg mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-display font-bold text-slate-800">
            Safe<span className="bg-clip-text text-transparent bg-gradient-to-r from-safe-400 to-vox-400">Vox</span>
            <span className="text-slate-400 font-normal ml-2 text-sm">— Canlı Altyazı Motoru</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">Şive & ağız normalizasyonu ile gerçek zamanlı altyazı</p>
        </div>
        <button
          onClick={nextScenario}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-dark-700 border border-indigo-100 text-slate-500 hover:text-slate-800 rounded-lg transition"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Senaryo Değiştir
        </button>
      </div>

      {/* Ana kart */}
      <motion.div
        key={scenarioIdx}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-lg bg-dark-800/80 backdrop-blur border border-indigo-100 rounded-3xl overflow-hidden shadow-2xl shadow-indigo-300/70"
      >
        {/* Header — çağrı bilgisi */}
        <div className="px-5 py-4 border-b border-indigo-100 bg-dark-700/40">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* Canlı göstergesi */}
              <div className="flex items-center gap-1.5 bg-red-500/15 border border-red-500/30 rounded-full px-2.5 py-1">
                <motion.div
                  className="w-2 h-2 rounded-full bg-red-500"
                  animate={{ opacity: [1, 0.3, 1] }}
                  transition={{ duration: 1, repeat: Infinity }}
                />
                <span className="text-[11px] font-bold text-red-400">CANLI</span>
              </div>
              <span className="text-xs font-mono text-slate-400">{fmt(callDuration)}</span>
            </div>

            {/* Bağlantı kalitesi */}
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <Wifi className="w-3.5 h-3.5 text-green-400" />
              <span className="text-green-400">Bağlantı İyi</span>
            </div>
          </div>

          {/* Arayan bilgisi */}
          <div className="flex items-center justify-between mt-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-vox-500 to-safe-600 flex items-center justify-center text-xl shadow-lg">
                {scenario.flag}
              </div>
              <div>
                <p className="text-sm font-bold text-slate-800">{scenario.caller}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="flex items-center gap-1 text-xs text-slate-400">
                    <MapPin className="w-3 h-3" />{scenario.location}
                  </span>
                  <span className="text-slate-300">·</span>
                  <span className="flex items-center gap-1 text-xs text-slate-400">
                    <Phone className="w-3 h-3" />0532 *** ** 47
                  </span>
                </div>
              </div>
            </div>

            {/* Şive badge */}
            <div className="flex flex-col items-end gap-1">
              <span className="text-[10px] text-slate-400">Tespit edilen şive</span>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-vox-500/15 border border-vox-500/30 text-vox-300">
                {scenario.dialect} Ağzı
              </span>
            </div>
          </div>
        </div>

        {/* Ses dalgası */}
        <div className="px-5 py-3 border-b border-indigo-100 flex items-center gap-4">
          <Mic className="w-4 h-4 text-safe-400 flex-shrink-0" />
          <Waveform active={lineIdx < scenario.lines.length} />
          <Volume2 className="w-4 h-4 text-slate-400 flex-shrink-0 ml-auto" />
        </div>

        {/* Altyazı alanı */}
        <div className="px-5 py-4 flex flex-col gap-3">
          <div className="flex items-center gap-2 mb-1">
            <Brain className="w-3.5 h-3.5 text-vox-400" />
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Altyazı & Normalizasyon</span>
          </div>

          {scenario.lines.map((line, i) => (
            (i <= lineIdx) && (
              <SubtitleLine
                key={`${scenarioIdx}-${i}`}
                line={line}
                index={i}
                isActive={i === lineIdx}
                isDone={doneLines.includes(i)}
              />
            )
          ))}
        </div>

        {/* Alt bilgi şeridi */}
        <div className="px-5 py-3 border-t border-indigo-100 bg-dark-700/30 flex items-center justify-between">
          {/* Duygu durumu */}
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border ${scenario.emotion.bg}`}>
            <span className="text-base leading-none">{scenario.emotion.emoji}</span>
            <div>
              <p className="text-[10px] text-slate-400">Duygu Durumu</p>
              <p className={`text-xs font-semibold ${scenario.emotion.color}`}>{scenario.emotion.label}</p>
            </div>
          </div>

          {/* Motor istatistikleri */}
          <div className="flex items-center gap-3 text-xs text-slate-400">
            <div className="text-center">
              <p className="text-slate-800 font-bold text-sm">{scenario.lines[0].confidence}%</p>
              <p>Güven</p>
            </div>
            <div className="text-center">
              <p className="text-slate-800 font-bold text-sm">&lt;0.3s</p>
              <p>Gecikme</p>
            </div>
            <div className="text-center">
              <p className="text-slate-800 font-bold text-sm">TR</p>
              <p>Standart</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Senaryo seçici */}
      <div className="flex gap-2 mt-5">
        {SCENARIOS.map((s, i) => (
          <button
            key={i}
            onClick={() => { setScenarioIdx(i); setLineIdx(0); setDoneLines([]); setCallDuration(0); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border transition ${
              i === scenarioIdx
                ? 'bg-safe-500/20 border-safe-500/40 text-safe-300'
                : 'bg-dark-700 border-indigo-100 text-slate-400 hover:text-slate-800'
            }`}
          >
            {s.flag} {s.location}
          </button>
        ))}
      </div>

      <p className="text-sm font-semibold text-slate-600 mt-5 text-center max-w-md leading-relaxed">
        Sistem müşteri konuşurken şiveyi tespit eder, standart Türkçeye normalize eder ve temsilciye{' '}
        <span className="bg-clip-text text-transparent bg-gradient-to-r from-safe-400 to-vox-400">
          anlık altyazı
        </span>{' '}
        sunar.
      </p>
    </div>
  );
}
