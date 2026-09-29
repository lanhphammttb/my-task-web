import confetti from 'canvas-confetti';

/**
 * Lớp phản hồi cảm xúc: confetti + âm thanh ngắn khi người dùng hoàn thành việc.
 * Mục tiêu là tạo một khoảnh khắc thưởng nhỏ nhưng rõ ràng, đủ để hình thành
 * thói quen quay lại và tích tiếp chuỗi ngày.
 */

let soundOn = true;

export function setSoundEnabled(value: boolean) {
  soundOn = value;
}

let audio: AudioContext | null = null;

function ctx(requireSfx = true): AudioContext | null {
  if (requireSfx && !soundOn) return null;
  try {
    const Ctor =
      window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    audio ??= new Ctor();
    if (audio.state === 'suspended') void audio.resume();
    return audio;
  } catch {
    return null;
  }
}

/** Một tiếng khánh nhỏ có các bội âm kim loại nhẹ, thay cho tiếng bíp thuần. */
function tone(freq: number, startAfter: number, duration: number, peak = 0.16) {
  const c = ctx();
  if (!c) return;
  const t0 = c.currentTime + startAfter;
  const gain = c.createGain();
  const body = c.createOscillator();
  const overtone = c.createOscillator();
  const shimmer = c.createOscillator();
  body.type = overtone.type = shimmer.type = 'sine';
  body.frequency.setValueAtTime(freq, t0);
  overtone.frequency.setValueAtTime(freq * 2.71, t0);
  shimmer.frequency.setValueAtTime(freq * 5.04, t0);
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(peak, t0 + 0.009);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
  const mix = c.createGain();
  const bodyGain = c.createGain();
  const overtoneGain = c.createGain();
  const shimmerGain = c.createGain();
  bodyGain.gain.value = 0.74;
  overtoneGain.gain.value = 0.2;
  shimmerGain.gain.value = 0.06;
  body.connect(bodyGain).connect(mix);
  overtone.connect(overtoneGain).connect(mix);
  shimmer.connect(shimmerGain).connect(mix);
  mix.connect(gain).connect(c.destination);
  for (const osc of [body, overtone, shimmer]) {
    osc.start(t0);
    osc.stop(t0 + duration + 0.02);
  }
}

/** Tạo gió núi/tiếng hang bằng WebAudio, không tải nhạc ngoài hoặc bật trước thao tác. */
export function startAmbient(kind: 'mountain' | 'cave' = 'cave') {
  const c = ctx(false);
  if (!c) return () => {};
  const bus = c.createGain();
  const tint = c.createBiquadFilter();
  const level = kind === 'cave' ? 0.026 : 0.018;
  tint.type = 'lowpass';
  tint.frequency.value = kind === 'cave' ? 420 : 780;
  tint.Q.value = 0.35;
  bus.gain.setValueAtTime(0.0001, c.currentTime);
  bus.gain.exponentialRampToValueAtTime(level, c.currentTime + 1.5);
  tint.connect(bus).connect(c.destination);

  const length = Math.max(1, Math.floor(c.sampleRate * 2));
  const noiseBuffer = c.createBuffer(1, length, c.sampleRate);
  const channel = noiseBuffer.getChannelData(0);
  for (let i = 0; i < length; i++) channel[i] = (Math.random() * 2 - 1) * 0.18;
  const noise = c.createBufferSource();
  const noiseGain = c.createGain();
  noise.buffer = noiseBuffer;
  noise.loop = true;
  noiseGain.gain.value = kind === 'cave' ? 0.35 : 0.22;
  noise.connect(noiseGain).connect(tint);
  noise.start();

  const drone = c.createOscillator();
  const droneGain = c.createGain();
  drone.type = 'sine';
  drone.frequency.value = kind === 'cave' ? 110 : 146.83;
  droneGain.gain.value = 0.24;
  drone.connect(droneGain).connect(tint);
  drone.start();

  const lfo = c.createOscillator();
  const lfoDepth = c.createGain();
  lfo.frequency.value = kind === 'cave' ? 0.07 : 0.11;
  lfoDepth.gain.value = level * 0.42;
  lfo.connect(lfoDepth).connect(bus.gain);
  lfo.start();

  let stopped = false;
  return () => {
    if (stopped) return;
    stopped = true;
    const stopAt = c.currentTime + 0.45;
    bus.gain.cancelScheduledValues(c.currentTime);
    bus.gain.setValueAtTime(Math.max(bus.gain.value, 0.0001), c.currentTime);
    bus.gain.exponentialRampToValueAtTime(0.0001, stopAt);
    for (const source of [noise, drone, lfo]) {
      try { source.stop(stopAt + 0.03); } catch { /* already stopped */ }
    }
    window.setTimeout(() => { tint.disconnect(); bus.disconnect(); }, 550);
  };
}

// Giấy vàng, kim quang, ngọc bích, chu sa - đúng tông tu tiên, không phải màu tiệc sinh nhật.
const BRAND_COLORS = ['#f4d03f', '#c4a661', '#e0a83c', '#ece2cd', '#3fa796', '#a8321f'];

/**
 * Rung máy. Chỉ điện thoại có, và trình duyệt chỉ cho rung sau khi người dùng
 * đã chạm vào trang - nên gọi thừa cũng không sao, chỉ im lặng bỏ qua.
 */
export function haptic(pattern: number | number[]) {
  if (!soundOn) return;
  try {
    navigator.vibrate?.(pattern);
  } catch {
    /* trình duyệt không hỗ trợ - bỏ qua */
  }
}

/** Bắn confetti an toàn - bỏ qua nếu môi trường không vẽ được canvas. */
function fire(options: confetti.Options) {
  try {
    void confetti(options);
  } catch {
    /* không có canvas 2d - hiệu ứng chỉ là phần trang trí nên bỏ qua */
  }
}

/** Tiếng "ting" gọn khi tick xong một nhiệm vụ. */
export function soundComplete() {
  tone(880, 0, 0.18);
  tone(1320, 0.055, 0.22, 0.1);
}

/** Khánh ngắn mở phiên nhập định, đủ nhận biết nhưng không át nhạc nền. */
export function soundFocusStart() {
  tone(659.25, 0, 0.32, 0.075);
  tone(987.77, 0.085, 0.48, 0.055);
}

/** Chuỗi nốt đi lên khi đột phá. */
export function soundLevelUp() {
  [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(f, i * 0.09, 0.42, 0.15));
}

/** Hợp âm ấm khi dọn sạch danh sách trong ngày. */
export function soundPerfectDay() {
  [523.25, 659.25, 783.99].forEach((f) => tone(f, 0, 0.7, 0.11));
  tone(1046.5, 0.18, 0.6, 0.09);
}

export function soundAchievement() {
  [659.25, 987.77].forEach((f, i) => tone(f, i * 0.11, 0.5, 0.14));
}

/** Chấm màu bung ra ngay tại vị trí ô tick - phản hồi gắn với hành động. */
export function burstAt(el: HTMLElement | null) {
  if (!el) return;
  const rect = el.getBoundingClientRect();
  fire({
    particleCount: 34,
    spread: 62,
    startVelocity: 26,
    gravity: 0.9,
    scalar: 0.75,
    ticks: 130,
    disableForReducedMotion: true,
    colors: BRAND_COLORS,
    origin: {
      x: (rect.left + rect.width / 2) / window.innerWidth,
      y: (rect.top + rect.height / 2) / window.innerHeight,
    },
  });
}

/** Bung vừa phải - dùng cho đột phá lên một tầng mới. */
export function burstTier() {
  fire({
    particleCount: 45,
    spread: 72,
    startVelocity: 30,
    scalar: 0.85,
    ticks: 160,
    disableForReducedMotion: true,
    colors: BRAND_COLORS,
    origin: { x: 0.5, y: 0.55 },
  });
}

/** Bung lớn giữa màn hình - dùng cho mốc lớn như đột phá cảnh giới. */
export function burstBig() {
  const common = { disableForReducedMotion: true, colors: BRAND_COLORS, ticks: 220 };
  fire({ ...common, particleCount: 90, spread: 90, startVelocity: 42, origin: { x: 0.5, y: 0.62 } });
  window.setTimeout(() => {
    fire({ ...common, particleCount: 60, angle: 60, spread: 70, origin: { x: 0.08, y: 0.75 } });
    fire({ ...common, particleCount: 60, angle: 120, spread: 70, origin: { x: 0.92, y: 0.75 } });
  }, 180);
}

/** Mưa confetti kéo dài cho "ngày trọn vẹn". */
export function burstRain(durationMs = 1600) {
  const end = Date.now() + durationMs;
  const tick = () => {
    if (Date.now() > end) return;
    fire({
      particleCount: 5,
      spread: 70,
      startVelocity: 18,
      gravity: 0.7,
      scalar: 0.85,
      ticks: 200,
      disableForReducedMotion: true,
      colors: BRAND_COLORS,
      origin: { x: Math.random(), y: -0.1 },
    });
    requestAnimationFrame(tick);
  };
  tick();
}

/** Nốt ngân dài, dùng cho khoảnh khắc phi thăng. */
export function soundAscend() {
  [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((f, i) => tone(f, i * 0.12, 0.9, 0.13));
}
