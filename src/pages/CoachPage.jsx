import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, RotateCcw, GraduationCap, ChevronRight, Star, Volume2, VolumeX, Loader2,
  CheckCircle2, Circle, BookOpen, ShieldCheck, Brain, Zap, Users, Award, Sparkles } from 'lucide-react';
import { SplineScene } from '../components/ui/SplineScene';
import { VoxeraHead } from './VoxeraPage';

const GROQ_KEY = import.meta.env.VITE_GROQ_API_KEY;

// ── Yardımcı: Şimdiki saat ───────────────────────────────────────────────────
const nowStr = () => new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });

// ── Voxera Senaryoları (genel müşteri tipleri) ────────────────────────────────
const VOXERA_SCENARIOS = [
  {
    id: 'sinirli',
    label: 'Sinirli Müşteri',
    emoji: '😤',
    difficulty: 'Orta',
    diffColor: 'text-amber-700 bg-amber-100 border-amber-200',
    desc: 'Faturasına haksız yere ücret yansımış, oldukça sinirli bir müşteri.',
    mascotMesaj: 'Dikkat! Sinirli müşteri geliyor. Empati kur, sözünü kesme ve somut çözüm sun.',
    startMsg: 'Yani bak, faturama baktım bu ay, 150 lira fazladan çekmiş. Kimseyi arayamadım, bekletildim, şimdi siz anlatın bana bu ne?',
    systemPrompt: `Sen sinirli bir Türk müşterisin. Faturana açıklamasız 150 TL ek ücret yansımış ve öfkelisin. Konuşma tarzın: kısa ve sert cümleler, "yani", "bak", "dinleyin" gibi sözcükler, zaman zaman sözü kesmek. Temsilci özür dileyip somut bir çözüm (iade, düzeltme) sunarsa yavaş yavaş sakinleş. Temsilci savunmacı davranırsa daha da sinirlen. 1-3 cümleyle cevap ver, asla temsilci gibi davranma.`,
  },
  {
    id: 'sakin',
    label: 'Sakin Müşteri',
    emoji: '😊',
    difficulty: 'Kolay',
    diffColor: 'text-emerald-700 bg-emerald-100 border-emerald-200',
    desc: 'Merak eden, kibarca soru soran, kolay ikna edilebilir bir müşteri.',
    mascotMesaj: 'Sakin ve meraklı bir müşteri. Fırsatı iyi değerlendir, doğru paketi öner!',
    startMsg: 'Merhaba, şey... paketimi değiştirmek istiyorum açıkçası ama hangisi daha iyi bilmiyorum, yardımcı olabilir misiniz?',
    systemPrompt: `Sen sakin, kibar ve meraklı bir Türk müşterisin. Konuşma tarzın: nazik, "acaba", "peki", "anlıyorum" gibi sözcükler, sorularını düşünerek sormak. Temsilcinin önerilerini dinle, 1-2 soru sor, mantıklı bir öneri gelirse memnuniyetle kabul et. Çok hızlı da ikna olma. 1-3 cümleyle cevap ver.`,
  },
  {
    id: 'zorlu',
    label: 'Zorlu Müşteri',
    emoji: '😠',
    difficulty: 'Zor',
    diffColor: 'text-red-700 bg-red-100 border-red-200',
    desc: 'Her şeye itiraz eden, hiçbir çözümü beğenmeyen, sabır isteyen müşteri.',
    mascotMesaj: 'En zorlu senaryo! Sabrını koru, profesyonel kal, çözüme odaklan.',
    startMsg: 'Geçen ay da aradım olmadı, ondan önce de aradım yine olmadı. Şimdi de bir şey değişmeyecek zaten biliyorum, ama ne yapayım işte...',
    systemPrompt: `Sen çok zorlu, güvensiz bir Türk müşterisin. Defalarca aradın ama sorunun hiç çözülmediğini düşünüyorsun. Konuşma tarzın: "evet ama...", "bunu zaten söyledim", "ne fark eder ki", "inanmıyorum artık" gibi ifadeler. Temsilci somut adımlar atıp seni bilgilendirirse çok yavaş yumuşa. 1-3 cümleyle cevap ver.`,
  },
  {
    id: 'hayalkiriklig',
    label: 'Hayal Kırıklığı',
    emoji: '😢',
    difficulty: 'Orta',
    diffColor: 'text-amber-700 bg-amber-100 border-amber-200',
    desc: 'Hizmet kesintisi yaşayan, hayal kırıklığına uğramış, üzgün bir müşteri.',
    mascotMesaj: 'Duygusal bir müşteri var. Empati çok kritik — önce duy, sonra çöz.',
    startMsg: 'Üç gündür internetim yok. Evden çalışıyorum ben, çocuğum okula bağlanamıyor... gerçekten çok zor oldu ya.',
    systemPrompt: `Sen üzgün ve yorgun bir Türk müşterisin. 3 gündür internet yok, evden çalışıyorsun, çocuğun etkileniyor. Sinirli değil ama çaresiz ve duygusalsın. Konuşma tarzın: "ya gerçekten", "ne yapacağımı bilemedim", "çok zor" gibi ifadeler. Temsilci gerçekten empati kurarsa ve net süre verirse rahatla. 1-3 cümleyle cevap ver.`,
  },
  {
    id: 'kararsiz',
    label: 'Kararsız Müşteri',
    emoji: '🤔',
    difficulty: 'Kolay',
    diffColor: 'text-emerald-700 bg-emerald-100 border-emerald-200',
    desc: 'Karar vermekte zorlanan, alternatifler arasında gidip gelen müşteri.',
    mascotMesaj: 'Kararsız müşteri! Net ol, yönlendir ve güven ver.',
    startMsg: 'Şimdi şöyle yani... hem şu pakete bakıyorum hem buna, ikisi de aynı mı aslında? Bir de başka firmalara baktım ama oralar da pahalı gibi geldi...',
    systemPrompt: `Sen kararsız, kafası karışık bir Türk müşterisin. Seçenekler arasında gidip geliyorsun. Konuşma tarzın: "yani", "bilmiyorum ki", "ama şöyle de var", "hmm" gibi ifadeler, sürekli yeni soru açmak. Temsilci sana özel net bir öneri yapıp avantajlarını açıklarsa kararını ver. 1-3 cümleyle cevap ver.`,
  },
];

// Teknocan aynı senaryoları kullanır — karakter değişir, içerik aynı kalır
const TEKNOCAN_SCENARIOS = VOXERA_SCENARIOS.map(s => ({
  ...s,
  mascotMesaj: s.mascotMesaj.replace('Ben Voxera, AI koçun', 'Ben Teknocan, dijital koçun'),
}));

// ── TTS ────────────────────────────────────────────────────────────────────────
const ELEVENLABS_KEY = import.meta.env.VITE_ELEVENLABS_API_KEY;
const VOICE_VOXI     = 'PDXaJVX420kXqPLLIOY4';
const VOICE_TEKNOCAN = 'dPV8YcOEtF8RVJFPcw6f';

// Paylaşımlı AudioContext — autoplay kısıtını aşmak için tek context kullanılır
let _sharedAudioCtx = null;
function getAudioCtx() {
  if (!_sharedAudioCtx || _sharedAudioCtx.state === 'closed') {
    _sharedAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  return _sharedAudioCtx;
}
// User gesture anında çağrılır — context'i "running" duruma alır
function wakeAudio() {
  try { getAudioCtx().resume(); } catch {}
}

// Browser TTS — fallback
function speakBrowser(text, onStart, onEnd) {
  if (!('speechSynthesis' in window)) { onEnd?.(); return; }
  window.speechSynthesis.cancel();
  const doSpeak = () => {
    const utt = new SpeechSynthesisUtterance(text);
    utt.lang  = 'tr-TR';
    utt.rate  = 0.88;
    utt.pitch = 1.1;
    const voices  = window.speechSynthesis.getVoices();
    const trVoice = voices.find((v) => v.lang === 'tr-TR') || voices.find((v) => v.lang.startsWith('tr'));
    if (trVoice) utt.voice = trVoice;
    utt.onstart = () => onStart?.();
    utt.onend   = () => onEnd?.();
    utt.onerror = () => onEnd?.();
    window.speechSynthesis.speak(utt);
  };
  window.speechSynthesis.getVoices().length === 0
    ? window.speechSynthesis.addEventListener('voiceschanged', doSpeak, { once: true })
    : doSpeak();
}

// ElevenLabs TTS — paylaşımlı AudioContext ile, her seferinde yeni context oluşturulmaz
async function speakElevenLabs(text, voiceId, audioRef, onStart, onEnd) {
  if (!ELEVENLABS_KEY) { speakBrowser(text, onStart, onEnd); return; }
  try {
    onStart?.();
    const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: { 'xi-api-key': ELEVENLABS_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text,
        model_id: 'eleven_turbo_v2_5',
        voice_settings: { stability: 0.5, similarity_boost: 0.75 },
      }),
    });
    if (!res.ok) throw new Error(`ElevenLabs ${res.status}`);
    const arrayBuffer = await res.arrayBuffer();
    const ctx = getAudioCtx();
    await ctx.resume(); // context askıdaysa kaldır
    const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
    const source = ctx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(ctx.destination);
    source.onended = () => { onEnd?.(); };
    source.start(0);
    if (audioRef) audioRef.current = { pause: () => { try { source.stop(); } catch {} } };
  } catch {
    onEnd?.();
  }
}

// ── Teknocan — gelişmiş 3D görünümlü SVG maskot ──────────────────────────────
function TeknocanSVG({ state = 'idle', isTalking = false }) {
  const [blinkOpen, setBlinkOpen] = useState(true);

  useEffect(() => {
    let t;
    const blink = () => {
      t = setTimeout(() => {
        setBlinkOpen(false);
        setTimeout(() => { setBlinkOpen(true); blink(); }, 120);
      }, 2600 + Math.random() * 2800);
    };
    blink();
    return () => clearTimeout(t);
  }, []);

  const bodyAnims = {
    idle:      { animate: { y: [0, -10, 0] },                              transition: { duration: 2.8, repeat: Infinity, ease: 'easeInOut' } },
    listening: { animate: { y: [0, -5, 0] },                               transition: { duration: 1.0, repeat: Infinity, ease: 'easeInOut' } },
    happy:     { animate: { y: [0,-24,-8,-17,0], rotate: [-7,7,-5,5,0] },  transition: { duration: 0.55, repeat: 3, ease: 'easeOut' } },
    thinking:  { animate: { rotate: [-4, 4, -4] },                         transition: { duration: 1.9, repeat: Infinity } },
    sad:       { animate: { y: [0, 6, 0] },                                transition: { duration: 2.5, repeat: Infinity } },
  };
  const ba = bodyAnims[state] || bodyAnims.idle;

  const mouthD = state === 'happy' ? 'M 46 80 Q 60 96 74 80'
               : state === 'sad'   ? 'M 50 88 Q 60 80 70 88'
               :                     'M 50 81 Q 60 88 70 81';

  const EAR_CY = 66;
  const ridgeOpacity = [0.18, 0.32, 0.44, 0.32, 0.18];
  const ridgeXsL = [8, 11, 14, 17, 20];
  const ridgeXsR = [93, 96, 99, 103, 106];

  return (
    <motion.div animate={ba.animate} transition={ba.transition} className="select-none relative">
      <svg viewBox="0 0 120 190" width="220" height="338" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          {/* ─ Gradients ─ */}
          <radialGradient id="tk-head" cx="36%" cy="28%" r="68%">
            <stop offset="0%"   stopColor="#FFF176" />
            <stop offset="30%"  stopColor="#FFE135" />
            <stop offset="65%"  stopColor="#FFC800" />
            <stop offset="100%" stopColor="#A07800" />
          </radialGradient>

          <radialGradient id="tk-head-rim" cx="50%" cy="50%" r="50%">
            <stop offset="70%" stopColor="transparent" />
            <stop offset="100%" stopColor="#7A5500" stopOpacity="0.5" />
          </radialGradient>

          <linearGradient id="tk-hood" x1="0" y1="0" x2="0.12" y2="1">
            <stop offset="0%"   stopColor="#2B5CE6" />
            <stop offset="45%"  stopColor="#1A3CB0" />
            <stop offset="100%" stopColor="#0D1F68" />
          </linearGradient>

          <linearGradient id="tk-hood-shine" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%"   stopColor="white" stopOpacity="0.10" />
            <stop offset="100%" stopColor="white" stopOpacity="0" />
          </linearGradient>

          <radialGradient id="tk-pod-l" cx="28%" cy="24%" r="76%">
            <stop offset="0%"   stopColor="#FFF176" />
            <stop offset="35%"  stopColor="#FFD700" />
            <stop offset="72%"  stopColor="#B08800" />
            <stop offset="100%" stopColor="#6B4E00" />
          </radialGradient>

          <radialGradient id="tk-pod-r" cx="72%" cy="24%" r="76%">
            <stop offset="0%"   stopColor="#FFF176" />
            <stop offset="35%"  stopColor="#FFD700" />
            <stop offset="72%"  stopColor="#B08800" />
            <stop offset="100%" stopColor="#6B4E00" />
          </radialGradient>

          <radialGradient id="tk-eye-l" cx="38%" cy="32%" r="60%">
            <stop offset="0%"   stopColor="#2A2A3E" />
            <stop offset="100%" stopColor="#050508" />
          </radialGradient>
          <radialGradient id="tk-eye-r" cx="62%" cy="32%" r="60%">
            <stop offset="0%"   stopColor="#2A2A3E" />
            <stop offset="100%" stopColor="#050508" />
          </radialGradient>

          <radialGradient id="tk-chest" cx="50%" cy="30%" r="70%">
            <stop offset="0%"   stopColor="#1A2F80" />
            <stop offset="100%" stopColor="#07123A" />
          </radialGradient>

          <radialGradient id="tk-fist-l" cx="35%" cy="30%" r="65%">
            <stop offset="0%"   stopColor="#FFF176" />
            <stop offset="55%"  stopColor="#FFD700" />
            <stop offset="100%" stopColor="#9A7200" />
          </radialGradient>
          <radialGradient id="tk-fist-r" cx="65%" cy="30%" r="65%">
            <stop offset="0%"   stopColor="#FFF176" />
            <stop offset="55%"  stopColor="#FFD700" />
            <stop offset="100%" stopColor="#9A7200" />
          </radialGradient>

          <radialGradient id="tk-neck" cx="40%" cy="25%" r="65%">
            <stop offset="0%"   stopColor="#E8C000" />
            <stop offset="100%" stopColor="#8A6000" />
          </radialGradient>

          {/* ─ Filters ─ */}
          <filter id="tk-shadow" x="-25%" y="-20%" width="150%" height="150%">
            <feDropShadow dx="0" dy="5" stdDeviation="7" floodColor="#000" floodOpacity="0.45" />
          </filter>
          <filter id="tk-inner-shadow" x="-10%" y="-10%" width="120%" height="120%">
            <feOffset dx="0" dy="2" />
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
          <filter id="tk-glow-gold">
            <feGaussianBlur stdDeviation="2.5" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <filter id="tk-glow-soft">
            <feGaussianBlur stdDeviation="1.2" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <filter id="tk-body-shadow" x="-15%" y="-10%" width="130%" height="130%">
            <feDropShadow dx="2" dy="6" stdDeviation="8" floodColor="#000" floodOpacity="0.5" />
          </filter>

          {/* ─ Clip paths ─ */}
          <clipPath id="tk-lear"><ellipse cx="17" cy={EAR_CY} rx="10" ry="13" /></clipPath>
          <clipPath id="tk-rear"><ellipse cx="103" cy={EAR_CY} rx="10" ry="13" /></clipPath>
          <clipPath id="tk-head-clip"><rect x="14" y="20" width="92" height="94" rx="30" ry="30" /></clipPath>
        </defs>

        {/* ══ SOL ANTEN ══ */}
        <motion.g
          style={{ transformOrigin: '48px 22px' }}
          animate={state === 'listening' ? { rotate: [-15, 5, -15] } : { rotate: 0 }}
          transition={{ duration: 0.48, repeat: state === 'listening' ? Infinity : 0 }}
        >
          <line x1="48" y1="22" x2="44" y2="5" stroke="#C09000" strokeWidth="4.5" strokeLinecap="round" />
          <line x1="48" y1="22" x2="44" y2="5" stroke="#FFD700" strokeWidth="3"   strokeLinecap="round" />
          <circle cx="44" cy="4.5" r="6.5" fill="#B08000" />
          <circle cx="44" cy="4.5" r="6"   fill="url(#tk-fist-l)" />
          <circle cx="42" cy="2.5" r="2.5" fill="white" opacity="0.55" />
          {state === 'listening' && (
            <motion.circle cx="44" cy="4.5" r="6" stroke="#FFE840" strokeWidth="2" fill="none"
              animate={{ r: [6, 14, 6], opacity: [1, 0, 1] }}
              transition={{ duration: 0.88, repeat: Infinity }}
            />
          )}
        </motion.g>

        {/* ══ SAĞ ANTEN ══ */}
        <motion.g
          style={{ transformOrigin: '72px 22px' }}
          animate={state === 'listening' ? { rotate: [15, -5, 15] } : { rotate: 0 }}
          transition={{ duration: 0.48, repeat: state === 'listening' ? Infinity : 0, delay: 0.14 }}
        >
          <line x1="72" y1="22" x2="76" y2="5" stroke="#C09000" strokeWidth="4.5" strokeLinecap="round" />
          <line x1="72" y1="22" x2="76" y2="5" stroke="#FFD700" strokeWidth="3"   strokeLinecap="round" />
          <circle cx="76" cy="4.5" r="6.5" fill="#B08000" />
          <circle cx="76" cy="4.5" r="6"   fill="url(#tk-fist-r)" />
          <circle cx="78" cy="2.5" r="2.5" fill="white" opacity="0.55" />
          {state === 'listening' && (
            <motion.circle cx="76" cy="4.5" r="6" stroke="#FFE840" strokeWidth="2" fill="none"
              animate={{ r: [6, 14, 6], opacity: [1, 0, 1] }}
              transition={{ duration: 0.88, repeat: Infinity, delay: 0.18 }}
            />
          )}
        </motion.g>

        {/* ══ SOL KULAK POD ══ */}
        <ellipse cx="19" cy="69" rx="10" ry="13" fill="#1A1200" opacity="0.55" />
        <ellipse cx="17" cy={EAR_CY} rx="10" ry="13" fill="url(#tk-pod-l)" filter="url(#tk-shadow)" />
        <g clipPath="url(#tk-lear)">
          {ridgeXsL.map((x, i) => (
            <line key={x} x1={x} y1="53" x2={x} y2="79"
              stroke="#3A2800" strokeWidth="1.8" opacity={ridgeOpacity[i]} strokeLinecap="round" />
          ))}
          <ellipse cx="10" cy="62" rx="3" ry="7" fill="white" opacity="0.22" />
        </g>

        {/* ══ SAĞ KULAK POD ══ */}
        <ellipse cx="101" cy="69" rx="10" ry="13" fill="#1A1200" opacity="0.55" />
        <ellipse cx="103" cy={EAR_CY} rx="10" ry="13" fill="url(#tk-pod-r)" filter="url(#tk-shadow)" />
        <g clipPath="url(#tk-rear)">
          {ridgeXsR.map((x, i) => (
            <line key={x} x1={x} y1="53" x2={x} y2="79"
              stroke="#3A2800" strokeWidth="1.8" opacity={ridgeOpacity[i]} strokeLinecap="round" />
          ))}
          <ellipse cx="110" cy="62" rx="3" ry="7" fill="white" opacity="0.22" />
        </g>

        {/* ══ KAFA ══ */}
        <rect x="14" y="20" width="92" height="94" rx="30" ry="30"
          fill="#A07800" filter="url(#tk-shadow)" />
        <rect x="14" y="20" width="92" height="94" rx="30" ry="30"
          fill="url(#tk-head)" />
        {/* Rim darkening */}
        <rect x="14" y="20" width="92" height="94" rx="30" ry="30"
          fill="url(#tk-head-rim)" />
        {/* Top specular highlight */}
        <ellipse cx="46" cy="38" rx="26" ry="14" fill="white" opacity="0.16"
          transform="rotate(-18 46 38)" clipPath="url(#tk-head-clip)" />
        <ellipse cx="38" cy="32" rx="12" ry="6"  fill="white" opacity="0.18"
          transform="rotate(-18 38 32)" clipPath="url(#tk-head-clip)" />

        {/* ══ KAŞLAR ══ */}
        <g filter="url(#tk-glow-soft)">
          {state === 'sad' ? (
            <>
              <path d="M 28 47 Q 42 43 56 42" stroke="#1A1200" strokeWidth="3" strokeLinecap="round" fill="none" />
              <path d="M 64 42 Q 78 43 92 47" stroke="#1A1200" strokeWidth="3" strokeLinecap="round" fill="none" />
            </>
          ) : state === 'happy' ? (
            <>
              <path d="M 28 47 Q 42 39 56 46" stroke="#1A1200" strokeWidth="3" strokeLinecap="round" fill="none" />
              <path d="M 64 46 Q 78 39 92 47" stroke="#1A1200" strokeWidth="3" strokeLinecap="round" fill="none" />
            </>
          ) : (
            <>
              <path d="M 28 46 Q 42 41 56 46" stroke="#1A1200" strokeWidth="3" strokeLinecap="round" fill="none" />
              <path d="M 64 46 Q 78 41 92 46" stroke="#1A1200" strokeWidth="3" strokeLinecap="round" fill="none" />
            </>
          )}
        </g>

        {/* ══ SOL GÖZ ══ */}
        <circle cx="42" cy="63" r="16.5" fill="#0A0A14" />
        <circle cx="42" cy="63" r="15.5" fill="url(#tk-eye-l)" />
        {/* Iris shimmer */}
        <motion.circle cx="42" cy="63" r="8" fill="#1E1E40" opacity="0.8"
          animate={state === 'thinking' ? { cx: [42, 47, 42, 37, 42] } : { cx: 42 }}
          transition={{ duration: 2.1, repeat: state === 'thinking' ? Infinity : 0 }}
        />
        {/* Pupil */}
        <motion.circle cx="42" cy="63" r="5.5" fill="#000010"
          animate={state === 'thinking' ? { cx: [42, 47, 42, 37, 42] } : { cx: 42 }}
          transition={{ duration: 2.1, repeat: state === 'thinking' ? Infinity : 0 }}
        />
        {/* Main specular */}
        <circle cx="48.5" cy="54.5" r="5.5" fill="white" opacity="0.90" />
        <circle cx="51"   cy="52.5" r="2.2" fill="white" opacity="0.60" />
        {/* Secondary small spec */}
        <circle cx="36.5" cy="70"   r="2"   fill="white" opacity="0.20" />
        {/* Blink lid */}
        <motion.rect x="26" y="47" width="32" height="32" rx="16" fill="#FFD700"
          animate={{ scaleY: blinkOpen ? 0.001 : 1 }}
          transition={{ duration: 0.07 }}
          style={{ transformOrigin: '42px 63px' }}
        />

        {/* ══ SAĞ GÖZ ══ */}
        <circle cx="78" cy="63" r="16.5" fill="#0A0A14" />
        <circle cx="78" cy="63" r="15.5" fill="url(#tk-eye-r)" />
        <motion.circle cx="78" cy="63" r="8" fill="#1E1E40" opacity="0.8"
          animate={state === 'thinking' ? { cx: [78, 83, 78, 73, 78] } : { cx: 78 }}
          transition={{ duration: 2.1, repeat: state === 'thinking' ? Infinity : 0 }}
        />
        <motion.circle cx="78" cy="63" r="5.5" fill="#000010"
          animate={state === 'thinking' ? { cx: [78, 83, 78, 73, 78] } : { cx: 78 }}
          transition={{ duration: 2.1, repeat: state === 'thinking' ? Infinity : 0 }}
        />
        <circle cx="84.5" cy="54.5" r="5.5" fill="white" opacity="0.90" />
        <circle cx="87"   cy="52.5" r="2.2" fill="white" opacity="0.60" />
        <circle cx="72.5" cy="70"   r="2"   fill="white" opacity="0.20" />
        <motion.rect x="62" y="47" width="32" height="32" rx="16" fill="#FFD700"
          animate={{ scaleY: blinkOpen ? 0.001 : 1 }}
          transition={{ duration: 0.07 }}
          style={{ transformOrigin: '78px 63px' }}
        />

        {/* ══ AĞIZ ══ */}
        {isTalking ? (
          <motion.ellipse cx="60" cy="84" rx="8" ry="5" fill="#1A0800"
            animate={{ ry: [4, 8, 4] }}
            transition={{ duration: 0.26, repeat: Infinity, ease: 'easeInOut' }}
          />
        ) : (
          <path d={mouthD} stroke="#1A0800" strokeWidth="2.6" strokeLinecap="round" fill="none" />
        )}

        {/* Yanak kızarması (happy) */}
        {state === 'happy' && (
          <>
            <motion.circle cx="22" cy="74" r="10" fill="#FF7055" opacity="0.35"
              animate={{ r: [9, 11, 9], opacity: [0.28, 0.42, 0.28] }}
              transition={{ duration: 0.8, repeat: Infinity }}
            />
            <motion.circle cx="98" cy="74" r="10" fill="#FF7055" opacity="0.35"
              animate={{ r: [9, 11, 9], opacity: [0.28, 0.42, 0.28] }}
              transition={{ duration: 0.8, repeat: Infinity, delay: 0.15 }}
            />
          </>
        )}

        {/* ══ BOYUN ══ */}
        <rect x="51" y="109" width="18" height="14" rx="7" fill="#8A6200" />
        <rect x="51" y="109" width="18" height="14" rx="7" fill="url(#tk-neck)" />
        <rect x="54" y="110" width="7"  height="3"  rx="1.5" fill="white" opacity="0.18" />

        {/* ══ HOODIE GÖVDE ══ */}
        {/* Shadow shape behind body */}
        <path d="M 18 122 Q 14 154 17 182 L 103 182 Q 106 154 102 122 Q 82 115 60 115 Q 38 115 18 122 Z"
          fill="#050A28" opacity="0.6" transform="translate(2,4)" />
        {/* Main body */}
        <path d="M 18 122 Q 14 154 17 182 L 103 182 Q 106 154 102 122 Q 82 115 60 115 Q 38 115 18 122 Z"
          fill="url(#tk-hood)" filter="url(#tk-body-shadow)" />
        {/* Shine on left shoulder */}
        <path d="M 18 122 Q 38 115 60 115 Q 38 116 22 126 Q 16 140 17 160 Q 14 142 18 122 Z"
          fill="url(#tk-hood-shine)" />
        {/* Centre seam */}
        <line x1="60" y1="115" x2="60" y2="182" stroke="white" strokeWidth="0.8" opacity="0.07" />
        {/* Right side shadow */}
        <path d="M 60 115 Q 82 115 102 122 Q 106 154 103 182 L 60 182 Z"
          fill="black" opacity="0.10" />
        {/* Hoodie draw-strings */}
        <circle cx="55" cy="129" r="3" fill="#C0A000" opacity="0.55" />
        <circle cx="65" cy="129" r="3" fill="#C0A000" opacity="0.55" />
        <line x1="55" y1="132" x2="52" y2="154" stroke="#C0A000" strokeWidth="1.3" opacity="0.35" strokeLinecap="round" />
        <line x1="65" y1="132" x2="68" y2="154" stroke="#C0A000" strokeWidth="1.3" opacity="0.35" strokeLinecap="round" />

        {/* ══ GÖĞÜS PANELİ ══ */}
        <rect x="44" y="133" width="32" height="34" rx="8" fill="#040E38" opacity="0.7" />
        <rect x="44" y="133" width="32" height="34" rx="8" fill="url(#tk-chest)" />
        <rect x="44" y="133" width="32" height="8"  rx="8" fill="white" opacity="0.05" />
        {/* LED strip top */}
        <rect x="47" y="137" width="26" height="2" rx="1" fill="#3B5BDB" opacity="0.6" />
        {/* Turkcell T */}
        <text x="60" y="159" textAnchor="middle" fill="#FFD700" fontSize="20" fontWeight="900"
          fontFamily="Arial Black, Arial, sans-serif" filter="url(#tk-glow-gold)">T</text>
        {/* Bottom LED */}
        <rect x="47" y="163" width="26" height="2" rx="1" fill="#3B5BDB" opacity="0.4" />

        {/* ══ SOL KOL ══ */}
        <path d="M 21 128 Q 8 145 12 163"
          stroke="#0D1F68" strokeWidth="22" strokeLinecap="round" fill="none" />
        <path d="M 21 128 Q 8 145 12 163"
          stroke="#1A3CB0" strokeWidth="18" strokeLinecap="round" fill="none" />
        {/* Left fist */}
        <circle cx="12"  cy="165" r="11.5" fill="#8A6200" />
        <circle cx="12"  cy="165" r="11"   fill="url(#tk-fist-l)" />
        <circle cx="15"  cy="160" r="4.5"  fill="white" opacity="0.45" />
        <circle cx="8.5" cy="170" r="2.5"  fill="white" opacity="0.12" />

        {/* ══ SAĞ KOL ══ */}
        <motion.g
          animate={state === 'idle' || state === 'happy' ? { rotate: [0, -20, 0, -14, 0] } : { rotate: 0 }}
          style={{ transformOrigin: '99px 128px' }}
          transition={state === 'idle'
            ? { duration: 3, repeat: Infinity, ease: 'easeInOut' }
            : { duration: 0.38, repeat: state === 'happy' ? 4 : 0 }}
        >
          <path d="M 99 128 Q 112 145 108 163"
            stroke="#0D1F68" strokeWidth="22" strokeLinecap="round" fill="none" />
          <path d="M 99 128 Q 112 145 108 163"
            stroke="#1A3CB0" strokeWidth="18" strokeLinecap="round" fill="none" />
        </motion.g>
        {/* Right fist */}
        <circle cx="108" cy="165" r="11.5" fill="#8A6200" />
        <circle cx="108" cy="165" r="11"   fill="url(#tk-fist-r)" />
        <circle cx="111" cy="160" r="4.5"  fill="white" opacity="0.45" />
        <circle cx="104.5" cy="170" r="2.5" fill="white" opacity="0.12" />

        {/* ══ DİNLEME DALGALARI ══ */}
        {state === 'listening' && (
          <>
            <motion.path d="M 7 77 Q 1 67 7 57"   stroke="#FFD700" strokeWidth="2.8" fill="none" strokeLinecap="round"
              animate={{ opacity: [0,1,0] }} transition={{ duration: 0.82, repeat: Infinity }} />
            <motion.path d="M 3 82 Q -5 67 3 52"  stroke="#FFD700" strokeWidth="2.2" fill="none" strokeLinecap="round"
              animate={{ opacity: [0,1,0] }} transition={{ duration: 0.82, repeat: Infinity, delay: 0.22 }} />
            <motion.path d="M 113 77 Q 119 67 113 57" stroke="#FFD700" strokeWidth="2.8" fill="none" strokeLinecap="round"
              animate={{ opacity: [0,1,0] }} transition={{ duration: 0.82, repeat: Infinity, delay: 0.1 }} />
            <motion.path d="M 117 82 Q 125 67 117 52" stroke="#FFD700" strokeWidth="2.2" fill="none" strokeLinecap="round"
              animate={{ opacity: [0,1,0] }} transition={{ duration: 0.82, repeat: Infinity, delay: 0.32 }} />
          </>
        )}

        {/* ══ KONUŞMA SES DALGASI ══ */}
        {isTalking && (
          <g transform="translate(60, 186)">
            {[3,5,8,6,4,7,5,3].map((h, i) => (
              <motion.rect key={i}
                x={(i - 4) * 5.5 + 2.5} y={-h} width="4" height={h} rx="2"
                fill="#FFD700" filter="url(#tk-glow-gold)"
                animate={{ height: [h, h * 2.5, h], y: [-h, -h * 2.5, -h] }}
                transition={{ duration: 0.3, repeat: Infinity, delay: i * 0.05 }}
              />
            ))}
          </g>
        )}
      </svg>
    </motion.div>
  );
}

// ── Konuşma Balonu ────────────────────────────────────────────────────────────
function SpeechBubble({ text, visible }) {
  return (
    <AnimatePresence>
      {visible && text && (
        <motion.div
          initial={{ opacity: 0, scale: 0.82, y: 10 }}
          animate={{ opacity: 1, scale: 1,    y: 0  }}
          exit={{    opacity: 0, scale: 0.82, y: 10 }}
          transition={{ type: 'spring', stiffness: 340, damping: 24 }}
          className="relative bg-white text-gray-800 rounded-2xl rounded-bl-sm
                     px-4 py-3 max-w-[260px] shadow-xl shadow-indigo-200/70"
        >
          <p className="text-sm leading-relaxed font-medium">{text}</p>
          <div className="absolute -bottom-2.5 left-5 w-5 h-5 bg-white"
            style={{ clipPath: 'polygon(0 0, 100% 0, 0 100%)' }} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ── Puan Yıldızları ───────────────────────────────────────────────────────────
function ScoreStars({ score }) {
  const stars = Math.round((score / 100) * 5);
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((s) => (
        <motion.div key={s}
          initial={{ scale: 0, rotate: -30 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ delay: s * 0.1, type: 'spring', stiffness: 400 }}
        >
          <Star className={`w-6 h-6 ${s <= stars ? 'fill-yellow-400 text-yellow-400' : 'text-slate-300'}`} />
        </motion.div>
      ))}
    </div>
  );
}

// ── Ana Sayfa ─────────────────────────────────────────────────────────────────
export default function CoachPage() {
  const [activeMascot, setActiveMascot]   = useState('voxera');
  const SCENARIOS = activeMascot === 'voxera' ? VOXERA_SCENARIOS : TEKNOCAN_SCENARIOS;
  const [activeScenario, setActiveScenario] = useState(VOXERA_SCENARIOS[0]);

  // Maskot animasyon state'leri
  const [mascotState, setMascotState]     = useState('idle');
  const [isTalking, setIsTalking]         = useState(false);
  const [bubbleText, setBubbleText]       = useState('');
  const [bubbleVisible, setBubbleVisible] = useState(false);
  const [ttsEnabled, setTtsEnabled]       = useState(true);

  // Simülasyon state'leri
  // 'idle' | 'customer_speaking' | 'agent_turn' | 'recording' | 'ai_thinking' | 'ended'
  const [simState, setSimState]           = useState('idle');
  const [chatHistory, setChatHistory]     = useState([]);
  const [agentInput, setAgentInput]       = useState('');
  const [isRecording, setIsRecording]     = useState(false);
  const [liveTranscript, setLiveTranscript] = useState('');
  const [evalResult, setEvalResult]       = useState(null);

  const recognitionRef      = useRef(null);
  const bubbleTimerRef      = useRef(null);
  const chatBottomRef       = useRef(null);
  const chatContainerRef    = useRef(null);
  const liveTranscriptRef   = useRef('');
  const sendAgentMsgRef     = useRef(null);
  const startRecordingRef   = useRef(null);
  const audioRef            = useRef(null);

  // Yalnızca chat kutusunu kaydır, sayfayı değil
  useEffect(() => {
    const el = chatContainerRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [chatHistory, simState]);

  // Maskot konuşma balonu — ElevenLabs sesi
  const mascotSpeak = useCallback((text, nextState = 'idle', onComplete) => {
    setBubbleText(text);
    setBubbleVisible(true);
    clearTimeout(bubbleTimerRef.current);
    if (!ttsEnabled) {
      setMascotState(nextState);
      bubbleTimerRef.current = setTimeout(() => { setBubbleVisible(false); onComplete?.(); }, 4500);
      return;
    }
    const voiceId = activeMascot === 'voxera' ? VOICE_VOXI : VOICE_TEKNOCAN;
    speakElevenLabs(text, voiceId, audioRef,
      () => setIsTalking(true),
      () => {
        setIsTalking(false);
        setMascotState(nextState);
        bubbleTimerRef.current = setTimeout(() => { setBubbleVisible(false); onComplete?.(); }, 800);
      },
    );
  }, [ttsEnabled, activeMascot]);

  // Senaryo / maskot değişimi
  const changeScenario = (s) => {
    stopSim();
    setActiveScenario(s);
  };
  const switchMascot = (m) => {
    stopSim();
    setActiveMascot(m);
    const list = m === 'voxera' ? VOXERA_SCENARIOS : TEKNOCAN_SCENARIOS;
    setActiveScenario(list[0]);
  };

  // Müşteri de ElevenLabs sesiyle konuşur
  const speakCustomerTurn = useCallback((text, onDone) => {
    if (!ttsEnabled) { onDone(); return; }
    const voiceId = activeMascot === 'voxera' ? VOICE_VOXI : VOICE_TEKNOCAN;
    speakElevenLabs(text, voiceId, audioRef,
      () => setIsTalking(true),
      () => { setIsTalking(false); onDone(); },
    );
  }, [ttsEnabled, activeMascot]);

  // Simülasyonu başlat
  const startSim = () => {
    wakeAudio(); // AudioContext'i user gesture anında resume et
    window.speechSynthesis?.cancel();
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    recognitionRef.current?.stop();
    const opening = { role: 'customer', text: activeScenario.startMsg, time: nowStr() };
    setChatHistory([opening]);
    setSimState('customer_speaking');
    setEvalResult(null);
    setAgentInput('');
    setLiveTranscript('');
    liveTranscriptRef.current = '';
    setMascotState('listening');
    mascotSpeak(activeScenario.mascotMesaj, 'listening', () => {
      speakCustomerTurn(activeScenario.startMsg, () => {
        setSimState('agent_turn');
        setMascotState('idle');
      });
    });
  };

  // Simülasyonu durdur / sıfırla
  const stopSim = () => {
    recognitionRef.current?.stop();
    window.speechSynthesis?.cancel();
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    setSimState('idle');
    setChatHistory([]);
    setEvalResult(null);
    setAgentInput('');
    setIsRecording(false);
    setLiveTranscript('');
    setMascotState('idle');
    setBubbleVisible(false);
    setIsTalking(false);
  };

  // Temsilci mesajı gönder → AI müşteri cevabı al
  const sendAgentMessage = useCallback(async (text) => {
    const trimmed = text?.trim();
    if (!trimmed || simState === 'idle' || simState === 'customer_speaking' || simState === 'ai_thinking' || simState === 'ended') return;

    const agentMsg = { role: 'agent', text: trimmed, time: nowStr() };
    const newHistory = [...chatHistory, agentMsg];
    setChatHistory(newHistory);
    setAgentInput('');
    setLiveTranscript('');
    liveTranscriptRef.current = '';
    setSimState('ai_thinking');
    setMascotState('thinking');

    try {
      if (!GROQ_KEY) throw new Error('no key');

      const messages = [
        { role: 'system', content: activeScenario.systemPrompt },
        ...newHistory.map(m => ({
          role: m.role === 'customer' ? 'assistant' : 'user',
          content: m.text,
        })),
      ];

      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${GROQ_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'llama-3.3-70b-versatile', messages, temperature: 0.75, max_tokens: 120 }),
      });
      const data = await res.json();
      const customerReply = data.choices?.[0]?.message?.content?.trim() || 'Anlamadım, tekrar eder misiniz?';

      const custMsg = { role: 'customer', text: customerReply, time: nowStr() };
      setChatHistory(prev => [...prev, custMsg]);
      setSimState('customer_speaking');
      setMascotState('listening');
      // Müşteri cevabını sesli oku, bitince temsilci sırası
      speakCustomerTurn(customerReply, () => {
        setSimState('agent_turn');
        setMascotState('idle');
        setTimeout(() => startRecordingRef.current?.(), 600);
      });
    } catch {
      setChatHistory(prev => [...prev, { role: 'customer', text: '(Bağlantı hatası — API anahtarını kontrol et)', time: nowStr() }]);
      setSimState('agent_turn');
      setMascotState('sad');
    }
  }, [simState, chatHistory, activeScenario, speakCustomerTurn]);

  // Simülasyonu bitir → değerlendirme
  const endSim = useCallback(async () => {
    if (chatHistory.length < 2) { stopSim(); return; }
    setSimState('ai_thinking');
    setMascotState('thinking');
    mascotSpeak('Görüşmeyi değerlendiriyorum...', 'thinking');

    const transcript = chatHistory.map(m =>
      `${m.role === 'customer' ? 'Müşteri' : 'Temsilci'}: ${m.text}`
    ).join('\n');

    try {
      const evalPrompt = `Aşağıdaki simülasyon görüşmesinde temsilcinin performansını değerlendir.
Senaryo: ${activeScenario.label} — ${activeScenario.desc}
Görüşme:\n${transcript}
Yalnızca JSON döndür:
{"empati":0-25,"cozumOdaklilik":0-25,"iletisim":0-25,"profesyonellik":0-25,"toplam":0-100,"geri_bildirim":"2-3 cümle Türkçe geri bildirim"}`;

      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${GROQ_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [{ role: 'user', content: evalPrompt }],
          response_format: { type: 'json_object' },
          temperature: 0.2,
        }),
      });
      const data = await res.json();
      const parsed = JSON.parse(data.choices[0].message.content);
      setEvalResult(parsed);
      setSimState('ended');

      const total = parsed.toplam ?? 0;
      if (total >= 75) { setMascotState('happy'); mascotSpeak('Harika performans! Gerçek bir profesyonel gibi yönettin!', 'happy'); }
      else if (total >= 40) { setMascotState('idle'); mascotSpeak('Fena değil! Birkaç noktayı geliştirirsen mükemmel olacak.', 'idle'); }
      else { setMascotState('sad'); mascotSpeak('Bu senaryo zordu. Tekrar dene, her seferinde daha iyi olacaksın!', 'sad'); }
    } catch {
      setEvalResult({ empati: 0, cozumOdaklilik: 0, iletisim: 0, profesyonellik: 0, toplam: 0, geri_bildirim: 'Değerlendirme yapılamadı (API hatası).' });
      setSimState('ended');
      setMascotState('sad');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatHistory, activeScenario, mascotSpeak]);

  // Mikrofon kaydı
  const startRecording = useCallback(() => {
    wakeAudio(); // Ses kaydı başlangıcında da context'i canlı tut
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { mascotSpeak('Chrome kullanman gerekiyor!', 'sad'); return; }
    const rec = new SR();
    rec.lang = 'tr-TR'; rec.continuous = false; rec.interimResults = true;
    rec.onresult = (e) => {
      const t = Array.from(e.results).map(r => r[0].transcript).join(' ');
      setLiveTranscript(t);
      liveTranscriptRef.current = t;
    };
    rec.onend = () => {
      setIsRecording(false);
      const t = liveTranscriptRef.current.trim();
      if (t) {
        sendAgentMsgRef.current?.(t);
        setLiveTranscript('');
        liveTranscriptRef.current = '';
      } else {
        setSimState('agent_turn');
      }
    };
    rec.onerror = () => {
      setIsRecording(false);
      setSimState('agent_turn');
      mascotSpeak('Sesi duyamadım, tekrar dene!', 'sad');
    };
    recognitionRef.current = rec;
    rec.start();
    setIsRecording(true);
    setSimState('recording');
    setLiveTranscript('');
    liveTranscriptRef.current = '';
    setMascotState('listening');
  }, [mascotSpeak]);

  // Ref'leri güncelle (circular dep'i kırmak için)
  sendAgentMsgRef.current   = sendAgentMessage;
  startRecordingRef.current = startRecording;

  const stopRecording = useCallback(() => { recognitionRef.current?.stop(); }, []);

  useEffect(() => () => { stopRecording(); window.speechSynthesis?.cancel(); clearTimeout(bubbleTimerRef.current); }, [stopRecording]);

  return (
    <div className="min-h-screen bg-dark-900 text-slate-800 font-sans pb-16">

      {/* Header */}
      <div className="border-b border-indigo-100 bg-dark-800/60 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center gap-3">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shadow-lg transition-all duration-300 ${
            activeMascot === 'voxera'
              ? 'bg-gradient-to-br from-violet-500 to-purple-700 shadow-violet-500/20'
              : 'bg-gradient-to-br from-blue-500 to-yellow-400 shadow-blue-500/20'
          }`}>
            {activeMascot === 'voxera'
              ? <Sparkles className="w-5 h-5 text-white" />
              : <GraduationCap className="w-5 h-5 text-white" />}
          </div>
          <div>
            <h1 className="text-lg font-display font-bold text-slate-800 leading-none">Dijital Koç</h1>
            <p className="text-xs text-slate-400 mt-0.5">
              {activeMascot === 'voxera' ? 'Voxi · SafeVox AI koç' : 'Teknocan · Türkcell\'e özel eğitim'}
            </p>
          </div>

          {/* Mascot switcher */}
          <div className="mx-auto flex items-center bg-indigo-50/80 border border-indigo-100 rounded-xl p-1 gap-1">
            <button
              onClick={() => switchMascot('voxera')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                activeMascot === 'voxera'
                  ? 'bg-gradient-to-r from-violet-500 to-purple-600 text-white shadow-md shadow-violet-400/30'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              Voxi
            </button>
            <button
              onClick={() => switchMascot('teknocan')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                activeMascot === 'teknocan'
                  ? 'bg-gradient-to-r from-yellow-400 to-amber-500 text-gray-900 shadow-md shadow-yellow-400/30'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <GraduationCap className="w-4 h-4" />
              Teknocan
              <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-white/30 font-mono">TC</span>
            </button>
          </div>

          <div className="ml-auto flex items-center gap-3">
            <button
              onClick={() => { setTtsEnabled((p) => !p); window.speechSynthesis?.cancel(); setIsTalking(false); }}
              title={ttsEnabled ? 'Sesi kapat' : 'Sesi aç'}
              className={`p-2 rounded-lg border transition-all ${
                ttsEnabled
                  ? activeMascot === 'voxera'
                    ? 'bg-violet-500/15 border-violet-500/30 text-violet-500'
                    : 'bg-yellow-500/15 border-yellow-500/30 text-yellow-400'
                  : 'bg-indigo-50/60 border-indigo-100 text-slate-400'
              }`}
            >
              {ttsEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8">

        {/* Senaryo Seçici */}
        <div className="flex items-center gap-2 mb-8 flex-wrap">
          {SCENARIOS.map((s) => (
            <button key={s.id} onClick={() => changeScenario(s)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium
                          transition-all duration-200 border ${
                activeScenario.id === s.id
                  ? activeMascot === 'voxera'
                    ? 'bg-violet-500/15 border-violet-500/40 text-violet-600'
                    : 'bg-yellow-400/15 border-yellow-400/40 text-yellow-600'
                  : 'bg-dark-800/60 border-indigo-100 text-slate-400 hover:text-slate-600 hover:border-indigo-200'
              }`}
            >
              <span>{s.emoji}</span><span>{s.label}</span>
            </button>
          ))}
        </div>

        <div className="grid md:grid-cols-[340px_1fr] gap-8 items-start">

          {/* Sol: Maskot */}
          <div className="flex flex-col items-center gap-2 md:sticky md:top-14 -mt-6">
            <div className="relative flex justify-center">
              {/* Konuşma balonu — karakterin üstüne overlay */}
              <div className="absolute -top-24 left-0 w-full flex items-end z-10">
                <SpeechBubble text={bubbleText} visible={bubbleVisible} />
              </div>

              <AnimatePresence mode="wait">
                {activeMascot === 'voxera' ? (
                  <motion.div key="voxera"
                    initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.85 }}
                    transition={{ duration: 0.25 }} className="relative">
                    <div className="absolute bottom-4 w-56 h-10 bg-violet-500/20 blur-2xl rounded-full left-1/2 -translate-x-1/2" />
                    <VoxeraHead state={mascotState} isTalking={isTalking} size={380} />
                  </motion.div>
                ) : (
                  <motion.div key="teknocan"
                    initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.85 }}
                    transition={{ duration: 0.25 }} className="relative">
                    <div className="absolute bottom-4 w-36 h-8 bg-yellow-400/20 blur-2xl rounded-full" />
                    <TeknocanSVG state={mascotState} isTalking={isTalking} />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="text-center">
              <p className="text-sm font-bold text-slate-800">
                {activeMascot === 'voxera' ? 'Voxi' : 'Teknocan'}
              </p>
              <p className="text-xs text-slate-400">
                {activeMascot === 'voxera' ? 'SafeVox AI Koç' : 'Dijital Koç · Türkcell'}
              </p>
            </div>
          </div>

          {/* Sağ: Simülasyon */}
          <div className="flex flex-col gap-4">

            {/* ── IDLE: Senaryo Kartı ── */}
            {simState === 'idle' && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className="bg-dark-800 border border-indigo-100 rounded-2xl p-6 space-y-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-2xl mb-2">{activeScenario.emoji}</p>
                    <h2 className="text-lg font-bold text-slate-800">{activeScenario.label}</h2>
                    <p className="text-sm text-slate-500 mt-1 leading-relaxed">{activeScenario.desc}</p>
                  </div>
                  <span className={`text-xs font-bold px-3 py-1.5 rounded-full border ${activeScenario.diffColor}`}>
                    {activeScenario.difficulty}
                  </span>
                </div>
                <div className="bg-indigo-50/60 border border-indigo-100 rounded-xl p-4">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Müşteri Açılış Cümlesi</p>
                  <p className="text-sm text-slate-700 italic leading-relaxed">"{activeScenario.startMsg}"</p>
                </div>
                <button onClick={startSim}
                  className={`w-full flex items-center justify-center gap-3 py-4 rounded-2xl font-bold text-sm shadow-lg transition-all active:scale-95 ${
                    activeMascot === 'voxera'
                      ? 'bg-gradient-to-r from-violet-500 to-purple-600 text-white shadow-violet-500/25 hover:from-violet-400 hover:to-purple-500'
                      : 'bg-gradient-to-r from-yellow-500 to-amber-400 text-gray-900 shadow-yellow-500/25 hover:from-yellow-400 hover:to-amber-300'
                  }`}>
                  <Zap className="w-5 h-5" />
                  Simülasyonu Başlat
                </button>
              </motion.div>
            )}

            {/* ── VOICE SIM: Sohbet + Ses Fazları ── */}
            {['customer_speaking','agent_turn','recording','ai_thinking'].includes(simState) && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-3">

                {/* Üst bar */}
                <div className="flex items-center justify-between bg-dark-800 border border-indigo-100 rounded-2xl px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{activeScenario.emoji}</span>
                    <div>
                      <p className="text-sm font-bold text-slate-700">{activeScenario.label}</p>
                      <p className="text-xs text-slate-400">{chatHistory.filter(m=>m.role==='agent').length} yanıt verildi</p>
                    </div>
                  </div>
                  <button onClick={endSim}
                    disabled={simState === 'ai_thinking' || simState === 'customer_speaking'}
                    className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl
                               bg-emerald-500 hover:bg-emerald-400 text-white transition-all
                               disabled:opacity-40 disabled:cursor-not-allowed shadow-md shadow-emerald-500/20">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Bitir & Değerlendir
                  </button>
                </div>

                {/* Chat geçmişi */}
                <div ref={chatContainerRef} className="bg-dark-800 border border-indigo-100 rounded-2xl p-4 space-y-3 overflow-y-auto"
                  style={{ minHeight: '240px', maxHeight: '340px' }}>
                  <AnimatePresence initial={false}>
                    {chatHistory.map((msg, i) => (
                      <motion.div key={i}
                        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                        className={`flex gap-2.5 ${msg.role === 'agent' ? 'flex-row-reverse' : ''}`}>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm flex-shrink-0 shadow-sm ${
                          msg.role === 'customer' ? 'bg-red-100 border border-red-200' : 'bg-indigo-100 border border-indigo-200'
                        }`}>
                          {msg.role === 'customer' ? activeScenario.emoji : '🎧'}
                        </div>
                        <div className={`max-w-[78%] ${msg.role === 'agent' ? 'items-end flex flex-col' : ''}`}>
                          <div className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                            msg.role === 'customer'
                              ? 'bg-red-50 border border-red-100 text-slate-700 rounded-tl-sm'
                              : 'bg-indigo-600 text-white rounded-tr-sm shadow-md shadow-indigo-500/20'
                          }`}>
                            {msg.text}
                          </div>
                          <p className="text-[10px] text-slate-400 mt-1 px-1">{msg.time}</p>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>

                  {simState === 'ai_thinking' && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-red-100 border border-red-200 flex items-center justify-center text-sm flex-shrink-0">{activeScenario.emoji}</div>
                      <div className="bg-red-50 border border-red-100 rounded-2xl rounded-tl-sm px-4 py-2.5">
                        <div className="flex gap-1.5 items-center h-5">
                          {[0,1,2].map((j) => (
                            <motion.div key={j} className="w-2 h-2 rounded-full bg-red-300"
                              animate={{ y: [0, -5, 0] }}
                              transition={{ duration: 0.55, repeat: Infinity, delay: j * 0.15 }} />
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  )}
                  <div ref={chatBottomRef} />
                </div>

                {/* ── Ses fazı paneli ── */}
                <AnimatePresence mode="wait">

                  {/* Müşteri konuşuyor */}
                  {simState === 'customer_speaking' && (
                    <motion.div key="cust-speak"
                      initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6 }}
                      className="bg-red-50 border border-red-100 rounded-2xl px-5 py-4 flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-red-100 border border-red-200 flex items-center justify-center text-2xl flex-shrink-0">
                        {activeScenario.emoji}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-red-700 mb-2">Müşteri konuşuyor...</p>
                        <div className="flex gap-1 items-end h-5">
                          {[8,14,10,17,11,7,13,9].map((h, i) => (
                            <motion.div key={i} className="w-1.5 bg-red-400 rounded-full"
                              animate={{ height: [h * 0.4, h, h * 0.4] }}
                              transition={{ duration: 0.38, repeat: Infinity, delay: i * 0.065 }}
                              style={{ height: h }}
                            />
                          ))}
                        </div>
                      </div>
                      <button
                        onClick={() => { window.speechSynthesis?.cancel(); setIsTalking(false); setSimState('agent_turn'); setMascotState('idle'); }}
                        className="text-xs text-red-500 hover:text-red-700 border border-red-200 px-3 py-1.5 rounded-lg hover:bg-red-100 transition flex-shrink-0">
                        Atla →
                      </button>
                    </motion.div>
                  )}

                  {/* Temsilci sırası — büyük mikrofon */}
                  {simState === 'agent_turn' && (
                    <motion.div key="agent-turn"
                      initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6 }}
                      className="bg-dark-800 border border-indigo-100 rounded-2xl px-5 py-5 flex flex-col items-center gap-4">
                      <p className="text-sm text-slate-500 font-medium">Sıra sizde — mikrofona basın ve konuşun</p>
                      <motion.button
                        onClick={startRecording}
                        animate={{ boxShadow: [
                          '0 0 0 0px rgba(99,102,241,0.35)',
                          '0 0 0 18px rgba(99,102,241,0)',
                          '0 0 0 0px rgba(99,102,241,0)',
                        ]}}
                        transition={{ duration: 1.8, repeat: Infinity }}
                        className={`w-24 h-24 rounded-full flex items-center justify-center text-white shadow-xl transition-all active:scale-95 ${
                          activeMascot === 'voxera'
                            ? 'bg-gradient-to-br from-violet-500 to-purple-700 shadow-violet-500/30 hover:from-violet-400 hover:to-purple-600'
                            : 'bg-gradient-to-br from-yellow-400 to-amber-500 shadow-yellow-500/30 hover:from-yellow-300 hover:to-amber-400'
                        }`}
                      >
                        <Mic className="w-9 h-9" />
                      </motion.button>
                      {/* Yazarak fallback */}
                      <div className="w-full flex gap-2 items-center">
                        <input type="text"
                          value={agentInput}
                          onChange={e => setAgentInput(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter' && agentInput.trim()) { wakeAudio(); sendAgentMessage(agentInput); setAgentInput(''); }}}
                          placeholder="Yazarak da yanıtlayabilirsiniz..."
                          className="flex-1 text-sm text-slate-600 placeholder:text-slate-300 bg-indigo-50/60 border border-indigo-100 rounded-xl px-4 py-2.5 focus:outline-none focus:border-indigo-300 transition"
                        />
                        <button onClick={() => { if(agentInput.trim()) { wakeAudio(); sendAgentMessage(agentInput); setAgentInput(''); }}}
                          disabled={!agentInput.trim()}
                          className={`p-2.5 rounded-xl transition disabled:opacity-30 ${
                            activeMascot === 'voxera' ? 'bg-violet-100 text-violet-600 hover:bg-violet-200' : 'bg-amber-100 text-amber-600 hover:bg-amber-200'
                          }`}>
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </motion.div>
                  )}

                  {/* Kayıt yapılıyor */}
                  {simState === 'recording' && (
                    <motion.div key="recording"
                      initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6 }}
                      className="bg-dark-800 border border-red-200/70 rounded-2xl px-5 py-5 flex flex-col items-center gap-4">
                      <motion.button
                        onClick={stopRecording}
                        animate={{ scale: [1, 1.07, 1] }}
                        transition={{ duration: 0.65, repeat: Infinity }}
                        className="w-24 h-24 rounded-full bg-red-500 hover:bg-red-400 flex items-center justify-center text-white shadow-xl shadow-red-500/35 active:scale-95 transition-colors"
                      >
                        <Mic className="w-9 h-9" />
                      </motion.button>
                      <p className="text-sm font-semibold text-red-500">Dinliyorum... konuşabilirsiniz</p>
                      {liveTranscript && (
                        <div className="w-full bg-indigo-50/60 border border-indigo-100 rounded-xl px-4 py-2.5 text-sm text-slate-600 italic">
                          {liveTranscript}
                        </div>
                      )}
                      <p className="text-xs text-slate-400">Bitirmek için tekrar basın</p>
                    </motion.div>
                  )}

                  {/* AI düşünüyor — sade placeholder */}
                  {simState === 'ai_thinking' && (
                    <motion.div key="ai-think"
                      initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6 }}
                      className="bg-indigo-50/60 border border-indigo-100 rounded-2xl px-5 py-4 flex items-center gap-3">
                      <Loader2 className="w-4 h-4 text-indigo-400 animate-spin flex-shrink-0" />
                      <p className="text-sm text-indigo-500 font-medium">Müşteri cevaplıyor...</p>
                    </motion.div>
                  )}

                </AnimatePresence>
              </motion.div>
            )}

            {/* ── ENDED: Değerlendirme ── */}
            {simState === 'ended' && evalResult && (
              <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
                className="bg-dark-800 border border-indigo-100 rounded-2xl p-6 space-y-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Simülasyon Sonucu</p>
                    <p className={`text-5xl font-bold font-mono mt-1 ${
                      evalResult.toplam >= 75 ? 'text-emerald-500' : evalResult.toplam >= 40 ? 'text-amber-500' : 'text-red-500'
                    }`}>
                      {evalResult.toplam}<span className="text-xl font-normal text-slate-400 ml-1">/100</span>
                    </p>
                  </div>
                  <ScoreStars score={evalResult.toplam} />
                </div>

                {/* Progress bar */}
                <div className="h-2.5 bg-indigo-50 rounded-full overflow-hidden">
                  <motion.div initial={{ width: 0 }} animate={{ width: `${evalResult.toplam}%` }}
                    transition={{ duration: 1, ease: 'easeOut' }}
                    className={`h-full rounded-full ${
                      evalResult.toplam >= 75 ? 'bg-gradient-to-r from-emerald-500 to-teal-400' :
                      evalResult.toplam >= 40 ? 'bg-gradient-to-r from-amber-500 to-yellow-400' :
                                                'bg-gradient-to-r from-red-500 to-rose-400'
                    }`} />
                </div>

                {/* 4 metrik */}
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { key: 'empati',           label: 'Empati',            icon: '💙' },
                    { key: 'cozumOdaklilik',   label: 'Çözüm Odaklılık',   icon: '🎯' },
                    { key: 'iletisim',         label: 'İletişim',          icon: '💬' },
                    { key: 'profesyonellik',   label: 'Profesyonellik',    icon: '⭐' },
                  ].map(({ key, label, icon }) => {
                    const val = evalResult[key] ?? 0;
                    return (
                      <div key={key} className="bg-indigo-50/60 border border-indigo-100 rounded-xl p-3">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs font-medium text-slate-500">{icon} {label}</span>
                          <span className="text-sm font-bold text-slate-700">{val}<span className="text-xs text-slate-400">/25</span></span>
                        </div>
                        <div className="h-1.5 bg-white rounded-full overflow-hidden">
                          <motion.div initial={{ width: 0 }} animate={{ width: `${(val/25)*100}%` }}
                            transition={{ duration: 0.8, ease: 'easeOut' }}
                            className={`h-full rounded-full ${val >= 18 ? 'bg-emerald-400' : val >= 10 ? 'bg-amber-400' : 'bg-red-400'}`} />
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Geri bildirim */}
                <div className="bg-indigo-50/60 border border-indigo-100 rounded-xl px-4 py-3">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">AI Geri Bildirimi</p>
                  <p className="text-sm text-slate-700 leading-relaxed">{evalResult.geri_bildirim}</p>
                </div>

                {/* Tekrar / Farklı Senaryo */}
                <div className="flex gap-3">
                  <button onClick={startSim}
                    className={`flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-sm shadow-md transition-all active:scale-95 ${
                      activeMascot === 'voxera'
                        ? 'bg-gradient-to-r from-violet-500 to-purple-600 text-white shadow-violet-500/20'
                        : 'bg-gradient-to-r from-yellow-500 to-amber-400 text-gray-900 shadow-yellow-500/20'
                    }`}>
                    <RotateCcw className="w-4 h-4" />
                    Tekrar Dene
                  </button>
                  <button onClick={stopSim}
                    className="px-5 py-3.5 rounded-xl font-semibold text-sm bg-dark-800 border border-indigo-100 text-slate-500 hover:text-slate-700 hover:border-indigo-200 transition-all">
                    Senaryo Değiştir
                  </button>
                </div>
              </motion.div>
            )}

          </div>
        </div>

        {/* ── Teknocan Onboarding Süreci ── */}
        <div className="mt-12 border-t border-indigo-100 pt-10">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-yellow-400 to-blue-500 flex items-center justify-center shadow-lg shadow-yellow-500/20">
              <Users className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">Teknocan Onboarding Süreci</h2>
              <p className="text-xs text-slate-400">Turkcell · Yeni Temsilci Oryantasyon Programı</p>
            </div>
            <div className="ml-auto flex items-center gap-2 bg-yellow-400/10 border border-yellow-400/30 rounded-xl px-3 py-1.5">
              <ShieldCheck className="w-4 h-4 text-yellow-500" />
              <span className="text-xs font-semibold text-yellow-600">SGS Azaltma Programı</span>
            </div>
          </div>

          {/* Onboarding Modülleri */}
          <div className="grid md:grid-cols-3 gap-4 mb-6">
            {[
              {
                step: '01',
                icon: BookOpen,
                color: 'from-blue-500 to-indigo-600',
                bg: 'bg-blue-50 border-blue-100',
                title: 'Turkcell Ürün & Hizmet Eğitimi',
                desc: 'Tarife, paket ve kampanya bilgileri. Müşteri segmentleri ve CRM kullanımı. Fatura okuma ve açıklama.',
                badge: '3 Gün',
              },
              {
                step: '02',
                icon: Brain,
                color: 'from-violet-500 to-purple-600',
                bg: 'bg-violet-50 border-violet-100',
                title: 'İletişim & Empati Becerileri',
                desc: 'Aktif dinleme teknikleri. İtiraz karşılama ve çözüm odaklı yaklaşım. Stres yönetimi ve sakin kalma.',
                badge: '2 Gün',
              },
              {
                step: '03',
                icon: ShieldCheck,
                color: 'from-emerald-500 to-teal-600',
                bg: 'bg-emerald-50 border-emerald-100',
                title: 'Kalite & SGS Farkındalığı',
                desc: 'Haklı şikayet (SGS) nedir ve nasıl önlenir. Hatalı bilgi vermenin sonuçları. CRM panellerini doğru kullanma.',
                badge: '1 Gün',
              },
            ].map(({ step, icon: Icon, color, bg, title, desc, badge }) => (
              <motion.div
                key={step}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: parseInt(step) * 0.1 }}
                className={`border rounded-2xl p-5 ${bg}`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center shadow-md`}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-xs font-bold text-slate-400 bg-white/80 border border-slate-200 px-2 py-0.5 rounded-full">{badge}</span>
                </div>
                <p className="text-xs font-bold text-slate-400 mb-1">Modül {step}</p>
                <h3 className="text-sm font-bold text-slate-800 mb-2">{title}</h3>
                <ul className="space-y-1">
                  {desc.split('. ').filter(Boolean).map((item, i) => (
                    <li key={i} className="flex items-start gap-1.5 text-xs text-slate-500">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0 mt-0.5" />
                      {item}
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>

          {/* SGS Bilgi Kartı */}
          <div className="bg-gradient-to-r from-red-50 to-orange-50 border border-red-100 rounded-2xl p-5">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center shadow-md shadow-red-500/25 flex-shrink-0">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-slate-800 mb-1">SGS Nedir ve SafeVox Nasıl Önler?</h3>
                <p className="text-sm text-slate-600 leading-relaxed mb-3">
                  <strong>SGS (Sağlıksız Görüşme Skoru)</strong>, müşteri temsilcisinin hatalı bilgi vermesi, empati kurmaması veya çözüm üretememesi nedeniyle yükselen bir kalite metriğidir. Yeni temsilcilerde SGS riski 3–4× daha yüksektir.
                </p>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { icon: '📋', title: 'CRM Panelleri',    desc: 'Sağdaki anlık müşteri bilgileri hatalı bilgi vermeyi sıfırlar' },
                    { icon: '🤖', title: 'Teknocan Koçluk', desc: 'Senaryolarla pratik yaparak iletişim hatalarını azalt' },
                    { icon: '⚠',  title: 'SGS Risk Alarmı', desc: 'Canlı çağrıda söylenen hatalı rakamlar anında tespit edilir' },
                  ].map(({ icon, title, desc }) => (
                    <div key={title} className="bg-white/80 border border-red-100 rounded-xl px-4 py-3">
                      <p className="text-lg mb-1">{icon}</p>
                      <p className="text-xs font-bold text-slate-700 mb-0.5">{title}</p>
                      <p className="text-xs text-slate-400 leading-relaxed">{desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Teknocan mesajı */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-4 bg-gradient-to-r from-yellow-400/10 to-blue-500/10 border border-yellow-400/20 rounded-2xl px-5 py-4 flex items-center gap-4"
          >
            <Award className="w-6 h-6 text-yellow-500 flex-shrink-0" />
            <p className="text-sm text-slate-700">
              <strong className="text-yellow-600">Teknocan diyor ki:</strong> "Onboarding sürecini tamamlayan temsilciler ilk 30 günde ortalama <span className="font-bold text-emerald-600">%42 daha düşük SGS</span> skoru elde ediyor. Haydi senaryo pratiğine devam edelim! 🚀"
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
