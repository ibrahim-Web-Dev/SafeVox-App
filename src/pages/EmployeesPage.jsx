import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, Plus, Trash2, Upload, ChevronRight,
  AlertTriangle, AlertCircle, TrendingUp, TrendingDown, Minus,
  Brain, Loader2, Calendar, FileAudio, X, CheckCircle2,
  Coffee, BookOpen, Sparkles, Clock, PlayCircle, CheckCheck, Pencil,
} from 'lucide-react';
import { loadMockData } from '../utils/mockData';
import {
  getEmployeesWithRisk, addEmployee, deleteEmployee,
  addRecording, deleteRecording, calcTrend, getRecordings,
  getBreaks, addBreak, deleteBreak,
  getCourses, assignCourse, updateCourseStatus, deleteCourse,
  getSchedule, setSlotLoad,
} from '../utils/employeeStore';

// ── Kurs Kataloğu ──────────────────────────────────────────────────────────────
const COURSE_CATALOG = [
  { courseId: 'anger',        label: 'Öfke Yönetimi',                  icon: '😤', duration: '2 saat',   levels: ['critical', 'warning'] },
  { courseId: 'stress',       label: 'Stres Yönetimi',                 icon: '🧘', duration: '3 saat',   levels: ['critical', 'warning', 'watch'] },
  { courseId: 'burnout',      label: 'Tükenmişlik Önleme',             icon: '🔋', duration: '4 saat',   levels: ['critical'] },
  { courseId: 'mindfulness',  label: 'Mindfulness & Nefes Egzersizi',  icon: '🌿', duration: '1.5 saat', levels: ['warning', 'watch'] },
  { courseId: 'communication',label: 'İletişim Becerileri',            icon: '💬', duration: '3 saat',   levels: ['critical', 'warning', 'watch', 'none'] },
  { courseId: 'empathy',      label: 'Empati & Müşteri İlişkileri',    icon: '🤝', duration: '2.5 saat', levels: ['warning', 'watch', 'none'] },
  { courseId: 'motivation',   label: 'Motivasyon Teknikleri',          icon: '🚀', duration: '2 saat',   levels: ['watch', 'none'] },
  { courseId: 'time',         label: 'Zaman Yönetimi',                 icon: '⏰', duration: '2 saat',   levels: ['watch', 'none'] },
];

// ── Mola Tipleri ──────────────────────────────────────────────────────────────
const BREAK_TYPES = [
  { type: 'coffee', label: 'Kahve Molası',  icon: '☕', duration: '15 dk' },
  { type: 'short',  label: 'Kısa Mola',    icon: '🌬️', duration: '30 dk' },
  { type: 'long',   label: 'Uzun Mola',    icon: '🌳', duration: '1 saat' },
  { type: 'day',    label: 'Günlük İzin',  icon: '🏖️', duration: 'Bugün' },
];

// ── Akıllı Öneri Motoru ───────────────────────────────────────────────────────
function getSmartRecommendations(trend) {
  const level = trend.alertLevel;
  if (level === 'critical') {
    return {
      breaks: ['coffee', 'long', 'day'],
      courses: ['burnout', 'stress', 'anger'],
      message: 'Kritik stres seviyesi — acil mola ve kurs ataması önerilir.',
      urgency: 'critical',
    };
  }
  if (level === 'warning') {
    return {
      breaks: ['coffee', 'short'],
      courses: ['stress', 'anger', 'mindfulness'],
      message: 'Stres artış eğilimi var — kısa mola ve stres yönetimi kursu faydalı olabilir.',
      urgency: 'warning',
    };
  }
  if (level === 'watch') {
    return {
      breaks: ['coffee'],
      courses: ['mindfulness', 'communication', 'motivation'],
      message: 'Stres takip seviyesinde — motivasyon destekleyici içerikler önerilir.',
      urgency: 'watch',
    };
  }
  return {
    breaks: ['coffee'],
    courses: ['communication', 'empathy', 'time'],
    message: 'Performans gelişimi için isteğe bağlı kurslar atanabilir.',
    urgency: 'none',
  };
}

// ── Zaman Dilimi Yardımcıları ─────────────────────────────────────────────────
const TIME_SLOTS = [
  '08:00','08:30','09:00','09:30','10:00','10:30',
  '11:00','11:30','12:00','12:30','13:00','13:30',
  '14:00','14:30','15:00','15:30','16:00','16:30',
  '17:00','17:30','18:00',
];

function loadStyle(load) {
  if (load >= 67) return { ring: 'border-red-500/50 bg-red-500/12',    dot: 'bg-red-500',    text: 'text-red-400',    label: 'Yoğun'  };
  if (load >= 34) return { ring: 'border-yellow-500/50 bg-yellow-500/10', dot: 'bg-yellow-400', text: 'text-yellow-400', label: 'Orta'   };
  return              { ring: 'border-green-500/40 bg-green-500/10',   dot: 'bg-green-500',  text: 'text-green-400',  label: 'Uygun'  };
}

// ── Öneri Paneli ──────────────────────────────────────────────────────────────
function RecommendationsPanel({ employee }) {
  const [tab, setTab]               = useState('breaks');
  const [breaks, setBreaks]         = useState([]);
  const [courses, setCourses]       = useState([]);
  const [toast, setToast]           = useState('');
  const [schedule, setSchedule]     = useState({});
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [editMode, setEditMode]     = useState(false);
  const [cooldown, setCooldown]     = useState(false); // çift tıklama koruması

  const reload = useCallback(() => {
    setBreaks(getBreaks(employee.id));
    setCourses(getCourses(employee.id));
    setSchedule(getSchedule());
  }, [employee.id]);

  useEffect(() => { reload(); }, [reload]);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2800);
  };

  // Mola ver — zaman seçimi zorunlu, cooldown korumalı
  const handleBreak = (bt) => {
    if (!selectedSlot) { showToast('⏰ Önce bir zaman dilimi seç!'); return; }
    if (cooldown) return;
    setCooldown(true);
    addBreak(employee.id, { ...bt, scheduledTime: selectedSlot });
    reload();
    showToast(`${bt.icon} ${bt.label} — ${selectedSlot} saati için planlandı`);
    setSelectedSlot(null);
    setTimeout(() => setCooldown(false), 3000); // 3 sn kilitli
  };

  // Takvim düzenleme: tıklayınca uygun → orta → yoğun döngüsü
  const cycleLoad = (time) => {
    const cur = schedule[time] ?? 50;
    const next = cur >= 67 ? 20 : cur >= 34 ? 80 : 50;
    setSlotLoad(time, next);
    setSchedule(getSchedule());
  };

  const handleAssign = (course) => {
    const result = assignCourse(employee.id, course);
    reload();
    showToast(result.createdAt > Date.now() - 300
      ? `📚 "${course.label}" kursu atandı!`
      : 'Bu kurs zaten atanmış durumda.');
  };

  const handleCourseStatus = (id, status) => { updateCourseStatus(id, status); reload(); };

  const smart = getSmartRecommendations(employee.trend);
  const urgencyBg = {
    critical: 'border-red-500/40 bg-red-500/10 text-red-300',
    warning:  'border-orange-500/40 bg-orange-500/10 text-orange-300',
    watch:    'border-yellow-500/40 bg-yellow-500/10 text-yellow-300',
    none:     'border-blue-500/40 bg-blue-500/10 text-blue-300',
  };
  const statusLabel = { assigned: 'Atandı', 'in-progress': 'Devam', completed: 'Tamamlandı' };
  const statusColor = {
    assigned:     'text-yellow-400 bg-yellow-400/10 border-yellow-400/30',
    'in-progress':'text-blue-400 bg-blue-400/10 border-blue-400/30',
    completed:    'text-green-400 bg-green-400/10 border-green-400/30',
  };

  // Son mola zamanından bu yana geçen süre (dk)
  const lastBreak   = breaks[0];
  const minsSince   = lastBreak ? Math.floor((Date.now() - lastBreak.createdAt) / 60000) : null;
  const tooRecent   = minsSince !== null && minsSince < 30;

  return (
    <div className="bg-dark-800 border border-indigo-100 rounded-xl overflow-hidden">
      {/* Başlık */}
      <div className="px-4 py-3 border-b border-indigo-100 flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-yellow-400" />
        <span className="text-xs text-slate-500 uppercase tracking-wider font-medium">Öneriler & Aksiyonlar</span>
      </div>

      {/* Akıllı öneri mesajı */}
      <div className={`mx-4 mt-3 px-3 py-2 rounded-lg border text-xs font-medium ${urgencyBg[smart.urgency]}`}>
        {smart.message}
      </div>

      {/* Sekmeler */}
      <div className="flex gap-1 mx-4 mt-3 bg-dark-700/60 border border-indigo-100 rounded-xl p-1">
        {[
          { key: 'breaks',  icon: Coffee,   label: 'Mola Ver',  badge: breaks.length,                               activeClass: 'bg-orange-500/20 text-orange-300 border-orange-500/30' },
          { key: 'courses', icon: BookOpen, label: 'Kurslar',   badge: courses.filter(c => c.status !== 'completed').length, activeClass: 'bg-blue-500/20 text-blue-300 border-blue-500/30' },
        ].map(({ key, icon: Icon, label, badge, activeClass }) => (
          <button key={key} onClick={() => setTab(key)}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-medium transition-all border ${
              tab === key ? activeClass : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}>
            <Icon className="w-3.5 h-3.5" />
            {label}
            {badge > 0 && <span className="text-xs px-1.5 rounded-full bg-indigo-50">{badge}</span>}
          </button>
        ))}
      </div>

      <div className="p-4 space-y-4">

        {/* ── MOLA SEKMESİ ── */}
        {tab === 'breaks' && (
          <>
            {/* Son mola uyarısı */}
            {tooRecent && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-yellow-500/10 border border-yellow-500/25 text-yellow-300 text-xs">
                <Clock className="w-3.5 h-3.5 flex-shrink-0" />
                Son mola {minsSince} dakika önce verildi — en az 30 dk aralık önerilir.
              </div>
            )}

            {/* ── Zaman Dilimi Seçici ── */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-slate-400 uppercase tracking-wider">Şirket Yoğunluk Takvimi</p>
                <button
                  onClick={() => setEditMode(p => !p)}
                  className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-lg border transition-all ${
                    editMode
                      ? 'bg-vox-500/20 border-vox-500/35 text-vox-300'
                      : 'bg-indigo-50/60 border-indigo-100 text-slate-400 hover:text-slate-600'
                  }`}
                >
                  <Pencil className="w-2.5 h-2.5" />
                  {editMode ? 'Düzenleniyor' : 'Düzenle'}
                </button>
              </div>

              {editMode && (
                <p className="text-xs text-slate-400 mb-2">
                  Tıkla: <span className="text-green-400">Uygun</span> → <span className="text-yellow-400">Orta</span> → <span className="text-red-400">Yoğun</span> döngüsü
                </p>
              )}

              <div className="grid grid-cols-7 gap-1">
                {TIME_SLOTS.map(slot => {
                  const load  = schedule[slot] ?? 50;
                  const style = loadStyle(load);
                  const isSel = selectedSlot === slot;
                  return (
                    <motion.button
                      key={slot}
                      whileTap={{ scale: 0.93 }}
                      onClick={() => editMode ? cycleLoad(slot) : setSelectedSlot(isSel ? null : slot)}
                      className={`flex flex-col items-center gap-0.5 py-1.5 px-1 rounded-lg border text-center transition-all ${
                        isSel && !editMode
                          ? 'ring-2 ring-white/40 bg-white/80 border-white/40'
                          : style.ring
                      }`}
                    >
                      <span className={`w-2 h-2 rounded-full ${style.dot}`} />
                      <span className="text-xs font-mono text-slate-600 leading-none">{slot}</span>
                    </motion.button>
                  );
                })}
              </div>

              {/* Renk göstergesi */}
              <div className="flex items-center gap-3 mt-2">
                {[['bg-green-500','Uygun'],['bg-yellow-400','Orta'],['bg-red-500','Yoğun']].map(([c,l]) => (
                  <div key={l} className="flex items-center gap-1">
                    <span className={`w-2 h-2 rounded-full ${c}`} />
                    <span className="text-xs text-slate-400">{l}</span>
                  </div>
                ))}
                {selectedSlot && (
                  <span className="ml-auto text-xs text-slate-800 font-medium bg-indigo-50 px-2 py-0.5 rounded-full">
                    ⏰ {selectedSlot} seçildi
                  </span>
                )}
              </div>
            </div>

            {/* ── Mola Butonları ── */}
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wider mb-2">
                {smart.breaks.length ? 'Önerilen Molalar' : 'Molalar'}
              </p>
              <div className="grid grid-cols-2 gap-2">
                {BREAK_TYPES.map(bt => {
                  const isRecommended = smart.breaks.includes(bt.type);
                  const disabled = cooldown || !selectedSlot;
                  return (
                    <motion.button
                      key={bt.type}
                      whileTap={disabled ? {} : { scale: 0.97 }}
                      onClick={() => handleBreak(bt)}
                      disabled={disabled}
                      className={`relative flex items-center gap-2 px-3 py-2.5 rounded-xl border transition-all text-left
                        ${disabled
                          ? 'opacity-45 cursor-not-allowed bg-white/4 border-indigo-100'
                          : isRecommended
                            ? 'bg-orange-500/12 border-orange-500/30 hover:bg-orange-500/22 hover:border-orange-500/45'
                            : 'bg-white/4 border-indigo-100 hover:bg-indigo-50 hover:border-white/18'
                        }`}
                    >
                      {isRecommended && !disabled && (
                        <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-orange-400" />
                      )}
                      <span className="text-lg leading-none">{bt.icon}</span>
                      <div>
                        <p className="text-xs font-medium text-slate-800">{bt.label}</p>
                        <p className="text-xs text-slate-400">{bt.duration}</p>
                      </div>
                    </motion.button>
                  );
                })}
              </div>
              {!selectedSlot && (
                <p className="text-xs text-slate-400 mt-1.5 text-center">Mola vermek için önce bir zaman dilimi seç</p>
              )}
            </div>

            {/* Son molalar */}
            {breaks.length > 0 && (
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wider mb-2">Son Molalar</p>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {breaks.slice(0, 6).map(b => (
                    <div key={b.id} className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-dark-700/60 border border-indigo-100">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-sm flex-shrink-0">{BREAK_TYPES.find(bt => bt.type === b.type)?.icon || '⏸️'}</span>
                        <span className="text-xs text-slate-600 truncate">{b.label}</span>
                        <span className="text-xs text-slate-400 flex-shrink-0">
                          {b.scheduledTime ? `@${b.scheduledTime}` : ''} · {b.date}
                        </span>
                      </div>
                      <button onClick={() => { deleteBreak(b.id); reload(); }}
                        className="text-slate-300 hover:text-red-400 transition-colors flex-shrink-0 ml-2">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* ── KURSLAR SEKMESİ ── */}
        {tab === 'courses' && (
          <>
            <p className="text-xs text-slate-400 uppercase tracking-wider">Önerilen Kurslar</p>
            <div className="space-y-2">
              {COURSE_CATALOG.filter(c => smart.courses.includes(c.courseId)).map(course => {
                const assigned = courses.find(c => c.courseId === course.courseId && c.status !== 'completed');
                return (
                  <div key={course.courseId}
                    className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-blue-500/8 border border-blue-500/20">
                    <div className="flex items-center gap-2.5">
                      <span className="text-xl leading-none">{course.icon}</span>
                      <div>
                        <p className="text-xs font-medium text-slate-800">{course.label}</p>
                        <div className="flex items-center gap-1 mt-0.5">
                          <Clock className="w-2.5 h-2.5 text-slate-400" />
                          <span className="text-xs text-slate-400">{course.duration}</span>
                        </div>
                      </div>
                    </div>
                    {assigned ? (
                      <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${statusColor[assigned.status]}`}>
                        {statusLabel[assigned.status]}
                      </span>
                    ) : (
                      <motion.button whileTap={{ scale: 0.95 }} onClick={() => handleAssign(course)}
                        className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg bg-blue-500/20 border border-blue-500/35 text-blue-300 hover:bg-blue-500/35 transition-all">
                        <Plus className="w-3 h-3" /> Ata
                      </motion.button>
                    )}
                  </div>
                );
              })}
            </div>

            <details className="group">
              <summary className="text-xs text-slate-400 uppercase tracking-wider cursor-pointer hover:text-slate-500 list-none flex items-center gap-1 pt-1">
                <ChevronRight className="w-3 h-3 group-open:rotate-90 transition-transform" />
                Tüm Kurslar
              </summary>
              <div className="mt-2 space-y-1.5">
                {COURSE_CATALOG.filter(c => !smart.courses.includes(c.courseId)).map(course => {
                  const assigned = courses.find(c => c.courseId === course.courseId && c.status !== 'completed');
                  return (
                    <div key={course.courseId}
                      className="flex items-center justify-between px-3 py-2 rounded-xl bg-white/3 border border-indigo-100">
                      <div className="flex items-center gap-2">
                        <span className="text-base leading-none">{course.icon}</span>
                        <div>
                          <p className="text-xs text-slate-600">{course.label}</p>
                          <p className="text-xs text-slate-400">{course.duration}</p>
                        </div>
                      </div>
                      {assigned ? (
                        <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${statusColor[assigned.status]}`}>
                          {statusLabel[assigned.status]}
                        </span>
                      ) : (
                        <motion.button whileTap={{ scale: 0.95 }} onClick={() => handleAssign(course)}
                          className="text-xs px-2 py-0.5 rounded-lg bg-indigo-50/60 border border-indigo-100 text-slate-500 hover:text-slate-800 hover:border-indigo-200 transition-all">
                          Ata
                        </motion.button>
                      )}
                    </div>
                  );
                })}
              </div>
            </details>

            {courses.length > 0 && (
              <>
                <p className="text-xs text-slate-400 uppercase tracking-wider pt-1">Atanmış Kurslar</p>
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {courses.map(c => (
                    <div key={c.id}
                      className="flex items-center justify-between px-3 py-2 rounded-lg bg-dark-700/60 border border-indigo-100">
                      <div className="flex items-center gap-2">
                        <span className="text-sm">{c.icon}</span>
                        <div>
                          <p className="text-xs text-slate-600 font-medium">{c.label}</p>
                          <p className="text-xs text-slate-400">{c.assignedDate}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {c.status !== 'completed' && (
                          <>
                            {c.status === 'assigned' && (
                              <button onClick={() => handleCourseStatus(c.id, 'in-progress')} title="Başladı"
                                className="p-1 rounded text-slate-400 hover:text-blue-400 transition-colors">
                                <PlayCircle className="w-3.5 h-3.5" />
                              </button>
                            )}
                            <button onClick={() => handleCourseStatus(c.id, 'completed')} title="Tamamlandı"
                              className="p-1 rounded text-slate-400 hover:text-green-400 transition-colors">
                              <CheckCheck className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                        <span className={`text-xs px-1.5 py-0.5 rounded-full border ${statusColor[c.status]}`}>
                          {statusLabel[c.status]}
                        </span>
                        <button onClick={() => { deleteCourse(c.id); reload(); }}
                          className="text-slate-300 hover:text-red-400 transition-colors ml-1">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </div>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6 }}
            className="mx-4 mb-3 px-3 py-2 rounded-lg bg-safe-500/20 border border-safe-500/35 text-safe-300 text-xs font-medium text-center">
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── SVG Trend Grafiği ─────────────────────────────────────────────────────────
function TrendChart({ recordings, width = 500, height = 130 }) {
  if (recordings.length < 2) return (
    <div className="flex items-center justify-center h-[130px] text-slate-400 text-xs">
      En az 2 kayıt gerekli
    </div>
  );

  const pad = { top: 12, right: 16, bottom: 28, left: 32 };
  const w = width - pad.left - pad.right;
  const h = height - pad.top - pad.bottom;

  const toX = (i) => pad.left + (i / (recordings.length - 1)) * w;
  const toY = (v) => pad.top + (1 - v / 100) * h;

  const stressPoints  = recordings.map((r, i) => ({ x: toX(i), y: toY(r.stress) }));
  const fatiguePoints = recordings.map((r, i) => ({ x: toX(i), y: toY(r.fatigue) }));
  const toPath = (pts) => pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const gridLines = [0, 25, 50, 75, 100];

  return (
    <svg width="100%" viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
      {gridLines.map((v) => (
        <g key={v}>
          <line x1={pad.left} x2={pad.left + w} y1={toY(v)} y2={toY(v)}
            stroke="rgba(255,255,255,0.06)" strokeWidth={1} />
          <text x={pad.left - 6} y={toY(v)} textAnchor="end" dominantBaseline="middle"
            fill="rgba(255,255,255,0.25)" fontSize={9}>{v}</text>
        </g>
      ))}
      {recordings.map((r, i) => (
        <text key={i} x={toX(i)} y={height - 6} textAnchor="middle"
          fill="rgba(255,255,255,0.25)" fontSize={8}>{r.date.slice(5)}</text>
      ))}
      <path d={toPath(fatiguePoints)} stroke="#f97316" strokeWidth={1.5}
        fill="none" strokeDasharray="4 3" opacity={0.6} />
      <path d={toPath(stressPoints)} stroke="#a855f7" strokeWidth={2} fill="none" />
      {stressPoints.map((p, i) => {
        const v = recordings[i].stress;
        const color = v >= 70 ? '#ef4444' : v >= 45 ? '#eab308' : '#22c55e';
        return (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r={4} fill={color} />
            <text x={p.x} y={p.y - 8} textAnchor="middle" fill={color} fontSize={9} fontWeight="bold">{v}</text>
          </g>
        );
      })}
      <g transform={`translate(${pad.left}, 4)`}>
        <circle cx={6} cy={6} r={4} fill="#a855f7" />
        <text x={14} y={10} fill="rgba(255,255,255,0.5)" fontSize={9}>Stres</text>
        <line x1={60} x2={72} y1={6} y2={6} stroke="#f97316" strokeWidth={1.5} strokeDasharray="3 2" opacity={0.6} />
        <text x={76} y={10} fill="rgba(255,255,255,0.5)" fontSize={9}>Yorgunluk</text>
      </g>
    </svg>
  );
}

// ── Risk Rozeti ───────────────────────────────────────────────────────────────
function RiskBadge({ level }) {
  const styles = {
    critical: 'bg-red-500/20 border-red-500/40 text-red-300',
    warning:  'bg-orange-500/20 border-orange-500/40 text-orange-300',
    watch:    'bg-yellow-500/20 border-yellow-500/40 text-yellow-300',
    none:     'bg-green-500/20 border-green-500/40 text-green-300',
    nodata:   'bg-indigo-50/60 border-indigo-100 text-slate-400',
  };
  const labels = {
    critical: '🔴 Kritik', warning: '🟠 Uyarı',
    watch: '🟡 Takip', none: '🟢 Normal', nodata: 'Veri Yok',
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-lg border font-medium ${styles[level]}`}>
      {labels[level]}
    </span>
  );
}

// ── Trend İkonu ───────────────────────────────────────────────────────────────
function TrendIcon({ trend }) {
  if (trend === 'up')   return <TrendingUp  className="w-4 h-4 text-red-400" />;
  if (trend === 'down') return <TrendingDown className="w-4 h-4 text-green-400" />;
  return <Minus className="w-4 h-4 text-slate-400" />;
}

// ── Analiz Kaydet Modal ───────────────────────────────────────────────────────
function SaveRecordingModal({ employees, onSave, onClose }) {
  const [selectedEmp, setSelectedEmp] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [status, setStatus] = useState('idle');
  const [statusMsg, setStatusMsg] = useState('');
  const fileInputRef = useRef(null);

  const handleFile = async (file) => {
    if (!file || !selectedEmp) return;
    setStatus('loading');
    try {
      const { analyzeEmotionFromAudio: analyze } = await import('../utils/emotionAnalyzer');
      const result = await analyze(file, setStatusMsg);
      addRecording(selectedEmp, { date, fileName: file.name, analysisResult: result });
      setStatus('done');
      setTimeout(() => { onSave(); onClose(); }, 1000);
    } catch (err) {
      setStatus('idle');
      alert('Hata: ' + err.message);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-dark-800 border border-indigo-100 rounded-2xl p-6 w-full max-w-md space-y-4"
      >
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-slate-800">Görüşme Kaydı Ekle</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-800"><X className="w-4 h-4" /></button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Çalışan</label>
            <select value={selectedEmp} onChange={(e) => setSelectedEmp(e.target.value)}
              className="w-full bg-dark-700 border border-indigo-100 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-vox-500">
              <option value="">Seç...</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>{e.name} — {e.department || 'Departman yok'}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Tarih</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
              className="w-full bg-dark-700 border border-indigo-100 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-vox-500" />
          </div>
          <div>
            <input ref={fileInputRef} type="file" accept="audio/*" className="hidden"
              onChange={(e) => handleFile(e.target.files[0])} />
            <button onClick={() => selectedEmp && fileInputRef.current?.click()}
              disabled={!selectedEmp || status === 'loading'}
              className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-indigo-200 hover:border-vox-500/50 rounded-xl text-sm text-slate-500 hover:text-slate-800 transition-all disabled:opacity-40 disabled:cursor-not-allowed">
              {status === 'loading' ? (
                <><Loader2 className="w-4 h-4 animate-spin" />{statusMsg || 'Analiz ediliyor...'}</>
              ) : status === 'done' ? (
                <><CheckCircle2 className="w-4 h-4 text-green-400" />Kaydedildi!</>
              ) : (
                <><Upload className="w-4 h-4" />Ses dosyası seç ve analiz et</>
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// ── Ana Sayfa ─────────────────────────────────────────────────────────────────
export default function EmployeesPage() {
  const [employees, setEmployees]   = useState([]);
  const [selected, setSelected]     = useState(null);
  const [showAdd, setShowAdd]        = useState(false);
  const [showSave, setShowSave]      = useState(false);
  const [newName, setNewName]        = useState('');
  const [newDept, setNewDept]        = useState('');
  const [newEmpInfo, setNewEmpInfo]  = useState(null); // { name, empCode } — ekleme sonrası göster

  const refresh = useCallback(() => {
    setEmployees(getEmployeesWithRisk());
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const handleAdd = () => {
    if (!newName.trim()) return;
    const emp = addEmployee({ name: newName.trim(), department: newDept.trim() });
    setNewName(''); setNewDept(''); setShowAdd(false);
    setNewEmpInfo({ name: emp.name, empCode: emp.empCode });
    refresh();
  };

  const handleDeleteEmployee = (id) => {
    if (!confirm('Bu çalışan ve tüm kayıtları silinecek. Emin misin?')) return;
    if (selected?.id === id) setSelected(null);
    deleteEmployee(id);
    refresh();
  };

  const handleDeleteRecording = (recId) => {
    deleteRecording(recId);
    refresh();
    setSelected((prev) => prev
      ? { ...prev, recordings: getRecordings(prev.id), trend: calcTrend(getRecordings(prev.id)) }
      : null
    );
  };

  const selectedFull = selected
    ? employees.find((e) => e.id === selected.id) || selected
    : null;

  return (
    <div className="min-h-screen bg-dark-900 text-slate-800 font-sans pb-12">

      {/* ── Yeni çalışan giriş bilgisi modalı ── */}
      <AnimatePresence>
        {newEmpInfo && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center px-4"
            onClick={() => setNewEmpInfo(null)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 16 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 16 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-dark-800 border border-indigo-100 rounded-2xl p-6 w-full max-w-sm shadow-2xl"
            >
              <div className="flex items-center gap-2 mb-4">
                <CheckCircle2 className="w-5 h-5 text-green-400" />
                <h3 className="text-base font-semibold text-slate-800">Çalışan Eklendi</h3>
              </div>
              <p className="text-sm text-slate-500 mb-4">
                Çalışana aşağıdaki bilgileri iletin. Giriş için bu bilgileri kullanacak.
              </p>
              <div className="bg-dark-700 border border-indigo-100 rounded-xl p-4 flex flex-col gap-2 font-mono text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-400">Ad Soyad:</span>
                  <span className="text-slate-800 font-semibold">{newEmpInfo.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Çalışan Kodu:</span>
                  <span className="text-yellow-400 font-bold text-base">{newEmpInfo.empCode}</span>
                </div>
              </div>
              <p className="text-xs text-slate-400 mt-3">
                Çalışan, sisteme giriş yaparken Ad Soyad + Çalışan Kodu kullanır.
              </p>
              <button
                onClick={() => setNewEmpInfo(null)}
                className="mt-4 w-full py-2 bg-safe-500 hover:bg-safe-600 text-slate-800 text-sm font-semibold rounded-xl transition"
              >
                Tamam
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="border-b border-indigo-100 bg-dark-800/60 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-safe-500 to-blue-600 flex items-center justify-center shadow-lg">
              <Users className="w-5 h-5 text-slate-500" />
            </div>
            <div>
              <h1 className="text-lg font-display font-bold text-slate-800 leading-none">Çalışan Takibi</h1>
              <p className="text-xs text-slate-400 mt-0.5">Uzun dönem stres & tükenmişlik izleme</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => { const n = loadMockData(); if (n > 0) refresh(); }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-purple-500/20 border border-purple-500/30 text-purple-300 hover:bg-purple-500/30 rounded-lg transition-colors">
              <Sparkles className="w-3.5 h-3.5" /> Demo Verisi
            </button>
            <button onClick={() => setShowSave(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-vox-500/20 border border-vox-500/30 text-vox-300 hover:bg-vox-500/30 rounded-lg transition-colors">
              <Upload className="w-3.5 h-3.5" /> Görüşme Ekle
            </button>
            <button onClick={() => setShowAdd((p) => !p)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-safe-500/20 border border-safe-500/30 text-safe-300 hover:bg-safe-500/30 rounded-lg transition-colors">
              <Plus className="w-3.5 h-3.5" /> Çalışan Ekle
            </button>
          </div>
        </div>
      </div>

      {/* Çalışan ekle formu */}
      <AnimatePresence>
        {showAdd && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden bg-dark-800/80 border-b border-indigo-100">
            <div className="max-w-6xl mx-auto px-4 py-4 flex gap-3 flex-wrap">
              <input value={newName} onChange={(e) => setNewName(e.target.value)}
                placeholder="Ad Soyad *" onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                className="flex-1 min-w-[180px] bg-dark-700 border border-indigo-100 rounded-lg px-3 py-2 text-sm text-slate-800 placeholder-gray-600 focus:outline-none focus:border-safe-500" />
              <select value={newDept} onChange={(e) => setNewDept(e.target.value)}
                className="flex-1 min-w-[150px] bg-dark-700 border border-indigo-100 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-safe-500">
                <option value="">Departman Seç</option>
                <option>Müşteri Hizmetleri</option>
                <option>Teknik Destek</option>
                <option>Satış</option>
                <option>Faturalandırma</option>
                <option>Şikayet Yönetimi</option>
                <option>Kurumsal Hizmetler</option>
              </select>
              <button onClick={handleAdd}
                className="px-4 py-2 text-sm font-medium bg-safe-500 hover:bg-safe-600 text-slate-800 rounded-lg transition-colors">
                Ekle
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-6xl mx-auto px-4 py-6 flex gap-6">

        {/* ── Çalışan listesi ── */}
        <div className="w-80 flex-shrink-0 space-y-2">
          {employees.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Henüz çalışan yok</p>
              <p className="text-xs mt-1">Yukarıdan ekleyin</p>
            </div>
          ) : (
            employees.map((emp) => (
              <motion.div key={emp.id} layout onClick={() => setSelected(emp)}
                className={`p-3 rounded-xl border cursor-pointer transition-all ${
                  selected?.id === emp.id
                    ? 'bg-dark-700 border-vox-500/40'
                    : 'bg-dark-800/60 border-indigo-100 hover:border-indigo-200'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-slate-800 truncate">{emp.name}</p>
                      {emp.empCode && (
                        <span className="text-[10px] font-mono text-slate-400 bg-dark-600 border border-indigo-100 px-1.5 py-0.5 rounded flex-shrink-0">
                          #{emp.empCode}
                        </span>
                      )}
                      {emp.trend.alertLevel !== 'none' && emp.trend.alertLevel !== 'nodata' && (
                        <AlertTriangle className={`w-3.5 h-3.5 flex-shrink-0 ${
                          emp.trend.alertLevel === 'critical' ? 'text-red-400' : 'text-orange-400'
                        }`} />
                      )}
                    </div>
                    {emp.department && (
                      <p className="text-xs text-slate-400 mt-0.5 truncate">{emp.department}</p>
                    )}
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); handleDeleteEmployee(emp.id); }}
                    className="text-slate-300 hover:text-red-400 transition-colors flex-shrink-0">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <RiskBadge level={emp.trend.alertLevel} />
                  <div className="flex items-center gap-1.5 text-xs text-slate-400">
                    <TrendIcon trend={emp.trend.trend} />
                    {emp.trend.alertLevel !== 'nodata'
                      ? <span>Stres: <span className="text-slate-800 font-mono">{emp.trend.latest}</span></span>
                      : <span className="text-slate-400">{emp.recordings.length} kayıt</span>
                    }
                  </div>
                </div>
                {emp.trend.alertMsg && (
                  <p className="text-xs text-orange-300/80 mt-1.5 leading-tight">{emp.trend.alertMsg}</p>
                )}
              </motion.div>
            ))
          )}
        </div>

        {/* ── Detay paneli ── */}
        <div className="flex-1 min-w-0">
          {!selectedFull ? (
            <div className="flex items-center justify-center h-64 text-slate-400">
              <div className="text-center">
                <Brain className="w-10 h-10 mx-auto mb-3 opacity-20" />
                <p className="text-sm">Detayları görmek için bir çalışan seç</p>
              </div>
            </div>
          ) : (
            <motion.div key={selectedFull.id} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }}
              className="space-y-4">

              {/* Çalışan başlığı */}
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-xl font-bold text-slate-800">{selectedFull.name}</h2>
                  <div className="flex items-center gap-2 mt-0.5">
                    {selectedFull.empCode && (
                      <span className="text-xs font-mono bg-yellow-500/15 border border-yellow-500/30 text-yellow-400 px-2 py-0.5 rounded-md">
                        Giriş Kodu: <strong>{selectedFull.empCode}</strong>
                      </span>
                    )}
                    {selectedFull.department && (
                      <p className="text-sm text-slate-400">{selectedFull.department}</p>
                    )}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <RiskBadge level={selectedFull.trend.alertLevel} />
                  <p className="text-xs text-slate-400">{selectedFull.recordings.length} görüşme kaydı</p>
                </div>
              </div>

              {/* Uyarı banner */}
              <AnimatePresence>
                {selectedFull.trend.alertMsg && (
                  <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${
                      selectedFull.trend.alertLevel === 'critical'
                        ? 'bg-red-500/15 border-red-500/40 text-red-300'
                        : 'bg-orange-500/15 border-orange-500/40 text-orange-300'
                    }`}>
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span className="text-sm font-medium">{selectedFull.trend.alertMsg}</span>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Özet metrikler */}
              {selectedFull.recordings.length > 0 && (
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: 'Ortalama Stres', value: selectedFull.trend.avg },
                    { label: 'Son Stres',      value: selectedFull.trend.latest },
                    {
                      label: 'Değişim',
                      value: (selectedFull.trend.change > 0 ? '+' : '') + selectedFull.trend.change,
                      color: selectedFull.trend.change > 0 ? 'text-red-400' : selectedFull.trend.change < 0 ? 'text-green-400' : 'text-slate-500',
                    },
                  ].map(({ label, value, color }) => (
                    <div key={label} className="bg-dark-800 border border-indigo-100 rounded-xl p-3 text-center">
                      <p className={`text-2xl font-bold font-mono ${color || 'text-slate-800'}`}>{value}</p>
                      <p className="text-xs text-slate-400 mt-1">{label}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Trend grafiği */}
              <div className="bg-dark-800 border border-indigo-100 rounded-xl p-4">
                <p className="text-xs text-slate-400 uppercase tracking-wider mb-3">Stres Trend Grafiği</p>
                <TrendChart recordings={selectedFull.recordings} />
              </div>

              {/* ── Öneriler & Aksiyonlar ── */}
              <RecommendationsPanel employee={selectedFull} />

              {/* Kayıt listesi */}
              <div className="bg-dark-800 border border-indigo-100 rounded-xl overflow-hidden">
                <div className="px-4 py-3 border-b border-indigo-100">
                  <p className="text-xs text-slate-400 uppercase tracking-wider">Görüşme Geçmişi</p>
                </div>
                {selectedFull.recordings.length === 0 ? (
                  <div className="text-center py-8 text-slate-400">
                    <FileAudio className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">Henüz görüşme kaydı yok</p>
                    <p className="text-xs mt-1">Yukarıdan "Görüşme Ekle" ile başla</p>
                  </div>
                ) : (
                  <div className="divide-y divide-white/5">
                    {[...selectedFull.recordings].reverse().map((rec) => {
                      const riskColors = {
                        düşük: 'text-green-400', orta: 'text-yellow-400',
                        yüksek: 'text-orange-400', kritik: 'text-red-400', bilinmiyor: 'text-slate-400',
                      };
                      return (
                        <div key={rec.id} className="px-4 py-3 flex items-center gap-4">
                          <Calendar className="w-4 h-4 text-slate-400 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-slate-800">{rec.date}</span>
                              <span className="text-xs text-slate-400 truncate">{rec.fileName}</span>
                            </div>
                            {rec.summary && (
                              <p className="text-xs text-slate-400 mt-0.5 truncate">{rec.summary}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-3 flex-shrink-0">
                            <div className="text-right">
                              <p className="text-sm font-mono font-bold text-slate-800">{rec.stress}</p>
                              <p className="text-xs text-slate-400">stres</p>
                            </div>
                            <div className="text-right">
                              <p className={`text-xs font-medium capitalize ${riskColors[rec.burnoutRisk]}`}>
                                {rec.burnoutRisk}
                              </p>
                              <p className="text-xs text-slate-400">risk</p>
                            </div>
                            <button onClick={() => handleDeleteRecording(rec.id)}
                              className="text-slate-300 hover:text-red-400 transition-colors">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {/* Modal */}
      <AnimatePresence>
        {showSave && (
          <SaveRecordingModal employees={employees} onSave={refresh} onClose={() => setShowSave(false)} />
        )}
      </AnimatePresence>
    </div>
  );
}
