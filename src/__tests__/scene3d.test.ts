import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { islandGeometry, pagodaGeometry, qiField, ridgeGeometry, rng } from '../components/scene3d/build';

/** Toàn bộ toạ độ của một khối, đọc ra thành mảng phẳng. */
function positions(geo: THREE.BufferGeometry): Float32Array {
  return geo.attributes.position.array as Float32Array;
}

/** Số điểm khác nhau thật sự - dùng để bắt lỗi mặt bị xé rời. */
function distinctPoints(geo: THREE.BufferGeometry): number {
  const p = positions(geo);
  const seen = new Set<string>();
  for (let i = 0; i < p.length; i += 3) {
    seen.add(`${p[i].toFixed(5)},${p[i + 1].toFixed(5)},${p[i + 2].toFixed(5)}`);
  }
  return seen.size;
}

describe('rng', () => {
  it('cùng hạt giống thì ra cùng dãy số', () => {
    const a = rng(42);
    const b = rng(42);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });

  it('khác hạt giống thì ra dãy khác', () => {
    expect(rng(1)()).not.toBe(rng(2)());
  });

  it('luôn nằm trong khoảng [0, 1)', () => {
    const r = rng(7);
    for (let i = 0; i < 500; i++) {
      const v = r();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});

describe('ridgeGeometry', () => {
  const peaks = [0.1, 0.62, 0.3, 0.86, 0.28];
  const geo = ridgeGeometry(peaks, 100, 12);

  it('không sinh toạ độ hỏng', () => {
    expect(positions(geo).length).toBeGreaterThan(0);
    expect(positions(geo).every(Number.isFinite)).toBe(true);
  });

  it('có pháp tuyến để nhận sáng - núi phẳng lì thì đèn không ăn vào đâu', () => {
    expect(geo.attributes.normal).toBeDefined();
    expect(geo.attributes.normal.count).toBe(geo.attributes.position.count);
  });

  it('đỉnh cao nhất bám theo `peaks`, không vượt quá chiều cao đặt ra', () => {
    geo.computeBoundingBox();
    const box = geo.boundingBox!;
    // Đỉnh cao nhất là 0.86 của 12; vát cạnh cộng thêm một chút nên nới biên.
    expect(box.max.y).toBeGreaterThan(0.86 * 12 * 0.9);
    expect(box.max.y).toBeLessThan(12);
    // Khối phải dày theo trục z, nếu không thì lại thành tấm phẳng như bản cũ.
    expect(box.max.z - box.min.z).toBeGreaterThan(0);
  });
});

describe('islandGeometry', () => {
  it('không sinh toạ độ hỏng', () => {
    expect(positions(islandGeometry(3)).every(Number.isFinite)).toBe(true);
  });

  it('cùng seed thì dựng ra y hệt nhau', () => {
    expect(Array.from(positions(islandGeometry(5)))).toEqual(Array.from(positions(islandGeometry(5))));
  });

  it('khác seed thì ra dáng đảo khác', () => {
    expect(Array.from(positions(islandGeometry(1)))).not.toEqual(Array.from(positions(islandGeometry(2))));
  });

  it('mặt đảo còn liền, không bị xé thành mảnh vụn', () => {
    // Khối hai mươi mặt không dùng chỉ mục nên mỗi góc lặp lại nhiều lần trong
    // mảng. Nhiễu tính theo toạ độ thì các bản lặp ấy dịch đi giống hệt nhau và
    // số điểm khác nhau vẫn giữ nguyên; nhiễu bốc ngẫu nhiên theo từng đỉnh là
    // mỗi bản lặp văng một nơi, số điểm khác nhau vọt lên bằng số đỉnh.
    const geo = islandGeometry(4);
    expect(geo.attributes.position.count).toBe(540);
    expect(distinctPoints(geo)).toBe(92);
  });

  it('trên phẳng dưới nhọn - đúng dáng đảo bị bứng khỏi mặt đất', () => {
    const geo = islandGeometry(6);
    geo.computeBoundingBox();
    const box = geo.boundingBox!;
    expect(Math.abs(box.min.y)).toBeGreaterThan(box.max.y * 2);
  });
});

describe('pagodaGeometry', () => {
  it('gộp được thành một khối liền, toạ độ sạch', () => {
    const geo = pagodaGeometry(3);
    expect(geo.attributes.position).toBeDefined();
    expect(positions(geo).length).toBeGreaterThan(0);
    expect(positions(geo).every(Number.isFinite)).toBe(true);
  });

  it('càng nhiều tầng thì tháp càng cao', () => {
    const low = pagodaGeometry(2);
    const high = pagodaGeometry(5);
    low.computeBoundingBox();
    high.computeBoundingBox();
    expect(high.boundingBox!.max.y).toBeGreaterThan(low.boundingBox!.max.y);
  });

  it('mái loe rộng hơn thân - chỗ hất ra ấy mới đọc ra là tháp', () => {
    // Bám theo `pagodaGeometry`: bán kính gốc 0.62, thân 0.86 lần, mái 1.75 lần.
    const BASE = 0.62;
    const body = BASE * 0.86;
    const geo = pagodaGeometry(1);
    geo.computeBoundingBox();
    // Chỗ rộng nhất là vành mái, và phải rộng hơn thân một khoảng thấy rõ.
    expect(geo.boundingBox!.max.x).toBeGreaterThan(body * 1.5);
  });

  it('không mọc thành cây ăng-ten - thân phải đủ mập so với chiều cao', () => {
    // Lỗi đã gặp: thân trụ quá mảnh và chóp quá dài, cả toà tháp đọc ra thành
    // cột ăng-ten cắm mấy cái đĩa. Bề ngang không được lép hơn chiều cao quá.
    const geo = pagodaGeometry(3);
    geo.computeBoundingBox();
    const box = geo.boundingBox!;
    expect((box.max.x - box.min.x) / (box.max.y - box.min.y)).toBeGreaterThan(0.8);
  });
});

describe('qiField', () => {
  const field = qiField(50, 40, 20, 10);

  it('mỗi hạt có đủ hạt giống và cỡ riêng', () => {
    expect(field.points.geometry.attributes.position.count).toBe(50);
    expect(field.points.geometry.attributes.aSeed.count).toBe(50);
    expect(field.points.geometry.attributes.aSize.count).toBe(50);
  });

  it('toạ độ khởi tạo nằm gọn trong vùng đã đặt', () => {
    const p = positions(field.points.geometry);
    for (let i = 0; i < p.length; i += 3) {
      expect(Math.abs(p[i])).toBeLessThanOrEqual(20);
      expect(Math.abs(p[i + 1])).toBeLessThanOrEqual(10);
      expect(p[i + 2]).toBeLessThanOrEqual(-5);
      expect(p[i + 2]).toBeGreaterThanOrEqual(-15);
    }
  });

  it('mở sẵn các nút chỉnh mà vòng lặp cần vặn mỗi khung hình', () => {
    for (const key of ['uTime', 'uColor', 'uOpacity', 'uScale', 'uSpanY']) {
      expect(field.material.uniforms[key]).toBeDefined();
    }
    expect(field.material.uniforms.uSpanY.value).toBe(20);
  });
});
