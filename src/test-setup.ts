/**
 * Node 25 tự gắn một `localStorage` thử nghiệm rỗng vào global, đè lên bản của
 * jsdom nên mọi lời gọi getItem/setItem đều hỏng. Ta cấp một Storage trong bộ
 * nhớ để test chạy đúng và độc lập giữa các lần chạy.
 */
class MemoryStorage implements Storage {
  private store = new Map<string, string>();

  get length() {
    return this.store.size;
  }

  clear() {
    this.store.clear();
  }

  getItem(key: string) {
    return this.store.get(key) ?? null;
  }

  key(index: number) {
    return [...this.store.keys()][index] ?? null;
  }

  removeItem(key: string) {
    this.store.delete(key);
  }

  setItem(key: string, value: string) {
    this.store.set(key, String(value));
  }
}

const storage = new MemoryStorage();
const descriptor: PropertyDescriptor = { value: storage, configurable: true, writable: true };

Object.defineProperty(globalThis, 'localStorage', descriptor);
Object.defineProperty(globalThis, 'sessionStorage', { ...descriptor, value: new MemoryStorage() });
if (typeof window !== 'undefined') Object.defineProperty(window, 'localStorage', descriptor);

/**
 * Các API trình duyệt mà jsdom chưa hiện thực nhưng Radix UI và biểu đồ cần tới.
 * Không có chúng thì component mở ra sẽ ném lỗi giữa lúc test.
 */
if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
}

if (typeof window !== 'undefined') {
  window.matchMedia ??= ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;

  Element.prototype.scrollIntoView ??= function scrollIntoView() {};
  HTMLElement.prototype.hasPointerCapture ??= function hasPointerCapture() {
    return false;
  };
  HTMLElement.prototype.releasePointerCapture ??= function releasePointerCapture() {};
}

/**
 * jsdom không có canvas 2d, mà canvas-confetti lại vẽ trong requestAnimationFrame
 * nên lỗi không thể bắt bằng try/catch. Cấp một context rỗng để hiệu ứng chạy
 * im lặng trong test.
 */
if (typeof HTMLCanvasElement !== 'undefined') {
  const noop = () => {};
  const stub2d = () =>
    ({
      canvas: null,
      clearRect: noop,
      fillRect: noop,
      beginPath: noop,
      closePath: noop,
      moveTo: noop,
      lineTo: noop,
      arc: noop,
      ellipse: noop,
      rect: noop,
      fill: noop,
      stroke: noop,
      save: noop,
      restore: noop,
      translate: noop,
      rotate: noop,
      scale: noop,
      setTransform: noop,
      globalAlpha: 1,
      fillStyle: '',
      strokeStyle: '',
    }) as unknown as CanvasRenderingContext2D;

  HTMLCanvasElement.prototype.getContext = function getContext(kind: string) {
    return kind === '2d' ? stub2d() : null;
  } as HTMLCanvasElement['getContext'];
}
