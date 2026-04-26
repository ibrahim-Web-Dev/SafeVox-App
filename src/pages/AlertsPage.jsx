import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertTriangle, ShieldAlert, Volume2, MessageSquareX,
  Clock, User, FileAudio, ChevronDown, ChevronUp,
  CheckCheck, Filter, Bell, Flame, Mic,
} from 'lucide-react';

// ── Mock Uyarı Verisi ─────────────────────────────────────────────────────────
const MOCK_ALERTS = [
  {
    id: 1,
    employee:  'Mehmet Demir',
    file:      'kayit_mehmet_2g.webm',
    date:      '2026-04-02',
    time:      '09:14',
    type:      'swear',
    severity:  'critical',
    segment:   '0:25 – 0:31',
    detail:    'Görüşmenin 0:25 ile 0:31 saniye aralığında uygunsuz ifade kullanıldığı tespit edildi. Müşteriye yönelik olup olmadığı belirsiz.',
    resolved:  false,
  },
  {
    id: 2,
    employee:  'Serkan Aktaş',
    file:      'kayit_serkan_6g.webm',
    date:      '2026-04-01',
    time:      '14:52',
    type:      'yelling',
    severity:  'critical',
    segment:   '1:10 – 1:18',
    detail:    '1:10 ile 1:18 saniye aralığında ses tonu aniden yükseldi, bağırma eşiği aşıldı. Müşteri tepkisi sonrasında gerçekleşti.',
    resolved:  false,
  },
  {
    id: 3,
    employee:  'Burak Koç',
    file:      'kayit_burak_6g.webm',
    date:      '2026-04-01',
    time:      '11:30',
    type:      'aggression',
    severity:  'warning',
    segment:   '2:44 – 2:52',
    detail:    '2:44 – 2:52 saniye aralığında sert ve keskin bir konuşma tonu saptandı. Müşteriye yönelik agresif bir tavır olup olmadığı incelenebilir.',
    resolved:  false,
  },
  {
    id: 4,
    employee:  'Kadir Polat',
    file:      'kayit_kadir_10g.webm',
    date:      '2026-03-30',
    time:      '16:05',
    type:      'swear',
    severity:  'warning',
    segment:   '0:08 – 0:11',
    detail:    'Görüşmenin başında 0:08 – 0:11 saniye arasında düşük şiddette uygunsuz ifade tespit edildi. Müşteri henüz hatta değildi.',
    resolved:  true,
  },
  {
    id: 5,
    employee:  'Oğuz Kılıç',
    file:      'kayit_oguz_6g.webm',
    date:      '2026-03-31',
    time:      '10:22',
    type:      'yelling',
    severity:  'warning',
    segment:   '3:55 – 4:03',
    detail:    '3:55 – 4:03 saniye aralığında yüksek ses tonu. Teknik destek görüşmesinde müşteri bağlantısı kesilirken yaşandı.',
    resolved:  true,
  },
  {
    id: 6,
    employee:  'Emre Öztürk',
    file:      'kayit_emre_2g.webm',
    date:      '2026-04-02',
    time:      '15:40',
    type:      'silence',
    severity:  'info',
    segment:   '5:10 – 6:30',
    detail:    'Görüşme ortasında 80 saniyelik beklenmedik sessizlik. Temsilci müşteriye yanıt vermediği için müşteri bağlantıyı kesti.',
    resolved:  false,
  },
  {
    id: 7,
    employee:  'Gamze Özer',
    file:      'kayit_gamze_6g.webm',
    date:      '2026-03-31',
    time:      '13:18',
    type:      'aggression',
    severity:  'info',
    segment:   '1:30 – 1:38',
    detail:    'Konuşma temposu ve ton değişimi dikkat çekici. Ciddi bir agresyon tespit edilmedi, ancak takip önerilir.',
    resolved:  true,
  },
  {
    id: 8,
    employee:  'Murat Çakır',
    file:      'kayit_murat_2g.webm',
    date:      '2026-04-02',
    time:      '08:55',
    type:      'swear',
    severity:  'critical',
    segment:   '0:45 – 0:49',
    detail:    '0:45 – 0:49 aralığında açık uygunsuz ifade tespit edildi. Müşteri hattadayken gerçekleşti, ivedi inceleme önerilir.',
    resolved:  false,
  },
];

// ── Yardımcılar ───────────────────────────────────────────────────────────────
const TYPE_CONFIG = {
  swear:      { label: 'Uygunsuz İfade',  icon: MessageSquareX, color: 'text-red-400',    bg: 'bg-red-500/10 border-red-500/25' },
  yelling:    { label: 'Bağırma',          icon: Volume2,        color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/25' },
  aggression: { label: 'Agresif Ton',      icon: Flame,          color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/25' },
  silence:    { label: 'Uzun Sessizlik',   icon: Mic,            color: 'text-blue-400',   bg: 'bg-blue-500/10 border-blue-500/25' },
};

const SEVERITY_CONFIG = {
  critical: { label: 'Kritik',  dot: 'bg-red-500',    badge: 'text-red-400 bg-red-500/15 border-red-500/30' },
  warning:  { label: 'Uyarı',   dot: 'bg-orange-400', badge: 'text-orange-400 bg-orange-500/15 border-orange-500/30' },
  info:     { label: 'Bilgi',   dot: 'bg-blue-400',   badge: 'text-blue-400 bg-blue-500/15 border-blue-500/30' },
};

function AlertCard({ alert, onResolve }) {
  const [expanded, setExpanded] = useState(false);
  const type = TYPE_CONFIG[alert.type];
  const sev  = SEVERITY_CONFIG[alert.severity];
  const Icon = type.icon;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      className={`border rounded-xl overflow-hidden transition-all ${
        alert.resolved
          ? 'bg-dark-800/30 border-indigo-100 opacity-50'
          : `${type.bg} border`
      }`}
    >
      {/* Üst satır */}
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer"
        onClick={() => setExpanded((v) => !v)}
      >
        {/* Severity dot */}
        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${sev.dot} ${
          !alert.resolved && alert.severity === 'critical' ? 'animate-pulse' : ''
        }`} />

        {/* İkon */}
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${type.bg}`}>
          <Icon className={`w-4 h-4 ${type.color}`} />
        </div>

        {/* Bilgiler */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-slate-800">{alert.employee}</span>
            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${sev.badge}`}>
              {sev.label}
            </span>
            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${type.bg} ${type.color}`}>
              {type.label}
            </span>
            {alert.resolved && (
              <span className="text-[10px] text-green-400 flex items-center gap-0.5">
                <CheckCheck className="w-3 h-3" /> İncelendi
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 mt-0.5 text-xs text-slate-400">
            <span className="flex items-center gap-1">
              <FileAudio className="w-3 h-3" />{alert.file}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />{alert.segment}
            </span>
            <span>{alert.date} {alert.time}</span>
          </div>
        </div>

        {/* Genişlet */}
        <div className="text-slate-400 flex-shrink-0">
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </div>

      {/* Detay */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-1 border-t border-indigo-100">
              <p className="text-sm text-slate-600 leading-relaxed mb-3">{alert.detail}</p>
              <div className="flex items-center gap-2">
                {!alert.resolved && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onResolve(alert.id); }}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold
                               bg-green-500/15 border border-green-500/30 text-green-400
                               hover:bg-green-500/25 rounded-lg transition"
                  >
                    <CheckCheck className="w-3.5 h-3.5" /> İncelendi Olarak İşaretle
                  </button>
                )}
                <span className="text-xs text-slate-400">
                  Kayıt: <span className="text-slate-500 font-mono">{alert.file}</span>
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── Ana Sayfa ─────────────────────────────────────────────────────────────────
export default function AlertsPage() {
  const [alerts, setAlerts]         = useState(MOCK_ALERTS);
  const [filterSev, setFilterSev]   = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [hideResolved, setHideResolved] = useState(false);

  const resolve = (id) => {
    setAlerts((prev) => prev.map((a) => a.id === id ? { ...a, resolved: true } : a));
  };

  const filtered = alerts.filter((a) => {
    if (hideResolved && a.resolved) return false;
    if (filterSev  !== 'all' && a.severity !== filterSev)  return false;
    if (filterType !== 'all' && a.type     !== filterType) return false;
    return true;
  });

  const counts = {
    critical: alerts.filter((a) => !a.resolved && a.severity === 'critical').length,
    warning:  alerts.filter((a) => !a.resolved && a.severity === 'warning').length,
    total:    alerts.filter((a) => !a.resolved).length,
  };

  return (
    <div className="min-h-screen bg-dark-900 text-slate-800 font-sans pb-12">
      {/* Header */}
      <div className="border-b border-indigo-100 bg-dark-800/60 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-red-500 to-orange-600 flex items-center justify-center shadow-lg shadow-red-500/25">
              <ShieldAlert className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-display font-bold text-slate-800 leading-none">Anlık Risk Uyarıları</h1>
              <p className="text-xs text-slate-400 mt-0.5">Görüşme kayıtlarında tespit edilen kritik olaylar</p>
            </div>
          </div>

          {/* Özet sayaçlar */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 border border-red-500/25 rounded-lg">
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-xs font-semibold text-red-400">{counts.critical} Kritik</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-500/10 border border-orange-500/25 rounded-lg">
              <div className="w-2 h-2 rounded-full bg-orange-400" />
              <span className="text-xs font-semibold text-orange-400">{counts.warning} Uyarı</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-dark-700 border border-indigo-100 rounded-lg">
              <Bell className="w-3.5 h-3.5 text-slate-500" />
              <span className="text-xs text-slate-500">{counts.total} Açık</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6 flex flex-col gap-4">

        {/* Filtreler */}
        <div className="flex items-center gap-3 flex-wrap">
          <Filter className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />

          <select value={filterSev} onChange={(e) => setFilterSev(e.target.value)}
            className="bg-dark-700 border border-indigo-100 rounded-lg px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-safe-500">
            <option value="all">Tüm Seviyeler</option>
            <option value="critical">Kritik</option>
            <option value="warning">Uyarı</option>
            <option value="info">Bilgi</option>
          </select>

          <select value={filterType} onChange={(e) => setFilterType(e.target.value)}
            className="bg-dark-700 border border-indigo-100 rounded-lg px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-safe-500">
            <option value="all">Tüm Türler</option>
            <option value="swear">Uygunsuz İfade</option>
            <option value="yelling">Bağırma</option>
            <option value="aggression">Agresif Ton</option>
            <option value="silence">Uzun Sessizlik</option>
          </select>

          <button
            onClick={() => setHideResolved((v) => !v)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border transition ${
              hideResolved
                ? 'bg-safe-500/20 border-safe-500/40 text-safe-300'
                : 'bg-dark-700 border-indigo-100 text-slate-500 hover:text-slate-800'
            }`}
          >
            <CheckCheck className="w-3.5 h-3.5" />
            {hideResolved ? 'İncelenenler gizli' : 'İncelenenler göster'}
          </button>

          <span className="text-xs text-slate-400 ml-auto">{filtered.length} kayıt</span>
        </div>

        {/* Uyarı listesi */}
        <div className="flex flex-col gap-3">
          <AnimatePresence mode="popLayout">
            {filtered.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-16 text-slate-400 text-sm"
              >
                Filtreyle eşleşen uyarı bulunamadı.
              </motion.div>
            ) : (
              filtered.map((alert) => (
                <AlertCard key={alert.id} alert={alert} onResolve={resolve} />
              ))
            )}
          </AnimatePresence>
        </div>

        {/* Alt bilgi */}
        <p className="text-xs text-slate-300 text-center mt-4">
          Bu uyarılar yapay zeka tarafından otomatik üretilmektedir. Kesin yargıya varmadan önce ilgili kayıt dinlenmelidir.
        </p>
      </div>
    </div>
  );
}
