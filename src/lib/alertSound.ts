// Plays a short alert beep using the Web Audio API so we don't need an mp3 asset.
export function playAlertSound() {
  try {
    const Ctx = (window.AudioContext || (window as any).webkitAudioContext) as typeof AudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const now = ctx.currentTime;

    // Two-tone chime: 880Hz then 660Hz
    const tones: Array<{ freq: number; start: number; dur: number }> = [
      { freq: 880, start: 0, dur: 0.18 },
      { freq: 660, start: 0.2, dur: 0.28 },
    ];

    for (const t of tones) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = t.freq;
      gain.gain.setValueAtTime(0.0001, now + t.start);
      gain.gain.exponentialRampToValueAtTime(0.25, now + t.start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + t.start + t.dur);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now + t.start);
      osc.stop(now + t.start + t.dur + 0.02);
    }

    // Auto-close to free resources
    setTimeout(() => ctx.close().catch(() => {}), 1200);
  } catch {
    // Silently ignore (e.g. autoplay policy). The visual alert still appears.
  }
}
