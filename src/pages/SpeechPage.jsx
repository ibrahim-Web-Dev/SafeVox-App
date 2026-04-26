import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mic, MicOff, Trash2, ArrowRight, AlertCircle,
  Radio, CheckCircle2, Volume2, FolderOpen, Upload, Loader2,
} from 'lucide-react';
import { maskSensitiveData } from '../utils/kvkkMasker';
import { transcribeWithGemini, parseGeminiError } from '../utils/geminiSTT';

// ── Web Speech API desteği kontrolü ──────────────────────────────────────────
const SpeechRecognition =
  window.SpeechRecognition || window.webkitSpeechRecognition || null;


export default function SpeechPage() {
  const [activeTab, setActiveTab] = useState('mic');      // 'mic' | 'file'
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');       // onaylanan metin
  const [interim, setInterim] = useState('');             // henüz onaylanmamış
  const [maskedResult, setMaskedResult] = useState(null);
  const [error, setError] = useState('');
  const [pipelineActive, setPipelineActive] = useState(false);

  const recognitionRef = useRef(null);

  // ── Dosya modu state ──────────────────────────────────────────────────────
  const [fileStatus, setFileStatus] = useState('idle'); // idle | loading | done | error
  const [fileStatusMsg, setFileStatusMsg] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);

  const handleAudioFile = useCallback(async (file) => {
    if (!file) return;
    setError('');
    setFileStatus('loading');
    try {
      const text = await transcribeWithGemini(file, setFileStatusMsg);
      setTranscript((prev) => prev + (prev ? ' ' : '') + text);
      setFileStatus('done');
    } catch (err) {
      setFileStatus('error');
      setError(parseGeminiError(err));
    }
  }, []);

  // ── Recognition başlat ────────────────────────────────────────────────────
  const startListening = useCallback(() => {
    if (!SpeechRecognition) return;
    setError('');

    const rec = new SpeechRecognition();
    rec.lang = 'tr-TR';
    rec.continuous = true;
    rec.interimResults = true;
    rec.maxAlternatives = 1;

    rec.onstart = () => setIsListening(true);

    rec.onresult = (e) => {
      let finalText = '';
      let interimText = '';

      for (let i = e.resultIndex; i < e.results.length; i++) {
        const text = e.results[i][0].transcript;
        if (e.results[i].isFinal) {
          finalText += text + ' ';
        } else {
          interimText += text;
        }
      }

      if (finalText) {
        setTranscript((prev) => prev + finalText);
        setInterim('');
      } else {
        setInterim(interimText);
      }
    };

    rec.onerror = (e) => {
      if (e.error === 'not-allowed') {
        setError('Mikrofon izni reddedildi. Tarayıcı ayarlarından izin ver.');
      } else if (e.error === 'no-speech') {
        setError('Ses algılanamadı. Tekrar dene.');
      } else {
        setError(`Hata: ${e.error}`);
      }
      setIsListening(false);
    };

    rec.onend = () => {
      setIsListening(false);
      setInterim('');
    };

    recognitionRef.current = rec;
    rec.start();
  }, []);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setIsListening(false);
    setInterim('');
  }, []);


  const toggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  const clearAll = () => {
    stopListening();
    setTranscript('');
    setInterim('');
    setMaskedResult(null);
    setError('');
    setFileStatus('idle');
    setFileStatusMsg('');
  };

  // ── KVKK Pipeline ─────────────────────────────────────────────────────────
  const runMasking = useCallback(() => {
    const fullText = transcript + interim;
    if (!fullText.trim()) return;
    const result = maskSensitiveData(fullText.trim());
    setMaskedResult(result);
    setPipelineActive(true);
  }, [transcript, interim]);

  // Auto-pipeline: transcript her güncellendiğinde otomatik maskele
  useEffect(() => {
    if (!pipelineActive || !transcript.trim()) return;
    const result = maskSensitiveData(transcript.trim());
    setMaskedResult(result);
  }, [transcript, pipelineActive]);

  const fullText = transcript + (interim ? interim : '');
  const hasText = fullText.trim().length > 0;

  if (!SpeechRecognition) {
    return (
      <div className="min-h-screen bg-dark-900 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-800 mb-2">Tarayıcı Desteklenmiyor</h2>
          <p className="text-slate-500">
            Web Speech API bu tarayıcıda çalışmıyor. Lütfen{' '}
            <strong className="text-slate-800">Chrome</strong> veya{' '}
            <strong className="text-slate-800">Edge</strong> kullan.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-900 text-slate-800 font-sans pb-12">
      {/* Header */}
      <div className="border-b border-indigo-100 bg-dark-800/60 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-safe-500 to-vox-600 flex items-center justify-center shadow-lg shadow-safe-500/20">
              <Mic className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-display font-bold text-slate-800 leading-none">
                Ses Tanıma
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">Türkçe · Gerçek Zamanlı</p>
            </div>
          </div>

          {/* Sekme */}
          <div className="flex items-center gap-1 bg-dark-700/60 border border-indigo-100 rounded-xl p-1">
            <button
              onClick={() => setActiveTab('mic')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'mic' ? 'bg-indigo-50 text-slate-800' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <Mic className="w-3.5 h-3.5" /> Mikrofon
            </button>
            <button
              onClick={() => setActiveTab('file')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'file' ? 'bg-indigo-50 text-slate-800' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <FolderOpen className="w-3.5 h-3.5" /> Ses Dosyası
            </button>
          </div>

          <div className="flex items-center gap-2">
            {/* Otomatik pipeline toggle */}
            <button
              onClick={() => setPipelineActive((p) => !p)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                pipelineActive
                  ? 'bg-vox-500/20 border-vox-500/40 text-vox-300'
                  : 'bg-indigo-50/60 border-indigo-100 text-slate-400'
              }`}
            >
              <ArrowRight className="w-3.5 h-3.5" />
              Otomatik KVKK
            </button>

            <button
              onClick={clearAll}
              disabled={!hasText && !isListening}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-400 hover:text-red-400 bg-indigo-50/60 hover:bg-red-500/10 border border-indigo-100 hover:border-red-500/30 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Temizle
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">

        {/* ── Dosya Yükleme sekmesi ── */}
        {activeTab === 'file' && (
          <div className="space-y-4">
            <div
              onClick={() => fileStatus !== 'loading' && fileInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                handleAudioFile(e.dataTransfer.files[0]);
              }}
              className={`border-2 border-dashed rounded-2xl p-14 text-center transition-all ${
                fileStatus === 'loading'
                  ? 'border-vox-500/40 bg-vox-500/5 cursor-wait'
                  : dragOver
                    ? 'border-safe-500 bg-safe-500/10 cursor-copy'
                    : 'border-indigo-200 hover:border-indigo-300 bg-dark-800/40 cursor-pointer'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="audio/*"
                className="hidden"
                onChange={(e) => handleAudioFile(e.target.files[0])}
              />

              {fileStatus === 'loading' ? (
                <div className="space-y-3">
                  <Loader2 className="w-9 h-9 text-vox-400 mx-auto animate-spin" />
                  <p className="text-sm text-slate-600 font-medium">{fileStatusMsg || 'İşleniyor...'}</p>
                  <p className="text-xs text-slate-400">3 dakikalık ses için ~15-30 saniye beklenir</p>
                  <p className="text-xs text-slate-400">Gemini 2.0 Flash · Türkçe</p>
                </div>
              ) : fileStatus === 'done' ? (
                <div className="space-y-2">
                  <CheckCircle2 className="w-9 h-9 text-green-400 mx-auto" />
                  <p className="text-sm text-slate-600">Transkript oluşturuldu</p>
                  <p className="text-xs text-slate-400">Yeni dosya için tıkla veya sürükle</p>
                </div>
              ) : (
                <>
                  <Upload className="w-9 h-9 text-slate-400 mx-auto mb-3" />
                  <p className="text-sm text-slate-500 font-medium">Ses dosyasını buraya sürükle veya tıkla</p>
                  <p className="text-xs text-slate-400 mt-1.5">mp3 · wav · ogg · m4a · webm</p>
                  <div className="mt-4 inline-flex items-center gap-1.5 px-3 py-1 bg-green-500/10 border border-green-500/20 rounded-lg">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
                    <span className="text-xs text-green-300">Gemini 2.0 Flash aktif</span>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Mikrofon butonu */}
        {activeTab === 'mic' && <div className="flex flex-col items-center gap-4">
          <div className="relative">
            {/* Dalgalanma animasyonu */}
            {isListening && (
              <>
                <motion.div
                  className="absolute inset-0 rounded-full bg-red-500/20"
                  animate={{ scale: [1, 1.6, 1], opacity: [0.6, 0, 0.6] }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                />
                <motion.div
                  className="absolute inset-0 rounded-full bg-red-500/10"
                  animate={{ scale: [1, 2, 1], opacity: [0.4, 0, 0.4] }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut', delay: 0.3 }}
                />
              </>
            )}

            <motion.button
              onClick={toggleListening}
              whileTap={{ scale: 0.95 }}
              className={`relative w-24 h-24 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 ${
                isListening
                  ? 'bg-red-500 shadow-red-500/40 hover:bg-red-600'
                  : 'bg-gradient-to-br from-safe-500 to-vox-600 shadow-safe-500/30 hover:shadow-safe-500/50'
              }`}
            >
              {isListening ? (
                <MicOff className="w-10 h-10 text-slate-500" />
              ) : (
                <Mic className="w-10 h-10 text-slate-500" />
              )}
            </motion.button>
          </div>

          {/* Durum */}
          <AnimatePresence mode="wait">
            {isListening ? (
              <motion.div
                key="listening"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="flex items-center gap-2 text-red-400"
              >
                <Radio className="w-4 h-4 animate-pulse" />
                <span className="text-sm font-medium">Dinleniyor...</span>
              </motion.div>
            ) : (
              <motion.p
                key="idle"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="text-sm text-slate-400"
              >
                {hasText ? 'Devam etmek için tıkla' : 'Konuşmaya başlamak için tıkla'}
              </motion.p>
            )}
          </AnimatePresence>

          {/* Hata */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-2 text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-2 text-sm"
              >
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </motion.div>
            )}
          </AnimatePresence>
        </div>}

        {/* Pipeline görünümü */}
        <AnimatePresence>
          {hasText && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className={`grid gap-4 ${maskedResult ? 'md:grid-cols-2' : 'grid-cols-1'}`}
            >
              {/* Transkript */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-medium text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Volume2 className="w-3.5 h-3.5" />
                    Transkript
                  </label>

                  {!pipelineActive && (
                    <button
                      onClick={runMasking}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-800 bg-gradient-to-r from-safe-600 to-vox-600 rounded-lg hover:opacity-90 transition-all shadow-lg shadow-safe-500/20"
                    >
                      KVKK Maskele
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="min-h-[200px] bg-dark-800 border border-indigo-100 rounded-xl p-4 text-sm font-mono leading-relaxed">
                  <span className="text-slate-700">{transcript}</span>
                  {interim && (
                    <span className="text-slate-400 italic">{interim}</span>
                  )}
                  {!hasText && (
                    <span className="text-slate-400">Metin burada görünecek...</span>
                  )}
                </div>

                {/* Kelime sayısı */}
                {hasText && (
                  <p className="text-xs text-slate-400 mt-1 text-right">
                    {fullText.trim().split(/\s+/).length} kelime
                  </p>
                )}
              </div>

              {/* KVKK Sonucu */}
              <AnimatePresence>
                {maskedResult && (
                  <motion.div
                    initial={{ opacity: 0, x: 12 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0 }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-medium text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-safe-400" />
                        Maskeli Çıktı
                        {maskedResult.stats.total > 0 && (
                          <span className="text-safe-400 font-semibold">
                            · {maskedResult.stats.total} veri maskelendi
                          </span>
                        )}
                      </label>
                    </div>

                    <div className="min-h-[200px] bg-dark-800 border border-indigo-100 rounded-xl p-4 text-sm font-mono leading-relaxed text-green-300">
                      {maskedResult.maskedText || (
                        <span className="text-slate-400">Maskeli metin...</span>
                      )}
                    </div>

                    {/* Stat rozetleri */}
                    {maskedResult.stats.total > 0 && (
                      <div className="flex gap-2 mt-2 flex-wrap">
                        {maskedResult.stats.tc > 0 && (
                          <span className="px-2 py-0.5 text-xs rounded bg-red-500/20 border border-red-500/30 text-red-300">
                            {maskedResult.stats.tc} TC
                          </span>
                        )}
                        {maskedResult.stats.phone > 0 && (
                          <span className="px-2 py-0.5 text-xs rounded bg-yellow-500/20 border border-yellow-500/30 text-yellow-300">
                            {maskedResult.stats.phone} Telefon
                          </span>
                        )}
                        {maskedResult.stats.name > 0 && (
                          <span className="px-2 py-0.5 text-xs rounded bg-blue-500/20 border border-blue-500/30 text-blue-300">
                            {maskedResult.stats.name} İsim
                          </span>
                        )}
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Boş durum */}
        {!hasText && !isListening && (
          <div className="text-center py-8 text-slate-400">
            <p className="text-sm">Chrome veya Edge tarayıcısında çalışır</p>
          </div>
        )}
      </div>
    </div>
  );
}
