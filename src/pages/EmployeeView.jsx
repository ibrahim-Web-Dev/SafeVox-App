import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity, LogOut, Mic, MicOff, CheckCircle2, X,
  Coffee, BookOpen, ChevronRight, Sparkles, Brain,
} from 'lucide-react';
import { addRecording, getEmployeesWithRisk, addBreak, assignCourse } from '../utils/employeeStore';
import { analyzeEmotions } from '../utils/emotionAnalyzer';

// ── AI Koç Bildirimleri (risk seviyesine göre) ────────────────────────────────
const COACH_MSGS = {
  critical: [
    { icon: '☕', text: 'Patrondan Kahve Molası Hediyesi!',            badge: '+1 Mola',   color: 'from-amber-500 to-orange-500' },
    { icon: '💙', text: 'Bugün gerçekten çok çalıştın, bunu görüyorum.', badge: null,       color: 'from-blue-500 to-cyan-500' },
    { icon: '🔴', text: 'Ses tonun biraz sertleşmiş, fark ettim. Derin bir nefes al.', badge: null, color: 'from-red-500 to-pink-500' },
  ],
  warning: [
    { icon: '📚', text: 'Başlangıç cümlesini arada unutuyorsun — bunu azaltmaya çalış.', badge: 'İpucu', color: 'from-purple-500 to-vox-600' },
    { icon: '🌟', text: 'Stres biraz yüksek ama kontrol edebilirsin!', badge: null, color: 'from-yellow-500 to-amber-500' },
    { icon: '💬', text: 'Empati cümlelerini biraz daha kullanmayı dene.',              badge: 'İpucu', color: 'from-teal-500 to-cyan-500' },
  ],
  watch: [
    { icon: '🎯', text: 'Son görüşmelerde kapanış cümlelerin çok iyiydi!', badge: '+5 Puan', color: 'from-green-500 to-teal-500' },
    { icon: '💡', text: '"Anlıyorum" ifadesini daha sık kullanabilirsin.', badge: 'İpucu',   color: 'from-blue-500 to-indigo-500' },
  ],
  none: [
    { icon: '🏆', text: 'Bu hafta en iyi performanslardan biri sende!', badge: '+12 Puan', color: 'from-yellow-400 to-amber-500' },
    { icon: '⭐', text: 'Müşteri memnuniyeti skorun yükseldi.',          badge: '+8',       color: 'from-safe-500 to-teal-500' },
    { icon: '🎉', text: 'Harika gidiyorsun, böyle devam!',               badge: null,       color: 'from-pink-500 to-rose-500' },
  ],
  nodata: [
    { icon: '👋', text: 'İlk kaydını almaya hazır mısın?', badge: null, color: 'from-safe-500 to-vox-600' },
  ],
};

// ── AI Koç Bildirimi Bileşeni ─────────────────────────────────────────────────
function CoachToast({ msg, onDismiss }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 6000);
    return () => clearTimeout(t);
  }, [onDismiss]);

  return (
    <motion.div
      initial={{ opacity: 0, x: -60, scale: 0.92 }}
      animate={{ opacity: 1, x: 0,   scale: 1 }}
      exit={{    opacity: 0, x: -60, scale: 0.92 }}
      transition={{ type: 'spring', stiffness: 320, damping: 28 }}
      className="flex items-center gap-3 bg-dark-800/95 backdrop-blur border border-indigo-100
                 rounded-2xl px-4 py-3 shadow-2xl shadow-indigo-300/70 max-w-xs w-full"
    >
      {/* Gradient ikon */}
      <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${msg.color}
                       flex items-center justify-center text-lg flex-shrink-0 shadow-lg`}>
        {msg.icon}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5">
          <span className="text-[10px] font-bold text-safe-400 uppercase tracking-wide">AI Koç</span>
          {msg.badge && (
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-gradient-to-r ${msg.color} text-slate-800`}>
              {msg.badge}
            </span>
          )}
        </div>
        <p className="text-xs text-slate-700 leading-snug">{msg.text}</p>
      </div>

      <button onClick={onDismiss} className="text-slate-400 hover:text-slate-600 flex-shrink-0">
        <X className="w-3.5 h-3.5" />
      </button>
    </motion.div>
  );
}

// ── Bildirim Kuyruğu ──────────────────────────────────────────────────────────
function CoachNotifications({ alertLevel, employeeName }) {
  const [queue, setQueue] = useState([]);

  const msgs = [...(COACH_MSGS[alertLevel] || COACH_MSGS.nodata)];

  // Ahmet Çetin için özel patrondan hediye bildirimi en başa eklenir
  if (employeeName?.toLowerCase().includes('atilla çetin')) {
    msgs.unshift({
      icon: '☕',
      text: 'Patronun sana 30 dakikalık kahve molası hediye etti! Hak ettin, biraz dinlen.',
      badge: '+30 dk Mola',
      color: 'from-amber-400 to-orange-500',
    });
  }

  useEffect(() => {
    const timers = [];
    msgs.forEach((msg, i) => {
      timers.push(setTimeout(() => {
        setQueue((q) => [...q, { ...msg, id: Date.now() + i }]);
      }, 2500 + i * 4000));
    });
    return () => timers.forEach(clearTimeout);
  }, [alertLevel, employeeName]); // eslint-disable-line

  const dismiss = (id) => setQueue((q) => q.filter((m) => m.id !== id));

  return (
    <div className="fixed bottom-6 left-6 z-50 flex flex-col-reverse gap-2 max-w-xs">
      <AnimatePresence>
        {queue.map((msg) => (
          <CoachToast key={msg.id} msg={msg} onDismiss={() => dismiss(msg.id)} />
        ))}
      </AnimatePresence>
    </div>
  );
}

// ── Mini Teknocan yüzü ────────────────────────────────────────────────────────
function TeknocanFace({ size = 40 }) {
  const [blink, setBlink] = useState(true);
  useEffect(() => {
    let t;
    const next = () => {
      t = setTimeout(() => {
        setBlink(false);
        setTimeout(() => { setBlink(true); next(); }, 130);
      }, 2500 + Math.random() * 2000);
    };
    next();
    return () => clearTimeout(t);
  }, []);

  return (
    <svg width={size} height={size} viewBox="0 0 64 68" fill="none">
      <defs>
        <radialGradient id="emp-head" cx="38%" cy="32%" r="65%">
          <stop offset="0%"   stopColor="#FFE940" />
          <stop offset="55%"  stopColor="#FFD700" />
          <stop offset="100%" stopColor="#C0A000" />
        </radialGradient>
      </defs>
      <line x1="22" y1="7"  x2="20" y2="2"  stroke="#FFD700" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="19" cy="1.5" r="2.5" fill="#FFD700" />
      <line x1="42" y1="7"  x2="44" y2="2"  stroke="#FFD700" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="45" cy="1.5" r="2.5" fill="#FFD700" />
      <rect x="6" y="8" width="52" height="48" rx="16" ry="16" fill="url(#emp-head)" />
      <circle cx="23" cy="30" r="9" fill="#111" />
      <circle cx="26" cy="26" r="2.8" fill="white" />
      <motion.circle cx="23" cy="30" r="9" fill="#FFD700"
        animate={{ scaleY: blink ? 0.001 : 1 }} transition={{ duration: 0.07 }}
        style={{ transformOrigin: '23px 30px' }} />
      <circle cx="41" cy="30" r="9" fill="#111" />
      <circle cx="44" cy="26" r="2.8" fill="white" />
      <motion.circle cx="41" cy="30" r="9" fill="#FFD700"
        animate={{ scaleY: blink ? 0.001 : 1 }} transition={{ duration: 0.07 }}
        style={{ transformOrigin: '41px 30px' }} />
      <path d="M 24 44 Q 32 50 40 44" stroke="#1A1A1A" strokeWidth="2" strokeLinecap="round" fill="none" />
    </svg>
  );
}

// ── Yüzen Teknocan Widget ─────────────────────────────────────────────────────
const QUICK_COURSES = [
  { courseId: 'anger',   label: 'Sinir Yönetimi',     icon: '😤', duration: '45 dk' },
  { courseId: 'stress',  label: 'Stres Azaltma',      icon: '🧘', duration: '30 dk' },
  { courseId: 'burnout', label: 'Tükenmişlik Önleme', icon: '🔋', duration: '60 dk' },
  { courseId: 'mindful', label: 'Farkındalık',         icon: '🌿', duration: '20 dk' },
];

function TeknocanWidget({ employeeId, alertLevel }) {
  const [open, setOpen]         = useState(false);
  const [feedback, setFeedback] = useState('');
  const shownRef                = useRef(false);

  const msgs = {
    critical: 'Durumun beni endişelendiriyor. Hemen bir mola ver!',
    warning:  'Stres birikmiş görünüyor. Kısa bir mola çok iyi gelir!',
    watch:    'Biraz yorulmuş gibisin. Bir kahve molası öneriyorum.',
    none:     'Harika gidiyorsun! Böyle devam et 💪',
    nodata:   'Merhaba! Herhangi bir konuda yardıma ihtiyacın olursa buradayım 😊',
  };

  const breakSuggestion = alertLevel === 'critical' || alertLevel === 'warning' || alertLevel === 'watch'
    ? { type: 'coffee', label: '☕ Kahve Molası', duration: 15 }
    : null;
  const courseSuggestion = alertLevel === 'critical' ? QUICK_COURSES[2]
    : alertLevel === 'warning' ? QUICK_COURSES[0]
    : alertLevel === 'watch'   ? QUICK_COURSES[1]
    : QUICK_COURSES[3];

  useEffect(() => {
    const t = setTimeout(() => {
      if (!shownRef.current) { setOpen(true); shownRef.current = true; }
    }, 8000);
    return () => clearTimeout(t);
  }, []);

  const doBreak = () => {
    if (!employeeId || !breakSuggestion) return;
    addBreak(employeeId, { type: breakSuggestion.type, label: breakSuggestion.label, duration: breakSuggestion.duration });
    setFeedback('Mola kaydedildi! ☕');
    setTimeout(() => setFeedback(''), 3000);
  };
  const doCourse = () => {
    if (!employeeId || !courseSuggestion) return;
    assignCourse(employeeId, courseSuggestion);
    setFeedback(`"${courseSuggestion.label}" kursu atandı! 📚`);
    setTimeout(() => setFeedback(''), 3000);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.92 }}
            animate={{ opacity: 1, y: 0,  scale: 1 }}
            exit={{    opacity: 0, y: 12, scale: 0.92 }}
            transition={{ type: 'spring', stiffness: 340, damping: 26 }}
            className="bg-dark-800/95 backdrop-blur border border-indigo-100 rounded-2xl p-4 w-72 shadow-2xl shadow-indigo-300/70 relative"
          >
            <button onClick={() => setOpen(false)}
              className="absolute top-3 right-3 text-slate-400 hover:text-slate-600 transition">
              <X className="w-4 h-4" />
            </button>
            <div className="flex gap-3 items-start pr-4">
              <div className="shrink-0"><TeknocanFace size={48} /></div>
              <div>
                <p className="text-xs font-bold text-yellow-400 mb-1">Teknocan</p>
                <p className="text-sm text-slate-700 leading-relaxed">{msgs[alertLevel] || msgs.nodata}</p>
              </div>
            </div>
            <AnimatePresence>
              {feedback && (
                <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="text-xs text-green-400 bg-green-500/10 border border-green-500/20 rounded-lg px-3 py-1.5 mt-3">
                  {feedback}
                </motion.p>
              )}
            </AnimatePresence>
            {employeeId && (
              <div className="mt-3 flex flex-col gap-2">
                {breakSuggestion && (
                  <button onClick={doBreak}
                    className="flex items-center gap-2 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 rounded-xl px-3 py-2 text-xs font-semibold transition">
                    <Coffee className="w-3.5 h-3.5" />
                    {breakSuggestion.label} — {breakSuggestion.duration} dk
                    <ChevronRight className="w-3 h-3 ml-auto" />
                  </button>
                )}
                <button onClick={doCourse}
                  className="flex items-center gap-2 bg-blue-500/15 hover:bg-blue-500/25 border border-blue-500/30 text-blue-300 rounded-xl px-3 py-2 text-xs font-semibold transition">
                  <BookOpen className="w-3.5 h-3.5" />
                  {courseSuggestion.icon} {courseSuggestion.label} ({courseSuggestion.duration})
                  <ChevronRight className="w-3 h-3 ml-auto" />
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
      <motion.button onClick={() => setOpen((v) => !v)}
        whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.93 }}
        animate={{ boxShadow: open ? '0 0 0 0px rgba(255,215,0,0)' : ['0 0 0 0px rgba(255,215,0,0.4)', '0 0 0 14px rgba(255,215,0,0)', '0 0 0 0px rgba(255,215,0,0.4)'] }}
        transition={{ duration: 2.2, repeat: open ? 0 : Infinity }}
        className="w-16 h-16 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 shadow-xl shadow-yellow-500/30 flex items-center justify-center">
        <TeknocanFace size={46} />
      </motion.button>
    </div>
  );
}

// ── Durum kartı ────────────────────────────────────────────────────────────────
const STATUS_MAP = {
  critical: { label: 'Bugün Çok Yoğun Geçiyor',  sub: 'Dinlenmeye ihtiyacın var',      emoji: '😔', ring: 'ring-red-500/40',    glow: 'shadow-red-500/20',    bar: 'from-red-500 to-orange-500' },
  warning:  { label: 'Stres Biraz Yüksek',         sub: 'Küçük bir mola iyi gelir',       emoji: '😐', ring: 'ring-orange-400/40', glow: 'shadow-orange-500/20', bar: 'from-orange-500 to-yellow-500' },
  watch:    { label: 'Takip Altında',               sub: 'Normal seyrediyor, dikkat et',   emoji: '🙂', ring: 'ring-yellow-400/40', glow: 'shadow-yellow-500/20', bar: 'from-yellow-400 to-green-400' },
  none:     { label: 'Harika Gidiyorsun!',          sub: 'Performansın çok iyi',           emoji: '😊', ring: 'ring-green-400/40',  glow: 'shadow-green-500/20',  bar: 'from-green-400 to-teal-400' },
  nodata:   { label: 'Hoş Geldin!',                sub: 'İlk kaydını almaya hazır mısın?', emoji: '👋', ring: 'ring-safe-400/40',   glow: 'shadow-safe-500/20',   bar: 'from-safe-400 to-vox-500' },
};

// ── Ana Sayfa ─────────────────────────────────────────────────────────────────
export default function EmployeeView({ name, employeeId, onLogout }) {
  const [recState, setRecState]     = useState('idle');
  const [transcript, setTranscript] = useState('');
  const [duration, setDuration]     = useState(0);
  const [alertLevel, setAlertLevel] = useState('nodata');
  const [latest, setLatest]         = useState(null);
  const recognitionRef              = useRef(null);
  const timerRef                    = useRef(null);

  useEffect(() => {
    const employees = getEmployeesWithRisk();
    const emp = employees.find((e) => e.id === employeeId);
    if (emp) {
      setAlertLevel(emp.trend.alertLevel || 'nodata');
      const recs = emp.recordings || [];
      if (recs.length) setLatest(recs[recs.length - 1]);
    }
  }, [employeeId]);

  useEffect(() => {
    if (recState === 'recording') {
      timerRef.current = setInterval(() => setDuration((d) => d + 1), 1000);
    } else {
      clearInterval(timerRef.current);
      if (recState !== 'analyzing') setDuration(0);
    }
    return () => clearInterval(timerRef.current);
  }, [recState]);

  const fmt = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  const startRecording = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { setRecState('error'); return; }
    const rec = new SR();
    rec.lang = 'tr-TR'; rec.continuous = true; rec.interimResults = true;
    let fullText = '';
    rec.onresult = (e) => { fullText = Array.from(e.results).map((r) => r[0].transcript).join(' '); setTranscript(fullText); };
    rec.onerror  = () => setRecState('error');
    rec.onend    = () => { if (recState === 'recording') runAnalysis(fullText); };
    recognitionRef.current = rec;
    rec.start();
    setTranscript(''); setRecState('recording');
  };

  const stopRecording = () => { recognitionRef.current?.stop(); runAnalysis(transcript); };

  const runAnalysis = async (text) => {
    setRecState('analyzing');
    try {
      const result = await analyzeEmotions(text || '(ses yok)');
      if (employeeId) {
        addRecording(employeeId, {
          date: new Date().toISOString().slice(0, 10),
          fileName: `kayit_${new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }).replace(':', '-')}.webm`,
          analysisResult: result,
        });
      }
      setRecState('done');
    } catch { setRecState('error'); }
  };

  const reset = () => { setRecState('idle'); setTranscript(''); setDuration(0); };

  const status = STATUS_MAP[alertLevel] || STATUS_MAP.nodata;
  const firstName = name.split(' ')[0];

  return (
    <div className="min-h-screen bg-dark-900 flex flex-col relative overflow-hidden">

      {/* Arka plan glow efekti */}
      <div className="absolute inset-0 pointer-events-none">
        <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] rounded-full blur-[100px] opacity-10 bg-gradient-to-r ${status.bar}`} />
      </div>

      {/* Header */}
      <header className="relative z-10 border-b border-indigo-100 bg-dark-800/60 backdrop-blur-md">
        <div className="max-w-3xl mx-auto px-6 py-3 flex items-center gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-safe-500 to-vox-600 flex items-center justify-center shadow-lg shadow-safe-500/20">
              <Activity className="w-4 h-4 text-white" />
            </div>
            <span className="text-base font-display font-bold text-slate-800">
              Safe<span className="bg-clip-text text-transparent bg-gradient-to-r from-safe-400 to-vox-400">Vox</span>
            </span>
          </div>
          <div className="h-5 w-px bg-indigo-50" />
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full bg-gradient-to-br ${status.bar}`} />
            <span className="text-sm text-slate-500">
              <span className="text-slate-800 font-semibold">{name}</span>
            </span>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <span className="text-xs text-slate-400 hidden sm:block">
              {new Date().toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long' })}
            </span>
            <button onClick={onLogout}
              className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-red-400 transition px-2 py-1 rounded-lg hover:bg-red-500/10">
              <LogOut className="w-3.5 h-3.5" /> Çıkış
            </button>
          </div>
        </div>
      </header>

      {/* Ana içerik */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 py-8 gap-8">

        {/* Karşılama + durum kartı */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col items-center gap-4 text-center"
        >
          {/* Emoji avatarı */}
          <motion.div
            animate={{ y: [0, -6, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            className={`text-5xl w-20 h-20 rounded-3xl bg-dark-800/80 border border-indigo-100 flex items-center justify-center
                        shadow-xl ${status.glow} ring-2 ${status.ring}`}
          >
            {status.emoji}
          </motion.div>

          <div>
            <h1 className="text-3xl font-display font-bold text-slate-800">
              Hoş geldin, {firstName}!
            </h1>
            <p className={`text-sm mt-1 font-medium bg-clip-text text-transparent bg-gradient-to-r ${status.bar}`}>
              {status.label}
            </p>
            <p className="text-xs text-slate-400 mt-0.5">{status.sub}</p>
          </div>

          {/* Son görüşme mini istatistiği */}
          {latest && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 }}
              className="flex items-center gap-4 bg-dark-800/60 border border-indigo-100 rounded-2xl px-5 py-3"
            >
              <Brain className="w-4 h-4 text-vox-400 flex-shrink-0" />
              <div className="flex items-center gap-4 text-xs">
                {[
                  { label: 'Stres',    value: latest.stress,   color: 'text-red-400' },
                  { label: 'Sakinlik', value: latest.calmness, color: 'text-green-400' },
                  { label: 'Enerji',   value: 100 - latest.fatigue, color: 'text-yellow-400' },
                ].map(({ label, value, color }) => (
                  <div key={label} className="flex flex-col items-center gap-0.5">
                    <span className={`text-base font-bold ${color}`}>{value}</span>
                    <span className="text-slate-400">{label}</span>
                  </div>
                ))}
              </div>
              <span className="text-xs text-slate-400 border-l border-indigo-100 pl-4">Son Analiz</span>
            </motion.div>
          )}
        </motion.div>

        {/* Kayıt bölümü */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="flex flex-col items-center gap-5"
        >
          {/* Durum başlığı */}
          <AnimatePresence mode="wait">
            <motion.div
              key={recState}
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              className="text-center h-10 flex flex-col justify-center"
            >
              {recState === 'idle' && (
                <p className="text-sm text-slate-400">Görüşme başladığında kaydı başlat, bitince durdur.</p>
              )}
              {recState === 'recording' && (
                <p className="text-2xl font-mono font-bold text-red-400">{fmt(duration)}</p>
              )}
              {recState === 'analyzing' && (
                <p className="text-sm text-yellow-400">Kaydediliyor...</p>
              )}
              {recState === 'done' && (
                <p className="text-sm text-green-400 font-semibold">Başarıyla Kaydedildi ✓</p>
              )}
              {recState === 'error' && (
                <p className="text-sm text-red-400">Bir hata oluştu, tekrar dene.</p>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Büyük mikrofon butonu */}
          {recState === 'idle' && (
            <motion.button onClick={startRecording}
              whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.93 }}
              className={`w-28 h-28 rounded-full bg-gradient-to-br from-safe-500 to-vox-600
                         shadow-2xl shadow-safe-500/30 flex items-center justify-center
                         ring-4 ring-safe-500/20`}
            >
              <Mic className="w-12 h-12 text-white" />
            </motion.button>
          )}

          {recState === 'recording' && (
            <div className="relative flex items-center justify-center">
              {[1, 1.5, 2].map((scale, i) => (
                <motion.div key={i}
                  className="absolute w-28 h-28 rounded-full bg-red-500/15"
                  animate={{ scale: [1, scale, 1], opacity: [0.5, 0, 0.5] }}
                  transition={{ duration: 1.6, repeat: Infinity, delay: i * 0.3 }} />
              ))}
              <motion.button onClick={stopRecording}
                whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.93 }}
                className="relative z-10 w-28 h-28 rounded-full bg-gradient-to-br from-red-500 to-red-700
                           shadow-2xl shadow-red-500/40 flex items-center justify-center ring-4 ring-red-500/20">
                <MicOff className="w-12 h-12 text-white" />
              </motion.button>
            </div>
          )}

          {recState === 'analyzing' && (
            <div className="w-28 h-28 rounded-full bg-dark-800 border-2 border-yellow-500/20 flex items-center justify-center">
              <motion.div className="w-10 h-10 border-4 border-yellow-500/20 border-t-yellow-400 rounded-full"
                animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} />
            </div>
          )}

          {recState === 'done' && (
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 300 }}
              className="flex flex-col items-center gap-4">
              <div className="w-28 h-28 rounded-full bg-green-500/10 border-2 border-green-500/30 flex items-center justify-center">
                <CheckCircle2 className="w-14 h-14 text-green-400" />
              </div>
              <button onClick={reset}
                className="px-6 py-2.5 text-sm font-semibold bg-dark-700 hover:bg-dark-600 border border-indigo-100 text-slate-800 rounded-xl transition">
                Yeni Kayıt Başlat
              </button>
            </motion.div>
          )}

          {recState === 'error' && (
            <div className="flex flex-col items-center gap-4">
              <div className="w-28 h-28 rounded-full bg-red-500/10 border-2 border-red-500/30 flex items-center justify-center">
                <X className="w-14 h-14 text-red-400" />
              </div>
              <button onClick={reset}
                className="px-6 py-2.5 text-sm font-semibold bg-dark-700 hover:bg-dark-600 border border-indigo-100 text-slate-800 rounded-xl transition">
                Tekrar Dene
              </button>
            </div>
          )}

          {/* Canlı transcript */}
          <AnimatePresence>
            {recState === 'recording' && transcript && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="max-w-sm w-full bg-dark-800/50 border border-indigo-100 rounded-xl p-3">
                <p className="text-xs text-slate-400 mb-1">Duyulanlar</p>
                <p className="text-xs text-slate-500 leading-relaxed line-clamp-2">{transcript}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Alt bilgi */}
        {recState === 'idle' && (
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}
            className="text-xs text-slate-300 text-center max-w-xs">
            Görüşme içeriği paylaşılmaz — yalnızca ses tonu ve duygusal durum analiz edilir.
          </motion.p>
        )}
      </main>

      {/* Sol alt: AI Koç bildirimleri */}
      <CoachNotifications alertLevel={alertLevel} employeeName={name} />

      {/* Sağ alt: Teknocan */}
      <TeknocanWidget employeeId={employeeId} alertLevel={alertLevel} />
    </div>
  );
}
