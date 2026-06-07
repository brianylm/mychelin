let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextCtor) return null;
  if (!audioContext) audioContext = new AudioContextCtor();
  return audioContext;
}

export function primeTimerAlarm(): void {
  const ctx = getAudioContext();
  if (!ctx) return;
  if (ctx.state === "suspended") void ctx.resume();
}

export function playTimerAlarm(): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  const start = ctx.currentTime + 0.02;
  if (ctx.state === "suspended") void ctx.resume();

  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    navigator.vibrate?.([220, 90, 220, 90, 320]);
  }

  for (let i = 0; i < 5; i += 1) {
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    const beepStart = start + i * 0.32;
    const beepEnd = beepStart + 0.22;

    oscillator.type = "square";
    oscillator.frequency.setValueAtTime(i % 2 === 0 ? 1046 : 784, beepStart);
    gain.gain.setValueAtTime(0.0001, beepStart);
    gain.gain.exponentialRampToValueAtTime(0.45, beepStart + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, beepEnd);

    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.start(beepStart);
    oscillator.stop(beepEnd + 0.03);
  }
}

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}
