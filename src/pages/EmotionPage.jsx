import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mic, MicOff, Upload, Loader2, AlertTriangle,
  Activity, Brain, Volume2, Zap, CheckCircle2,
  BellRing, Wind,
} from 'lucide-react';
import { createAudioAnalyzer } from '../utils/audioAnalyzer';
import { analyzeEmotionFromAudio } from '../utils/emotionAnalyzer';

// ── Yardımcı bileşenler ───────────────────────────────────────────────────────

function ScoreBar({ label, value, color }) {
  const colors = {
    red:    'from-red-600 to-red-400',
    orange: 'from-orange-600 to-orange-400',
    yellow: 'from-yellow-600 to-yellow-400',
    blue:   'from-blue-600 to-blue-400',
    green:  'from-green-600 to-green-400',
  };
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-slate-500">{label}</span>
        <span className="text-slate-800 font-mono font-medium">{value}</span>
      </div>
      <div className="h-2 bg-indigo-50 rounded-full overflow-hidden">
        <motion.div
          className={`h-full rounded-full bg-gradient-to-r ${colors[color]}`}
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
        />
      </div>
    </div>
  );
}

function AlertBanner({ alert, onDismiss }) {
  const styles = {
    danger:  'bg-red-500/15 border-red-500/40 text-red-300',
    warning: 'bg-yellow-500/15 border-yellow-500/40 text-yellow-300',
  };
  return (
    <motion.div
      initial={{ opacity: 0, y: -8, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8 }}
      className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${styles[alert.level]}`}
    >
      <BellRing className="w-4 h-4 flex-shrink-0 animate-bounce" />
      <span className="text-sm font-medium flex-1">{alert.msg}</span>
      {onDismiss && (
        <button onClick={onDismiss} className="text-xs opacity-60 hover:opacity-100">✕</button>
      )}
    </motion.div>
  );
}

function EmotionReport({ data }) {
  const riskColor = {
    düşük: 'text-green-400 bg-green-500/10 border-green-500/20',
    orta:  'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
    yüksek: 'text-orange-400 bg-orange-500/10 border-orange-500/20',
    kritik: 'text-red-400 bg-red-500/10 border-red-500/20',
  };

  const emotionColorMap = {
    stres:   'red',
    yorgunluk: 'orange',
    öfke:    'red',
    kaygı:   'yellow',
    sakinlik: 'green',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      {/* Acil uyarı */}
      <AnimatePresence>
        {data.acil_uyarı && (
          <AlertBanner
            alert={{ level: 'danger', msg: data.acil_uyarı_sebebi || 'Acil durum tespit edildi!' }}
          />
        )}
        {data.bağırma_tespit && !data.acil_uyarı && (
          <AlertBanner
            alert={{ level: 'warning', msg: 'Bağırma / yüksek ses tonu tespit edildi' }}
          />
        )}
      </AnimatePresence>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Duygu skorları */}
        <div className="bg-dark-800 border border-indigo-100 rounded-xl p-4 space-y-3">
          <h3 className="text-xs font-medium text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Brain className="w-3.5 h-3.5" /> Duygu Analizi
          </h3>
          {Object.entries(data.duygular || {}).map(([key, val]) => (
            <ScoreBar
              key={key}
              label={key.charAt(0).toUpperCase() + key.slice(1)}
              value={val}
              color={emotionColorMap[key] || 'blue'}
            />
          ))}
        </div>

        {/* Ses özellikleri */}
        <div className="bg-dark-800 border border-indigo-100 rounded-xl p-4 space-y-3">
          <h3 className="text-xs font-medium text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Volume2 className="w-3.5 h-3.5" /> Ses Özellikleri
          </h3>

          <div className="space-y-2">
            {[
              { label: 'Baskın Duygu', value: data.baskın_duygu },
              { label: 'Ses Tonu', value: data.ses_tonu },
              { label: 'Konuşma Hızı', value: data.konuşma_hızı },
              { label: 'Enerji Seviyesi', value: data.enerji_seviyesi },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between items-center py-1.5 border-b border-indigo-100 last:border-0">
                <span className="text-xs text-slate-400">{label}</span>
                <span className="text-xs font-medium text-slate-800 capitalize">{value || '—'}</span>
              </div>
            ))}
          </div>

          {/* Tükenmişlik riski */}
          <div className={`flex items-center justify-between px-3 py-2 rounded-lg border ${riskColor[data.tükenmişlik_riski] || riskColor['orta']}`}>
            <span className="text-xs font-medium">Tükenmişlik Riski</span>
            <span className="text-xs font-bold capitalize">{data.tükenmişlik_riski}</span>
          </div>
        </div>
      </div>

      {/* Özet & Öneriler */}
      {data.özet && (
        <div className="bg-dark-800 border border-indigo-100 rounded-xl p-4">
          <h3 className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5" /> Özet
          </h3>
          <p className="text-sm text-slate-600 leading-relaxed">{data.özet}</p>
        </div>
      )}

      {data.öneriler?.length > 0 && (
        <div className="bg-dark-800 border border-indigo-100 rounded-xl p-4">
          <h3 className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" /> Öneriler
          </h3>
          <ul className="space-y-2">
            {data.öneriler.map((o, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                <span className="text-safe-400 mt-0.5 flex-shrink-0">→</span>
                {o}
              </li>
            ))}
          </ul>
        </div>
      )}
    </motion.div>
  );
}

// ── Ana Sayfa ─────────────────────────────────────────────────────────────────

export default function EmotionPage() {
  const [activeTab, setActiveTab] = useState('live');

  // ── Canlı analiz state ────────────────────────────────────────────────────
  const [isRecording, setIsRecording] = useState(false);
  const [liveData, setLiveData] = useState(null);
  const [liveAlerts, setLiveAlerts] = useState([]);
  const analyzerRef = useRef(null);
  const rafRef = useRef(null);
  const streamRef = useRef(null);

  const startLive = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      analyzerRef.current = createAudioAnalyzer(stream);
      setIsRecording(true);
      setLiveAlerts([]);

      const loop = () => {
        const data = analyzerRef.current.analyze();
        setLiveData(data);

        // Bağırma / stres uyarısı — aynı uyarıyı tekrar ekleme
        if (data.alerts.length > 0) {
          setLiveAlerts((prev) => {
            const newAlerts = data.alerts.filter(
              (a) => !prev.some((p) => p.type === a.type)
            );
            return newAlerts.length > 0 ? [...prev, ...newAlerts].slice(-3) : prev;
          });
        }
        rafRef.current = requestAnimationFrame(loop);
      };
      rafRef.current = requestAnimationFrame(loop);
    } catch {
      alert('Mikrofon izni gerekli');
    }
  };

  const stopLive = () => {
    cancelAnimationFrame(rafRef.current);
    analyzerRef.current?.destroy();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    setIsRecording(false);
  };

  useEffect(() => () => stopLive(), []);

  // ── Dosya analizi state ───────────────────────────────────────────────────
  const [fileStatus, setFileStatus] = useState('idle');
  const [fileStatusMsg, setFileStatusMsg] = useState('');
  const [fileReport, setFileReport] = useState(null);
  const [fileError, setFileError] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);

  const handleFile = useCallback(async (file) => {
    if (!file) return;
    setFileError('');
    setFileReport(null);
    setFileStatus('loading');
    try {
      const report = await analyzeEmotionFromAudio(file, setFileStatusMsg);
      setFileReport(report);
      setFileStatus('done');
    } catch (err) {
      setFileStatus('error');
      setFileError(err.message || 'Analiz hatası');
    }
  }, []);

  // ── Renk yardımcıları ─────────────────────────────────────────────────────
  const stressColor = (v) =>
    v >= 70 ? 'text-red-400' : v >= 40 ? 'text-yellow-400' : 'text-green-400';

  return (
    <div className="min-h-screen bg-dark-900 text-slate-800 font-sans pb-12">
      {/* Header */}
      <div className="border-b border-indigo-100 bg-dark-800/60 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-vox-500 to-purple-600 flex items-center justify-center shadow-lg shadow-vox-500/20">
              <Brain className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-display font-bold text-slate-800 leading-none">Duygu Analizi</h1>
              <p className="text-xs text-slate-400 mt-0.5">Stres · Yorgunluk · Bağırma Tespiti</p>
            </div>
          </div>

          <div className="flex items-center gap-1 bg-dark-700/60 border border-indigo-100 rounded-xl p-1">
            {[
              { id: 'live', icon: Mic, label: 'Canlı' },
              { id: 'file', icon: Upload, label: 'Ses Dosyası' },
            ].map(({ id, icon: Icon, label }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  activeTab === id ? 'bg-indigo-50 text-slate-800' : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                <Icon className="w-3.5 h-3.5" /> {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">

        {/* ── CANLI ANALİZ ── */}
        {activeTab === 'live' && (
          <div className="space-y-6">
            {/* Uyarılar */}
            <AnimatePresence>
              {liveAlerts.map((alert, i) => (
                <AlertBanner
                  key={alert.type}
                  alert={alert}
                  onDismiss={() => setLiveAlerts((p) => p.filter((_, j) => j !== i))}
                />
              ))}
            </AnimatePresence>

            {/* Mikrofon butonu */}
            <div className="flex flex-col items-center gap-4">
              <div className="relative">
                {isRecording && (
                  <>
                    <motion.div
                      className="absolute inset-0 rounded-full bg-vox-500/20"
                      animate={{ scale: [1, 1.6, 1], opacity: [0.5, 0, 0.5] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    />
                    <motion.div
                      className="absolute inset-0 rounded-full bg-vox-500/10"
                      animate={{ scale: [1, 2.1, 1], opacity: [0.3, 0, 0.3] }}
                      transition={{ duration: 1.5, repeat: Infinity, delay: 0.3 }}
                    />
                  </>
                )}
                <motion.button
                  onClick={isRecording ? stopLive : startLive}
                  whileTap={{ scale: 0.95 }}
                  className={`relative w-20 h-20 rounded-full flex items-center justify-center shadow-2xl transition-colors ${
                    isRecording
                      ? 'bg-red-500 shadow-red-500/40'
                      : 'bg-gradient-to-br from-vox-500 to-purple-600 shadow-vox-500/30'
                  }`}
                >
                  {isRecording ? <MicOff className="w-9 h-9 text-slate-800" /> : <Mic className="w-9 h-9 text-slate-800" />}
                </motion.button>
              </div>
              <p className="text-sm text-slate-400">
                {isRecording ? 'Analiz ediliyor — durdurmak için tıkla' : 'Başlatmak için tıkla'}
              </p>
            </div>

            {/* Gerçek zamanlı metrikler */}
            <AnimatePresence>
              {liveData && isRecording && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="grid grid-cols-2 md:grid-cols-4 gap-3"
                >
                  {[
                    {
                      icon: Volume2,
                      label: 'Ses Enerjisi',
                      value: liveData.rms,
                      unit: '',
                      color: liveData.isShouting ? 'text-red-400' : stressColor(liveData.rms),
                      warning: liveData.isShouting,
                    },
                    {
                      icon: Activity,
                      label: 'Pitch',
                      value: liveData.pitch,
                      unit: 'Hz',
                      color: stressColor((liveData.pitch / 600) * 100),
                    },
                    {
                      icon: Zap,
                      label: 'Stres Skoru',
                      value: liveData.stress,
                      unit: '',
                      color: stressColor(liveData.stress),
                    },
                    {
                      icon: Wind,
                      label: 'Yorgunluk',
                      value: liveData.fatigue,
                      unit: '',
                      color: stressColor(liveData.fatigue),
                    },
                  ].map(({ icon: Icon, label, value, unit, color, warning }) => (
                    <div
                      key={label}
                      className={`bg-dark-800 border rounded-xl p-4 ${
                        warning ? 'border-red-500/50 shadow-lg shadow-red-500/10' : 'border-indigo-100'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 mb-2">
                        <Icon className={`w-3.5 h-3.5 ${color}`} />
                        <span className="text-xs text-slate-400">{label}</span>
                        {warning && <span className="text-xs text-red-400 animate-pulse">⚠</span>}
                      </div>
                      <p className={`text-2xl font-bold font-mono ${color}`}>
                        {liveData.isSilence && label === 'Ses Enerjisi' ? '—' : value}
                        {unit && <span className="text-sm font-normal text-slate-400 ml-1">{unit}</span>}
                      </p>
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Frekans bandı */}
            {liveData && isRecording && !liveData.isSilence && (
              <div className="bg-dark-800 border border-indigo-100 rounded-xl p-4">
                <p className="text-xs text-slate-400 mb-3">Frekans Bandı Enerjisi</p>
                <div className="flex items-end gap-2 h-16">
                  {[
                    { label: 'Alçak', value: liveData.bands.low, color: 'bg-blue-500' },
                    { label: 'Orta', value: liveData.bands.mid, color: 'bg-vox-500' },
                    { label: 'Yüksek', value: liveData.bands.high, color: 'bg-orange-500' },
                  ].map(({ label, value, color }) => (
                    <div key={label} className="flex-1 flex flex-col items-center gap-1">
                      <motion.div
                        className={`w-full rounded-t-md ${color} opacity-80`}
                        animate={{ height: `${Math.max(4, (value / 128) * 56)}px` }}
                        transition={{ duration: 0.1 }}
                      />
                      <span className="text-xs text-slate-400">{label}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── DOSYA ANALİZİ ── */}
        {activeTab === 'file' && (
          <div className="space-y-6">
            {/* Upload alanı */}
            <div
              onClick={() => fileStatus !== 'loading' && fileInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]); }}
              className={`border-2 border-dashed rounded-2xl p-12 text-center transition-all cursor-pointer ${
                fileStatus === 'loading'
                  ? 'border-vox-500/40 bg-vox-500/5 cursor-wait'
                  : dragOver
                    ? 'border-vox-400 bg-vox-500/10'
                    : 'border-indigo-200 hover:border-indigo-300 bg-dark-800/40'
              }`}
            >
              <input ref={fileInputRef} type="file" accept="audio/*" className="hidden"
                onChange={(e) => handleFile(e.target.files[0])} />

              {fileStatus === 'loading' ? (
                <div className="space-y-3">
                  <Loader2 className="w-9 h-9 text-vox-400 mx-auto animate-spin" />
                  <p className="text-sm text-slate-600 font-medium">{fileStatusMsg}</p>
                  <p className="text-xs text-slate-400">Ses tonu + içerik analizi yapılıyor...</p>
                </div>
              ) : fileStatus === 'done' ? (
                <div className="space-y-2">
                  <CheckCircle2 className="w-9 h-9 text-green-400 mx-auto" />
                  <p className="text-sm text-slate-600">Analiz tamamlandı</p>
                  <p className="text-xs text-slate-400">Yeni dosya için tıkla</p>
                </div>
              ) : (
                <>
                  <Brain className="w-9 h-9 text-slate-400 mx-auto mb-3" />
                  <p className="text-sm text-slate-500 font-medium">Ses dosyasını sürükle veya tıkla</p>
                  <p className="text-xs text-slate-400 mt-1.5">mp3 · wav · m4a · ogg · webm</p>
                  <p className="text-xs text-slate-400 mt-1">Gemini ses tonunu + içeriği birlikte analiz eder</p>
                </>
              )}
            </div>

            {/* Hata */}
            {fileError && (
              <div className="flex items-center gap-2 text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-sm">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                {fileError}
              </div>
            )}

            {/* Rapor */}
            {fileReport && <EmotionReport data={fileReport} />}
          </div>
        )}
      </div>
    </div>
  );
}
