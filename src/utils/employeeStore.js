/**
 * Çalışan ve görüşme kayıtlarını localStorage'da saklar.
 */

const KEYS = {
  EMPLOYEES:  'sv_employees',
  RECORDINGS: 'sv_recordings',
  BREAKS:     'sv_breaks',
  COURSES:    'sv_courses',
  SCHEDULE:   'sv_schedule',
};

// ── Şirket Yoğunluk Takvimi ───────────────────────────────────────────────────
// Tipik çağrı merkezi yük profili (% doluluk)
const DEFAULT_SCHEDULE = {
  '08:00': 32, '08:30': 48,
  '09:00': 78, '09:30': 88, '10:00': 92, '10:30': 86,
  '11:00': 76, '11:30': 65,
  '12:00': 40, '12:30': 26,
  '13:00': 20, '13:30': 38,
  '14:00': 62, '14:30': 74, '15:00': 84, '15:30': 76,
  '16:00': 64, '16:30': 50,
  '17:00': 36, '17:30': 24,
  '18:00': 15,
};

export function getSchedule() {
  try {
    const stored = localStorage.getItem(KEYS.SCHEDULE);
    return stored ? JSON.parse(stored) : { ...DEFAULT_SCHEDULE };
  } catch { return { ...DEFAULT_SCHEDULE }; }
}

export function setSlotLoad(time, load) {
  const s = getSchedule();
  s[time] = Math.max(0, Math.min(100, load));
  localStorage.setItem(KEYS.SCHEDULE, JSON.stringify(s));
}

// ── Yardımcılar ───────────────────────────────────────────────────────────────
function load(key) {
  try { return JSON.parse(localStorage.getItem(key) || '[]'); }
  catch { return []; }
}
function save(key, data) {
  localStorage.setItem(key, JSON.stringify(data));
}
function uuid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

// ── Çalışanlar ────────────────────────────────────────────────────────────────
export function getEmployees() {
  const employees = load(KEYS.EMPLOYEES);
  // Eski kayıtlarda empCode yoksa geriye dönük ata ve kaydet
  let dirty = false;
  let counter = 1000;
  employees.forEach((e) => {
    if (!e.empCode) {
      counter++;
      e.empCode = String(counter);
      dirty = true;
    } else {
      const n = parseInt(e.empCode, 10);
      if (!isNaN(n) && n > counter) counter = n;
    }
  });
  if (dirty) save(KEYS.EMPLOYEES, employees);
  return employees;
}

function generateEmpCode(employees) {
  const max = employees.reduce((m, e) => {
    const n = parseInt(e.empCode, 10);
    return !isNaN(n) && n > m ? n : m;
  }, 1000);
  return String(max + 1);
}

export function addEmployee({ name, department = '', note = '' }) {
  const employees = load(KEYS.EMPLOYEES);
  const empCode   = generateEmpCode(employees);
  const emp = { id: uuid(), empCode, name, department, note, createdAt: Date.now() };
  employees.push(emp);
  save(KEYS.EMPLOYEES, employees);
  return emp;
}

/** Giriş doğrulama: isim (büyük/küçük harf yok sayılır) + çalışan kodu */
export function findEmployeeByLogin(name, empCode) {
  return load(KEYS.EMPLOYEES).find(
    (e) =>
      e.name.toLowerCase().trim() === name.toLowerCase().trim() &&
      e.empCode === empCode.trim()
  ) || null;
}

export function deleteEmployee(id) {
  save(KEYS.EMPLOYEES, load(KEYS.EMPLOYEES).filter((e) => e.id !== id));
  save(KEYS.RECORDINGS, load(KEYS.RECORDINGS).filter((r) => r.employeeId !== id));
  save(KEYS.BREAKS,     load(KEYS.BREAKS).filter((b) => b.employeeId !== id));
  save(KEYS.COURSES,    load(KEYS.COURSES).filter((c) => c.employeeId !== id));
}

// ── Görüşme Kayıtları ─────────────────────────────────────────────────────────
export function getRecordings(employeeId) {
  return load(KEYS.RECORDINGS)
    .filter((r) => r.employeeId === employeeId)
    .sort((a, b) => a.date.localeCompare(b.date));
}

export function addRecording(employeeId, { date, fileName, analysisResult }) {
  const recordings = load(KEYS.RECORDINGS);
  const rec = {
    id: uuid(),
    employeeId,
    date: date || new Date().toISOString().slice(0, 10),
    fileName: fileName || 'bilinmiyor',
    stress:   analysisResult.duygular?.stres     ?? 0,
    fatigue:  analysisResult.duygular?.yorgunluk ?? 0,
    anger:    analysisResult.duygular?.öfke      ?? 0,
    anxiety:  analysisResult.duygular?.kaygı     ?? 0,
    calmness: analysisResult.duygular?.sakinlik  ?? 0,
    dominantEmotion: analysisResult.baskın_duygu  || '—',
    burnoutRisk:     analysisResult.tükenmişlik_riski || 'bilinmiyor',
    summary:         analysisResult.özet          || '',
    createdAt: Date.now(),
  };
  recordings.push(rec);
  save(KEYS.RECORDINGS, recordings);
  return rec;
}

export function deleteRecording(id) {
  save(KEYS.RECORDINGS, load(KEYS.RECORDINGS).filter((r) => r.id !== id));
}

// ── Mola Kayıtları ────────────────────────────────────────────────────────────
export function getBreaks(employeeId) {
  return load(KEYS.BREAKS)
    .filter((b) => b.employeeId === employeeId)
    .sort((a, b) => b.createdAt - a.createdAt);
}

export function addBreak(employeeId, { type, label, duration }) {
  const breaks = load(KEYS.BREAKS);
  const rec = {
    id: uuid(), employeeId, type, label, duration,
    date: new Date().toISOString().slice(0, 10),
    time: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
    createdAt: Date.now(),
  };
  breaks.push(rec);
  save(KEYS.BREAKS, breaks);
  return rec;
}

export function deleteBreak(id) {
  save(KEYS.BREAKS, load(KEYS.BREAKS).filter((b) => b.id !== id));
}

// ── Kurs Atamaları ────────────────────────────────────────────────────────────
export function getCourses(employeeId) {
  return load(KEYS.COURSES)
    .filter((c) => c.employeeId === employeeId)
    .sort((a, b) => b.createdAt - a.createdAt);
}

export function assignCourse(employeeId, { courseId, label, icon, duration }) {
  const courses = load(KEYS.COURSES);
  // Aynı kurs zaten atanmış ve tamamlanmamışsa tekrar ekleme
  const already = courses.find(
    (c) => c.employeeId === employeeId && c.courseId === courseId && c.status !== 'completed'
  );
  if (already) return already;
  const rec = {
    id: uuid(), employeeId, courseId, label, icon, duration,
    status: 'assigned',  // assigned | in-progress | completed
    assignedDate: new Date().toISOString().slice(0, 10),
    createdAt: Date.now(),
  };
  courses.push(rec);
  save(KEYS.COURSES, courses);
  return rec;
}

export function updateCourseStatus(id, status) {
  const courses = load(KEYS.COURSES).map((c) =>
    c.id === id ? { ...c, status, completedDate: status === 'completed' ? new Date().toISOString().slice(0, 10) : undefined } : c
  );
  save(KEYS.COURSES, courses);
}

export function deleteCourse(id) {
  save(KEYS.COURSES, load(KEYS.COURSES).filter((c) => c.id !== id));
}

// ── Trend & Uyarı Analizi ─────────────────────────────────────────────────────
/**
 * Bir çalışanın trend durumunu hesaplar.
 * @returns {{ trend, alertLevel, alertMsg, avg, latest, change }}
 */
export function calcTrend(recordings) {
  if (!recordings.length) return { trend: 'nodata', alertLevel: 'none', avg: 0, latest: 0, change: 0 };

  const stressValues = recordings.map((r) => r.stress);
  const avg    = Math.round(stressValues.reduce((a, b) => a + b, 0) / stressValues.length);
  const latest = stressValues[stressValues.length - 1];
  const change = stressValues.length > 1
    ? latest - stressValues[stressValues.length - 2]
    : 0;

  // Son 3 kayıtta ardışık artış var mı?
  let consecutiveIncrease = 0;
  for (let i = stressValues.length - 1; i > 0; i--) {
    if (stressValues[i] > stressValues[i - 1]) consecutiveIncrease++;
    else break;
  }

  // Trend yönü
  const trend = change > 5 ? 'up' : change < -5 ? 'down' : 'stable';

  // Uyarı seviyesi
  let alertLevel = 'none';
  let alertMsg = '';

  if (latest >= 80 || recordings[recordings.length - 1]?.burnoutRisk === 'kritik') {
    alertLevel = 'critical';
    alertMsg = 'Kritik stres seviyesi — acil müdahale gerekebilir';
  } else if (consecutiveIncrease >= 3) {
    alertLevel = 'warning';
    alertMsg = `Son ${consecutiveIncrease} görüşmede stres sürekli artıyor`;
  } else if (latest >= 65) {
    alertLevel = 'watch';
    alertMsg = 'Stres seviyesi yüksek — takip önerilir';
  }

  return { trend, alertLevel, alertMsg, avg, latest, change, consecutiveIncrease };
}

/**
 * Tüm çalışanları risk sırasına göre sıralar.
 */
export function getEmployeesWithRisk() {
  const employees = getEmployees();
  const allRecordings = load(KEYS.RECORDINGS);

  return employees
    .map((emp) => {
      const recs = allRecordings
        .filter((r) => r.employeeId === emp.id)
        .sort((a, b) => a.date.localeCompare(b.date));
      const trend = calcTrend(recs);
      return { ...emp, recordings: recs, trend };
    })
    .sort(() => Math.random() - 0.5);
}
