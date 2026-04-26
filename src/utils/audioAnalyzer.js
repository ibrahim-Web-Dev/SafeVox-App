/**
 * Web Audio API ile gerçek zamanlı ses analizi.
 * Pitch, enerji, stres skoru, bağırma tespiti.
 */

// Eşik değerleri
const THRESHOLDS = {
  SHOUT_ENERGY: 85,     // RMS bu seviyenin üstünde → bağırma uyarısı
  HIGH_STRESS: 70,      // Stres skoru → yüksek
  HIGH_PITCH: 300,      // Hz — genel konuşma için yüksek pitch
  SILENCE: 8,           // RMS bu seviyenin altı → sessizlik
};

export function createAudioAnalyzer(stream) {
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  const analyser = ctx.createAnalyser();
  analyser.fftSize = 2048;
  analyser.smoothingTimeConstant = 0.8;

  const source = ctx.createMediaStreamSource(stream);
  source.connect(analyser);

  const bufferLength = analyser.frequencyBinCount;
  const freqData = new Uint8Array(bufferLength);
  const timeData = new Float32Array(analyser.fftSize);

  // ── RMS Enerji (0-100) ────────────────────────────────────────────────────
  function getRMS() {
    analyser.getFloatTimeDomainData(timeData);
    let sum = 0;
    for (let i = 0; i < timeData.length; i++) sum += timeData[i] ** 2;
    const rms = Math.sqrt(sum / timeData.length);
    return Math.min(100, Math.round(rms * 300));
  }

  // ── Dominant Frekans / Pitch (Hz) ─────────────────────────────────────────
  function getDominantFrequency() {
    analyser.getByteFrequencyData(freqData);
    let maxVal = 0, maxIdx = 0;
    for (let i = 1; i < bufferLength; i++) {
      if (freqData[i] > maxVal) { maxVal = freqData[i]; maxIdx = i; }
    }
    if (maxVal < 10) return 0;
    return Math.round((maxIdx * ctx.sampleRate) / analyser.fftSize);
  }

  // ── Frekans Bandı Enerjileri ──────────────────────────────────────────────
  function getBandEnergies() {
    analyser.getByteFrequencyData(freqData);
    const binHz = ctx.sampleRate / analyser.fftSize;
    let low = 0, mid = 0, high = 0, count = { low: 0, mid: 0, high: 0 };

    for (let i = 0; i < bufferLength; i++) {
      const hz = i * binHz;
      if (hz < 300)       { low  += freqData[i]; count.low++; }
      else if (hz < 3000) { mid  += freqData[i]; count.mid++; }
      else if (hz < 8000) { high += freqData[i]; count.high++; }
    }
    return {
      low:  count.low  ? Math.round(low  / count.low)  : 0,
      mid:  count.mid  ? Math.round(mid  / count.mid)  : 0,
      high: count.high ? Math.round(high / count.high) : 0,
    };
  }

  // ── Stres Skoru (0-100) ───────────────────────────────────────────────────
  // Yüksek pitch + yüksek enerji + yüksek frekans bileşeni = stres
  function getStressScore(rms, pitch, bands) {
    const energyScore  = Math.min(100, rms * 1.2);
    const pitchScore   = pitch > 0 ? Math.min(100, (pitch / 600) * 100) : 0;
    const highBandScore = Math.min(100, (bands.high / 128) * 100);
    return Math.round(energyScore * 0.4 + pitchScore * 0.35 + highBandScore * 0.25);
  }

  // ── Yorgunluk Skoru (0-100) ───────────────────────────────────────────────
  // Düşük enerji + düşük pitch varyasyonu + monoton konuşma = yorgunluk
  function getFatigueScore(rms, pitch, bands) {
    const lowEnergyScore = Math.max(0, 100 - rms * 1.5);
    const lowPitchScore  = pitch > 0 ? Math.max(0, 100 - (pitch / 250) * 100) : 50;
    const monotonicScore = Math.min(100, (bands.low / 128) * 100);
    return Math.round(lowEnergyScore * 0.5 + lowPitchScore * 0.3 + monotonicScore * 0.2);
  }

  // ── Ana analiz döngüsü ────────────────────────────────────────────────────
  function analyze() {
    const rms   = getRMS();
    const pitch = getDominantFrequency();
    const bands = getBandEnergies();
    const stress  = getStressScore(rms, pitch, bands);
    const fatigue = getFatigueScore(rms, pitch, bands);

    const isSilence = rms < THRESHOLDS.SILENCE;
    const isShouting = rms >= THRESHOLDS.SHOUT_ENERGY;
    const isHighStress = stress >= THRESHOLDS.HIGH_STRESS;

    return {
      rms,
      pitch,
      bands,
      stress,
      fatigue,
      isSilence,
      isShouting,
      isHighStress,
      // Uyarı seviyeleri
      alerts: [
        isShouting  && { type: 'SHOUT',  level: 'danger',  msg: 'Yüksek ses / Bağırma tespit edildi' },
        isHighStress && !isShouting && { type: 'STRESS', level: 'warning', msg: 'Yüksek stres sinyali' },
      ].filter(Boolean),
    };
  }

  function destroy() {
    source.disconnect();
    ctx.close();
  }

  return { analyze, destroy, THRESHOLDS };
}
