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

function ctx(): AudioContext | null {
  if (!soundOn) return null;
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

/** Một nốt đơn dạng hình sin, tắt dần để nghe mềm chứ không "bíp" gắt. */
function tone(freq: number, startAfter: number, duration: number, peak = 0.16) {
  const c = ctx();
  if (!c) return;
  const t0 = c.currentTime + startAfter;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(freq, t0);
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(peak, t0 + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
  osc.connect(gain).connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + duration + 0.02);
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
