import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Sparkles, Mic, MicOff, RotateCcw, Zap, ChevronRight } from 'lucide-react';

const GROQ_KEY = import.meta.env.VITE_GROQ_API_KEY;

const QUICK_PROMPTS = [
  { label: 'Cayma itirazına cevap',   icon: '🛡️', text: 'Müşteri aboneliğini iptal etmek istiyor. Ne söylemeliyim?' },
  { label: 'Empati cümlesi kur',      icon: '💬', text: 'Sinirli bir müşteriyle konuşurken empati kurmak için nasıl bir cümle kullanmalıyım?' },
  { label: 'Fatura şikayeti',         icon: '📄', text: 'Müşteri faturasının yüksek geldiğini söylüyor. Nasıl ele almalıyım?' },
  { label: 'Görüşmeyi kapat',         icon: '✅', text: 'Çağrıyı profesyonelce kapatmak için ne diyebilirim?' },
  { label: 'Zor müşteri yönetimi',    icon: '🎯', text: 'Çok agresif davranan bir müşteriyle nasıl başa çıkmalıyım?' },
  { label: 'Ürün öner',               icon: '⭐', text: 'İnterneti yavaş diyen müşteriye hangi paketi önerebilirim?' },
];

const SYSTEM_PROMPT = `Sen Voxi'sin — SafeVox çağrı merkezi platformunun AI asistanı. Çağrı merkezi temsilcilerine gerçek zamanlı destek veriyorsun.
Kısa, net ve uygulanabilir cevaplar ver. Türkçe konuş. Madde madde listeler kullan. Gereksiz uzatma.`;

// ── Voxi maskot — public/voxi/voxi-mascot.svg ────────────────────────────────
export function VoxeraHead({ state = 'idle', isTalking = false, size = 220 }) {
  const floatAnim = {
    idle:      { y: [0, -8, 0],                               transition: { duration: 3.2, repeat: Infinity, ease: 'easeInOut' } },
    listening: { y: [0, -4, 0],                               transition: { duration: 1.0, repeat: Infinity, ease: 'easeInOut' } },
    thinking:  { rotate: [-2, 2, -2],                         transition: { duration: 2.0, repeat: Infinity } },
    happy:     { y: [0,-18,-5,-12,0], rotate: [-4,4,-2,2,0], transition: { duration: 0.5, repeat: 3 } },
    sad:       { y: [0, 6, 0],                                transition: { duration: 2.6, repeat: Infinity } },
  };
  const fa = floatAnim[state] || floatAnim.idle;
  // SVG viewBox 400×480 → ratio 1.2
  const h = Math.round(size * 1.2);

  return (
    <motion.div
      animate={{ y: fa.y ?? 0, rotate: fa.rotate ?? 0 }}
      transition={fa.transition}
      className="select-none relative"
      style={{ width: size, height: h }}
    >
      <img src="/voxi/voxi-mascot.svg" width={size} height={h} alt="Voxi" draggable={false} />

      {/* Durum animasyonları — SVG overlay */}
      <svg viewBox="0 0 400 480" width={size} height={h}
        className="absolute inset-0 pointer-events-none" fill="none">

        {state === 'thinking' && [0,1,2].map((i) => (
          <motion.circle key={i} cx={155 + i * 45} cy="462" r="11" fill="#A78BFA"
            animate={{ opacity: [0.2, 1, 0.2], y: [0, -14, 0] }}
            transition={{ duration: 0.7, repeat: Infinity, delay: i * 0.18 }} />
        ))}

        {state === 'happy' && [[-80,-90],[-115,-45],[85,-95],[112,-50],[-18,-145],[44,-138]].map(([x, y], i) => (
          <motion.circle key={i} cx={200+x} cy={195+y} r="12" fill="#C4B5FD"
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: [0, 0.85, 0], scale: [0, 1.3, 0] }}
            transition={{ duration: 0.62, delay: i * 0.07, repeat: 3 }} />
        ))}

        {state === 'listening' && (
          <motion.ellipse cx="200" cy="195" rx="100" ry="96" stroke="#A78BFA" strokeWidth="6" fill="none"
            animate={{ opacity: [0.55, 0, 0.55], rx: [100, 120, 100], ry: [96, 116, 96] }}
            transition={{ duration: 1.2, repeat: Infinity }} />
        )}

        {isTalking && (
          <motion.ellipse cx="200" cy="240" rx="22" ry="14" fill="#8B5CF6" opacity="0.25"
            animate={{ ry: [10, 20, 10], opacity: [0.18, 0.38, 0.18] }}
            transition={{ duration: 0.26, repeat: Infinity, ease: 'easeInOut' }} />
        )}
      </svg>
    </motion.div>
  );
}

// ── Sohbet balonu ────────────────────────────────────────────────────────────
function ChatMessage({ msg }) {
  const isVoxera = msg.role === 'assistant';
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex gap-3 ${isVoxera ? '' : 'flex-row-reverse'}`}
    >
      {isVoxera && (
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center flex-shrink-0 shadow-md shadow-violet-500/30">
          <Sparkles className="w-4 h-4 text-white" />
        </div>
      )}
      <div className={`max-w-[82%] ${isVoxera ? '' : 'items-end flex flex-col'}`}>
        <div className={`rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
          isVoxera
            ? 'bg-white border border-indigo-100 text-slate-700 rounded-tl-sm shadow-sm'
            : 'bg-gradient-to-br from-violet-600 to-purple-700 text-white rounded-tr-sm shadow-md shadow-violet-500/20'
        }`}>
          {msg.content}
        </div>
        <p className="text-[10px] text-slate-400 mt-1 px-1">{msg.time}</p>
      </div>
    </motion.div>
  );
}

// ── Ana Sayfa ────────────────────────────────────────────────────────────────
export default function VoxeraPage() {
  const [messages, setMessages]   = useState([
    {
      role: 'assistant',
      content: 'Merhaba! Ben Voxi 👋\n\nÇağrı sırasında takıldığın her konuda sana anında destek verebilirim. Bir soru sor veya aşağıdaki hızlı seçeneklerden birini dene.',
      time: now(),
    }
  ]);
  const [input, setInput]         = useState('');
  const [loading, setLoading]     = useState(false);
  const [voxState, setVoxState]   = useState('idle');
  const [isTalking, setIsTalking] = useState(false);
  const bottomRef = useRef(null);
  const inputRef  = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = useCallback(async (text) => {
    const userText = (text ?? input).trim();
    if (!userText || loading) return;

    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: userText, time: now() }]);
    setLoading(true);
    setVoxState('thinking');

    const history = messages.map((m) => ({ role: m.role, content: m.content }));

    try {
      let reply = '';

      if (GROQ_KEY) {
        const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${GROQ_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'llama-3.3-70b-versatile',
            messages: [
              { role: 'system', content: SYSTEM_PROMPT },
              ...history,
              { role: 'user', content: userText },
            ],
            temperature: 0.55,
            max_tokens: 400,
          }),
        });
        const data = await res.json();
        reply = data.choices?.[0]?.message?.content ?? '';
      } else {
        reply = 'API anahtarı tanımlı değil. .env dosyasına VITE_GROQ_API_KEY ekle.';
      }

      setVoxState('happy');
      setIsTalking(true);
      setMessages((prev) => [...prev, { role: 'assistant', content: reply, time: now() }]);
      setTimeout(() => { setIsTalking(false); setVoxState('idle'); }, 2200);
    } catch {
      setVoxState('sad');
      setMessages((prev) => [...prev, { role: 'assistant', content: 'Bir hata oluştu, tekrar dene.', time: now() }]);
      setTimeout(() => setVoxState('idle'), 1800);
    } finally {
      setLoading(false);
    }
  }, [input, loading, messages]);

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const reset = () => {
    setMessages([{
      role: 'assistant',
      content: 'Sohbet sıfırlandı. Nasıl yardımcı olabilirim?',
      time: now(),
    }]);
    setVoxState('idle');
  };

  return (
    <div className="min-h-screen bg-dark-900 font-sans">
      {/* Header */}
      <div className="border-b border-indigo-100 bg-dark-800/60 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center shadow-lg shadow-violet-500/25">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-display font-bold text-slate-800 leading-none">Voxi</h1>
              <p className="text-xs text-slate-400 mt-0.5">AI Asistan · SafeVox</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={reset}
              className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-600 transition px-2.5 py-1.5 rounded-lg hover:bg-indigo-50 border border-transparent hover:border-indigo-100">
              <RotateCcw className="w-3.5 h-3.5" />
              Sıfırla
            </button>
            <motion.div
              className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-violet-500/10 border border-violet-500/20"
              animate={{ opacity: loading ? [1, 0.5, 1] : 1 }}
              transition={{ duration: 0.8, repeat: loading ? Infinity : 0 }}
            >
              <div className={`w-2 h-2 rounded-full ${loading ? 'bg-violet-400' : 'bg-emerald-400'}`} />
              <span className="text-xs text-violet-600 font-medium">{loading ? 'Düşünüyor...' : 'Hazır'}</span>
            </motion.div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid md:grid-cols-[300px_1fr] gap-8 items-start">

          {/* Sol: Voxera maskotu */}
          <div className="flex flex-col items-center gap-6 md:sticky md:top-28">
            {/* Arka plan aura */}
            <div className="relative flex items-center justify-center">
              <div className="absolute w-56 h-56 rounded-full bg-violet-500/10 blur-3xl" />
              <div className="absolute w-40 h-40 rounded-full bg-purple-500/10 blur-2xl" />
              <VoxeraHead state={voxState} isTalking={isTalking} size={240} />
            </div>

            {/* İsim + durum */}
            <div className="text-center">
              <p className="text-xl font-display font-bold text-slate-800">Voxi</p>
              <p className="text-sm text-slate-400 mt-0.5">SafeVox AI Asistanı</p>
            </div>

            {/* Durum kartı */}
            <div className="w-full bg-white border border-indigo-100 rounded-2xl p-4 shadow-sm">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Hızlı Erişim</p>
              <div className="space-y-1.5">
                {QUICK_PROMPTS.map((q) => (
                  <button key={q.label} onClick={() => sendMessage(q.text)}
                    disabled={loading}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left text-sm text-slate-600
                               hover:bg-violet-50 hover:text-violet-700 border border-transparent hover:border-violet-100
                               transition-all disabled:opacity-40 disabled:cursor-not-allowed group">
                    <span className="text-base">{q.icon}</span>
                    <span className="font-medium flex-1">{q.label}</span>
                    <ChevronRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity text-violet-400" />
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Sağ: Sohbet */}
          <div className="flex flex-col" style={{ height: 'calc(100vh - 160px)' }}>
            {/* Mesaj alanı */}
            <div className="flex-1 overflow-y-auto space-y-4 pr-1 pb-4 custom-scroll">
              <AnimatePresence initial={false}>
                {messages.map((msg, i) => (
                  <ChatMessage key={i} msg={msg} />
                ))}
              </AnimatePresence>

              {loading && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center flex-shrink-0 shadow-md">
                    <Sparkles className="w-4 h-4 text-white" />
                  </div>
                  <div className="bg-white border border-indigo-100 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
                    <div className="flex gap-1.5 items-center h-5">
                      {[0,1,2].map((i) => (
                        <motion.div key={i} className="w-2 h-2 rounded-full bg-violet-400"
                          animate={{ y: [0, -6, 0] }}
                          transition={{ duration: 0.55, repeat: Infinity, delay: i * 0.14 }} />
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="pt-4 border-t border-indigo-100 mt-2">
              <div className="flex gap-3">
                <div className="flex-1 relative">
                  <textarea
                    ref={inputRef}
                    rows={1}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKey}
                    placeholder="Bir şey sor... (Enter ile gönder)"
                    disabled={loading}
                    className="w-full bg-white border border-indigo-100 rounded-2xl px-4 py-3 pr-12 text-sm text-slate-700
                               placeholder:text-slate-400 resize-none focus:outline-none focus:border-violet-400
                               focus:ring-2 focus:ring-violet-400/20 transition-all shadow-sm
                               disabled:opacity-60"
                    style={{ minHeight: '48px', maxHeight: '120px' }}
                    onInput={(e) => {
                      e.target.style.height = 'auto';
                      e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
                    }}
                  />
                  <div className="absolute right-3 bottom-3 text-xs text-slate-300">↵</div>
                </div>
                <motion.button
                  onClick={() => sendMessage()}
                  disabled={!input.trim() || loading}
                  whileTap={{ scale: 0.93 }}
                  className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-700
                             text-white flex items-center justify-center shadow-lg shadow-violet-500/30
                             hover:from-violet-400 hover:to-purple-600 transition-all
                             disabled:opacity-40 disabled:cursor-not-allowed self-end"
                >
                  <Send className="w-4.5 h-4.5" />
                </motion.button>
              </div>
              <p className="text-xs text-slate-400 mt-2 text-center">
                Voxi, gerçek zamanlı çağrı desteği sunar · SafeVox AI
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function now() {
  return new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
}
