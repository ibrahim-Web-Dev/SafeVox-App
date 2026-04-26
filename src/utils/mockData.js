import { addEmployee, addRecording, getEmployees } from './employeeStore';

const MOCK_EMPLOYEES = [
  { name: 'Atilla Çetin',     department: 'Müşteri Hizmetleri' },
  { name: 'Ahmet Yılmaz',     department: 'Müşteri Hizmetleri' },
  { name: 'Elif Kaya',        department: 'Teknik Destek' },
  { name: 'Mehmet Demir',     department: 'Şikayet Yönetimi' },
  { name: 'Zeynep Çelik',     department: 'Satış' },
  { name: 'Can Arslan',       department: 'Müşteri Hizmetleri' },
  { name: 'Ayşe Şahin',      department: 'Faturalandırma' },
  { name: 'Burak Koç',        department: 'Teknik Destek' },
  { name: 'Selin Aydın',      department: 'Müşteri Hizmetleri' },
  { name: 'Furkan Doğan',    department: 'Kurumsal Hizmetler' },
  { name: 'Merve Yıldız',    department: 'Şikayet Yönetimi' },
  { name: 'Emre Öztürk',    department: 'Satış' },
  { name: 'Büşra Çetin',     department: 'Müşteri Hizmetleri' },
  { name: 'Oğuz Kılıç',      department: 'Teknik Destek' },
  { name: 'Neslihan Güneş',  department: 'Faturalandırma' },
  { name: 'Kadir Polat',      department: 'Müşteri Hizmetleri' },
  { name: 'Tuğba Erdoğan',  department: 'Kurumsal Hizmetler' },
  { name: 'Serkan Aktaş',    department: 'Şikayet Yönetimi' },
  { name: 'İrem Bozkurt',    department: 'Satış' },
  { name: 'Murat Çakır',     department: 'Teknik Destek' },
  { name: 'Gamze Özer',      department: 'Müşteri Hizmetleri' },
];

// Risk profilleri: [stres, yorgunluk, öfke, kaygı, sakinlik]
const PROFILES = [
  // kritik (3 çalışan)
  { stres: 91, yorgunluk: 85, öfke: 72, kaygı: 78, sakinlik: 12, risk: 'kritik', dominant: 'stres' },
  { stres: 88, yorgunluk: 76, öfke: 65, kaygı: 82, sakinlik: 15, risk: 'kritik', dominant: 'kaygı' },
  { stres: 84, yorgunluk: 90, öfke: 58, kaygı: 70, sakinlik: 18, risk: 'kritik', dominant: 'yorgunluk' },
  // uyarı (5 çalışan)
  { stres: 72, yorgunluk: 64, öfke: 45, kaygı: 60, sakinlik: 30, risk: 'yüksek', dominant: 'stres' },
  { stres: 68, yorgunluk: 70, öfke: 38, kaygı: 55, sakinlik: 32, risk: 'yüksek', dominant: 'yorgunluk' },
  { stres: 65, yorgunluk: 58, öfke: 52, kaygı: 48, sakinlik: 35, risk: 'orta',   dominant: 'öfke' },
  { stres: 60, yorgunluk: 62, öfke: 40, kaygı: 58, sakinlik: 38, risk: 'orta',   dominant: 'kaygı' },
  { stres: 58, yorgunluk: 55, öfke: 35, kaygı: 50, sakinlik: 42, risk: 'orta',   dominant: 'stres' },
  // takip (5 çalışan)
  { stres: 48, yorgunluk: 45, öfke: 28, kaygı: 40, sakinlik: 55, risk: 'orta',   dominant: 'stres' },
  { stres: 42, yorgunluk: 50, öfke: 22, kaygı: 38, sakinlik: 58, risk: 'düşük',  dominant: 'yorgunluk' },
  { stres: 38, yorgunluk: 42, öfke: 20, kaygı: 32, sakinlik: 62, risk: 'düşük',  dominant: 'stres' },
  { stres: 35, yorgunluk: 40, öfke: 18, kaygı: 30, sakinlik: 65, risk: 'düşük',  dominant: 'sakinlik' },
  { stres: 32, yorgunluk: 38, öfke: 15, kaygı: 28, sakinlik: 68, risk: 'düşük',  dominant: 'sakinlik' },
  // iyi (9 çalışan)
  { stres: 28, yorgunluk: 30, öfke: 12, kaygı: 22, sakinlik: 74, risk: 'düşük',  dominant: 'sakinlik' },
  { stres: 25, yorgunluk: 28, öfke: 10, kaygı: 20, sakinlik: 78, risk: 'düşük',  dominant: 'sakinlik' },
  { stres: 22, yorgunluk: 25, öfke: 8,  kaygı: 18, sakinlik: 82, risk: 'düşük',  dominant: 'sakinlik' },
  { stres: 20, yorgunluk: 22, öfke: 7,  kaygı: 15, sakinlik: 85, risk: 'düşük',  dominant: 'sakinlik' },
  { stres: 18, yorgunluk: 20, öfke: 6,  kaygı: 12, sakinlik: 88, risk: 'düşük',  dominant: 'sakinlik' },
  { stres: 15, yorgunluk: 18, öfke: 5,  kaygı: 10, sakinlik: 90, risk: 'düşük',  dominant: 'sakinlik' },
  { stres: 12, yorgunluk: 15, öfke: 4,  kaygı: 8,  sakinlik: 92, risk: 'düşük',  dominant: 'sakinlik' },
];

function randomVariation(base, range = 8) {
  return Math.min(100, Math.max(0, base + Math.round((Math.random() - 0.5) * range * 2)));
}

function datesBefore(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

export function loadMockData() {
  const existing = getEmployees();
  if (existing.length >= 10) return 0; // Zaten yeterli veri var

  let added = 0;
  MOCK_EMPLOYEES.forEach((empData, i) => {
    const emp = addEmployee({ name: empData.name, department: empData.department });
    const profile = PROFILES[i % PROFILES.length];

    // Her çalışana 4 kayıt ekle (son 2 haftaya yayılmış)
    [14, 10, 6, 2].forEach((daysAgo) => {
      addRecording(emp.id, {
        date: datesBefore(daysAgo),
        fileName: `kayit_${emp.name.split(' ')[0].toLowerCase()}_${daysAgo}g.webm`,
        analysisResult: {
          duygular: {
            stres:     randomVariation(profile.stres),
            yorgunluk: randomVariation(profile.yorgunluk),
            öfke:      randomVariation(profile.öfke),
            kaygı:     randomVariation(profile.kaygı),
            sakinlik:  randomVariation(profile.sakinlik),
          },
          baskın_duygu:     profile.dominant,
          tükenmişlik_riski: profile.risk,
          özet: `${empData.name} için ${daysAgo} gün önceki görüşme analizi. Baskın duygu: ${profile.dominant}.`,
        },
      });
    });
    added++;
  });

  return added;
}
