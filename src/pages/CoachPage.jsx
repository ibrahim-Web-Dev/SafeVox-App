import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, RotateCcw, GraduationCap, ChevronRight, Star, Volume2, VolumeX, Loader2,
  CheckCircle2, Circle, BookOpen, ShieldCheck, Brain, Zap, Users, Award } from 'lucide-react';
import { evaluateWithGemini } from '../utils/coachEvaluator';
import { SplineScene } from '../components/ui/SplineScene';

// ── Senaryo Veritabanı ─────────────────────────────────────────────────────────
const SCENARIOS = [
  {
    id: 'acilis',
    label: 'Açılış',
    emoji: '👋',
    teknocanMesaj: 'Merhaba! Ben Teknocan, dijital koçun. Açılış cümlesini benimle pratik yapalım. Hazır mısın?',
    beklenen: 'Merhaba, Türkcell müşteri hizmetleri, [İsmin] konuşuyor. Size nasıl yardımcı olabilirim?',
    ipucu: 'Merhaba diyerek başla → Türkcell & ismini söyle → nasıl yardımcı olabileceğini sor',
    anahtarlar: ['merhaba', 'türkcell', 'müşteri', 'yardımcı'],
  },
  {
    id: 'itiraz',
    label: 'İtiraz Karşılama',
    emoji: '🤝',
    teknocanMesaj: 'Şikayet eden bir müşteri var! Sakin ve çözüm odaklı bir cevap ver, deneyelim.',
    beklenen: 'Yaşadığınız durumu anlıyorum, sizi dinliyorum. Bu konuyu çözmek için elimden geleni yapacağım.',
    ipucu: 'Empati kur → dinlediğini göster → çözüm odaklı ol',
    anahtarlar: ['anlıyorum', 'dinliyorum', 'çözmek', 'yardımcı'],
  },
  {
    id: 'kapanis',
    label: 'Kapanış',
    emoji: '✅',
    teknocanMesaj: 'Görüşmeyi kapatma zamanı! Profesyonel bir kapanış cümlesi söyle bakalım.',
    beklenen: 'Başka bir konuda yardımcı olabilir miyim? Türkcell\'i tercih ettiğiniz için teşekkür ederiz. İyi günler dilerim.',
    ipucu: 'Başka yardım teklif et → teşekkür et → iyi dilek',
    anahtarlar: ['teşekkür', 'iyi günler', 'yardımcı', 'türkcell'],
  },
];

// ── TTS ────────────────────────────────────────────────────────────────────────
function speak(text, onStart, onEnd) {
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
  const [activeScenario, setActiveScenario] = useState(SCENARIOS[0]);
  const [mascotState, setMascotState]       = useState('idle');
  const [isTalking, setIsTalking]           = useState(false);
  const [bubbleText, setBubbleText]         = useState('');
  const [bubbleVisible, setBubbleVisible]   = useState(false);
  // isRecording kaldırıldı — sessionState === 'recording' kullanılıyor
  const [transcript, setTranscript]         = useState('');
  const [sessionState, setSessionState]     = useState('intro');
  const [score, setScore]                   = useState(null);
  const [evalResult, setEvalResult]         = useState(null);
  const [isEvaluating, setIsEvaluating]     = useState(false);
  const [ttsEnabled, setTtsEnabled]         = useState(true);

  const recognitionRef = useRef(null);
  const bubbleTimerRef = useRef(null);

  const teknocanSpeak = useCallback((text, nextState = 'idle') => {
    setBubbleText(text);
    setBubbleVisible(true);
    clearTimeout(bubbleTimerRef.current);

    if (!ttsEnabled) {
      setMascotState(nextState);
      bubbleTimerRef.current = setTimeout(() => setBubbleVisible(false), 4500);
      return;
    }

    speak(
      text,
      () => { setIsTalking(true); },
      () => {
        setIsTalking(false);
        setMascotState(nextState);
        bubbleTimerRef.current = setTimeout(() => setBubbleVisible(false), 3200);
      },
    );
  }, [ttsEnabled]);

  useEffect(() => {
    const t = setTimeout(() => {
      teknocanSpeak(activeScenario.teknocanMesaj, 'idle');
      setSessionState('ready');
    }, 700);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeScenario]);

  const changeScenario = (s) => {
    stopRecording();
    window.speechSynthesis?.cancel();
    setTranscript('');
    setScore(null);
    setEvalResult(null);
    setIsTalking(false);
    setActiveScenario(s);
    setSessionState('intro');
  };

  const startRecording = useCallback(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { teknocanSpeak('Chrome kullanman gerekiyor!', 'sad'); return; }

    const rec = new SR();
    rec.lang = 'tr-TR';
    rec.continuous = false;
    rec.interimResults = true;

    rec.onresult = (e) => {
      setTranscript(Array.from(e.results).map((r) => r[0].transcript).join(' '));
    };
    rec.onend = () => {
      setMascotState('thinking');
      teknocanSpeak('Bir saniye, Gemini ile değerlendiriyorum...', 'thinking');
      setTimeout(() => evaluateTranscript(), 800);
    };
    rec.onerror = () => {
      teknocanSpeak('Sesi duyamadım, tekrar dene!', 'sad');
      setSessionState('ready');
    };

    recognitionRef.current = rec;
    rec.start();
    setTranscript('');
    setScore(null);
    setSessionState('recording');
    setMascotState('listening');
    setBubbleVisible(false);
    window.speechSynthesis?.cancel();
    setIsTalking(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teknocanSpeak]);

  const stopRecording = useCallback(() => {
    recognitionRef.current?.stop();
  }, []);

  const evaluateTranscript = useCallback(async () => {
    if (!transcript.trim()) {
      teknocanSpeak('Hiçbir şey söylemedin! Tekrar dene.', 'sad');
      setSessionState('ready');
      return;
    }

    setIsEvaluating(true);

    try {
      const result = await evaluateWithGemini(transcript, activeScenario);
      const final  = Math.min(100, Math.max(0, result.puan));

      setScore(final);
      setEvalResult(result);
      setSessionState('result');
      setIsEvaluating(false);

      const mesaj = result.mesaj || (
        final >= 75 ? 'Harika! Mükemmel bir performans, bravo!' :
        final >= 40 ? 'Fena değil! Biraz daha pratik yaparsan mükemmel.' :
                      'Daha fazla pratik yapmalısın. Birlikte tekrar deneyelim!'
      );

      if (final >= 75)       { setMascotState('happy'); teknocanSpeak(mesaj, 'happy'); }
      else if (final >= 40)  { setMascotState('idle');  teknocanSpeak(mesaj, 'idle');  }
      else                   { setMascotState('sad');   teknocanSpeak(mesaj, 'sad');   }

    } catch {
      // Gemini başarısız olursa yerel değerlendirmeye dön
      setIsEvaluating(false);
      const lower  = transcript.toLowerCase();
      const found  = activeScenario.anahtarlar.filter((k) => lower.includes(k));
      const base   = Math.round((found.length / activeScenario.anahtarlar.length) * 100);
      const bonus  = lower.length > 25 ? 10 : lower.length > 12 ? 5 : 0;
      const final  = Math.min(100, base + bonus);
      setScore(final);
      setEvalResult({ bulunanlar: found, eksikler: activeScenario.anahtarlar.filter(k => !found.includes(k)), detay: 'Yerel değerlendirme (Gemini erişilemedi)' });
      setSessionState('result');
      if (final >= 75)      { setMascotState('happy'); teknocanSpeak('Harika! Mükemmel bir performans, bravo!', 'happy'); }
      else if (final >= 40) { setMascotState('idle');  teknocanSpeak('Fena değil! Biraz daha pratik yaparsan mükemmel.', 'idle'); }
      else                  { setMascotState('sad');   teknocanSpeak('Daha fazla pratik yapmalısın. Birlikte tekrar deneyelim!', 'sad'); }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transcript, activeScenario, teknocanSpeak]);

  const reset = () => {
    stopRecording();
    window.speechSynthesis?.cancel();
    setTranscript('');
    setScore(null);
    setEvalResult(null);
    setIsTalking(false);
    setSessionState('ready');
    setMascotState('idle');
    setBubbleVisible(false);
  };

  useEffect(() => () => {
    stopRecording();
    window.speechSynthesis?.cancel();
    clearTimeout(bubbleTimerRef.current);
  }, [stopRecording]);

  const scoreColor = score === null ? '' :
    score >= 75 ? 'text-green-400' : score >= 40 ? 'text-yellow-400' : 'text-red-400';
  const scoreBg = score === null ? '' :
    score >= 75 ? 'border-green-500/30 bg-green-500/8' :
    score >= 40 ? 'border-yellow-500/30 bg-yellow-500/8' : 'border-red-500/30 bg-red-500/8';

  return (
    <div className="min-h-screen bg-dark-900 text-slate-800 font-sans pb-16">

      {/* Header */}
      <div className="border-b border-indigo-100 bg-dark-800/60 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-yellow-400
                          flex items-center justify-center shadow-lg shadow-blue-500/20">
            <GraduationCap className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-display font-bold text-slate-800 leading-none">Dijital Koç</h1>
            <p className="text-xs text-slate-400 mt-0.5">Teknocan · AI destekli temsilci eğitimi</p>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <button
              onClick={() => { setTtsEnabled((p) => !p); window.speechSynthesis?.cancel(); setIsTalking(false); }}
              title={ttsEnabled ? 'Sesi kapat' : 'Sesi aç'}
              className={`p-2 rounded-lg border transition-all ${
                ttsEnabled
                  ? 'bg-yellow-500/15 border-yellow-500/30 text-yellow-400'
                  : 'bg-indigo-50/60 border-indigo-100 text-slate-400'
              }`}
            >
              {ttsEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20">
              <motion.div className="w-2 h-2 rounded-full bg-blue-400"
                animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 1.5, repeat: Infinity }} />
              <span className="text-xs text-blue-300 font-medium">Eğitim Modu</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8">

        {/* Senaryo Seçici */}
        <div className="flex items-center gap-2 mb-8">
          {SCENARIOS.map((s) => (
            <button key={s.id} onClick={() => changeScenario(s)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium
                          transition-all duration-200 border ${
                activeScenario.id === s.id
                  ? 'bg-yellow-400/15 border-yellow-400/40 text-yellow-300'
                  : 'bg-dark-800/60 border-indigo-100 text-slate-400 hover:text-slate-600 hover:border-indigo-200'
              }`}
            >
              <span>{s.emoji}</span><span>{s.label}</span>
            </button>
          ))}
        </div>

        <div className="grid md:grid-cols-[280px_1fr] gap-8 items-start">

          {/* Sol: Teknocan */}
          <div className="flex flex-col items-center gap-3">
            <div className="min-h-[80px] flex items-end w-full">
              <SpeechBubble text={bubbleText} visible={bubbleVisible} />
            </div>

            {/* Zemin parlaması */}
            <div className="relative flex justify-center">
              <div className="absolute bottom-4 w-36 h-8 bg-yellow-400/20 blur-2xl rounded-full" />
              <TeknocanSVG state={mascotState} isTalking={isTalking} />
            </div>

            <div className="text-center">
              <p className="text-sm font-bold text-slate-800">Teknocan</p>
              <p className="text-xs text-slate-400">Dijital Koç · Türkcell</p>
            </div>
          </div>

          {/* Sağ: Eğitim */}
          <div className="space-y-5">

            {/* Beklenen cümle */}
            <div className="bg-dark-800 border border-indigo-100 rounded-2xl p-5">
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">
                Söylemen Gereken
              </p>
              <p className="text-sm text-slate-700 leading-relaxed italic">
                "{activeScenario.beklenen}"
              </p>
              <div className="mt-3 flex items-start gap-2 text-xs text-slate-400">
                <ChevronRight className="w-3.5 h-3.5 mt-0.5 text-yellow-400 flex-shrink-0" />
                <span>{activeScenario.ipucu}</span>
              </div>
            </div>

            {/* Buton: ready / result */}
            {(sessionState === 'ready' || sessionState === 'result') && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-3">
                <button onClick={startRecording}
                  className="flex-1 flex items-center justify-center gap-3 py-4 rounded-2xl
                             bg-gradient-to-r from-yellow-500 to-yellow-400
                             hover:from-yellow-400 hover:to-yellow-300
                             text-gray-900 font-bold text-sm shadow-lg shadow-yellow-500/25
                             transition-all active:scale-95">
                  <Mic className="w-5 h-5" />
                  {sessionState === 'result' ? 'Tekrar Dene' : 'Konuşmaya Başla'}
                </button>
                {sessionState === 'result' && (
                  <button onClick={reset}
                    className="p-4 rounded-2xl bg-dark-800 border border-indigo-100 text-slate-500
                               hover:text-slate-800 hover:border-indigo-200 transition-all">
                    <RotateCcw className="w-5 h-5" />
                  </button>
                )}
              </motion.div>
            )}

            {/* Kayıt ediliyor */}
            {sessionState === 'recording' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
                <button onClick={stopRecording}
                  className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl
                             bg-red-500 hover:bg-red-400 text-slate-800 font-bold text-sm
                             shadow-lg shadow-red-500/25 transition-all active:scale-95">
                  <motion.div animate={{ scale: [1, 1.35, 1] }} transition={{ duration: 0.7, repeat: Infinity }}>
                    <MicOff className="w-5 h-5" />
                  </motion.div>
                  Kaydı Durdur
                </button>
                <div className="bg-dark-800 border border-yellow-500/20 rounded-xl px-4 py-3 min-h-[52px]">
                  <p className="text-xs text-yellow-400 mb-1">Dinliyorum...</p>
                  <p className="text-sm text-slate-600 italic">
                    {transcript || <span className="text-slate-400">Konuşmaya başla...</span>}
                  </p>
                </div>
              </motion.div>
            )}

            {/* Thinking / Gemini yükleniyor */}
            {(mascotState === 'thinking' || isEvaluating) && sessionState !== 'result' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="flex items-center gap-2 text-sm text-slate-400">
                <Loader2 className="w-4 h-4 animate-spin text-yellow-400" />
                {isEvaluating ? 'Gemini değerlendiriyor...' : 'Değerlendiriliyor...'}
              </motion.div>
            )}

            {/* Sonuç Kartı */}
            <AnimatePresence>
              {sessionState === 'result' && score !== null && (
                <motion.div
                  initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className={`border rounded-2xl p-5 space-y-4 ${scoreBg}`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Performans Puanı</p>
                      <p className={`text-4xl font-bold font-mono mt-1 ${scoreColor}`}>
                        {score}<span className="text-lg font-normal text-slate-400 ml-1">/100</span>
                      </p>
                    </div>
                    <ScoreStars score={score} />
                  </div>

                  <div className="h-2 bg-indigo-50 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }} animate={{ width: `${score}%` }}
                      transition={{ duration: 0.8, ease: 'easeOut' }}
                      className={`h-full rounded-full ${
                        score >= 75 ? 'bg-gradient-to-r from-green-600 to-green-400' :
                        score >= 40 ? 'bg-gradient-to-r from-yellow-600 to-yellow-400' :
                                      'bg-gradient-to-r from-red-600 to-red-400'
                      }`}
                    />
                  </div>

                  <div>
                    <p className="text-xs text-slate-400 mb-2">Anahtar Kelimeler</p>
                    <div className="flex flex-wrap gap-2">
                      {activeScenario.anahtarlar.map((k) => {
                        const found = evalResult?.bulunanlar
                          ? evalResult.bulunanlar.some(b => b.toLowerCase().includes(k) || k.includes(b.toLowerCase()))
                          : transcript.toLowerCase().includes(k);
                        return (
                          <span key={k} className={`text-xs px-2.5 py-1 rounded-full border font-medium ${
                            found ? 'bg-green-500/15 border-green-500/30 text-green-300'
                                  : 'bg-red-500/10 border-red-500/20 text-red-400'
                          }`}>
                            {found ? '✓' : '✗'} {k}
                          </span>
                        );
                      })}
                    </div>
                  </div>

                  {evalResult?.detay && (
                    <div className="text-xs text-slate-400 bg-dark-900/40 px-3 py-2 rounded-lg border border-indigo-100">
                      <span className="text-yellow-500/70 font-medium">Gemini: </span>{evalResult.detay}
                    </div>
                  )}

                  {transcript && (
                    <div>
                      <p className="text-xs text-slate-400 mb-1">Söylediklerin</p>
                      <p className="text-sm text-slate-600 italic bg-dark-900/50 px-3 py-2 rounded-lg">
                        "{transcript}"
                      </p>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
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
