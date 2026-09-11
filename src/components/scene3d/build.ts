import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

/**
 * Bộ dựng hình cho lớp nền 3D. Tách khỏi component để phần React chỉ còn lo
 * vòng lặp vẽ và dọn dẹp, còn ở đây thuần tuý là sinh hình - không đụng DOM,
 * không giữ trạng thái.
 *
 * Mọi thứ đều sinh bằng thuật toán chứ không nạp model: nền chạy được trên mọi
 * máy, không tốn thêm một byte tải về, và muốn đổi dáng núi hay số tầng tháp
 * thì chỉ là sửa vài con số ở đây.
 */

/** Sinh số ngẫu nhiên có hạt giống - cùng seed thì cảnh dựng ra y hệt nhau. */
export function rng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Chấm sáng mềm, dùng cho quầng linh khí và hào quang quanh đảo. */
export function glowTexture(): THREE.CanvasTexture {
  const size = 128;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  if (ctx) {
    const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.22, 'rgba(255,255,255,0.32)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** Vệt sương/mây. */
export function mistTexture(seed = 11): THREE.CanvasTexture {
  const size = 256;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  if (ctx) {
    const r = rng(seed);
    // Chồng nhiều đốm mờ lệch kích thước lên nhau nên mép sương rách tự nhiên,
    // khác hẳn một vòng gradient tròn trịa nhìn phát là biết đồ hoạ máy.
    // Giữ tâm đốm trong khoảng giữa để không đốm nào bị mép ảnh cắt cụt.
    for (let i = 0; i < 44; i++) {
      const x = size * (0.2 + r() * 0.6);
      const y = size * (0.35 + r() * 0.3);
      const rad = size * (0.06 + r() * 0.16);
      const g = ctx.createRadialGradient(x, y, 0, x, y, rad);
      g.addColorStop(0, `rgba(255,255,255,${(0.06 + r() * 0.08).toFixed(3)})`);
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g;
      ctx.fillRect(x - rad, y - rad, rad * 2, rad * 2);
    }

    // Ép độ đục về 0 ở bốn mép. Thiếu bước này là bất kỳ đốm nào chạm mép ảnh
    // cũng bị cắt phẳng, và trên màn hình nó hiện thành vệt chữ nhật cạnh sắc
    // trôi ngang trời - trông đúng như vết bẩn trên kính chứ không phải sương.
    const mask = ctx.createRadialGradient(size / 2, size / 2, size * 0.12, size / 2, size / 2, size * 0.5);
    mask.addColorStop(0, 'rgba(0,0,0,1)');
    mask.addColorStop(0.7, 'rgba(0,0,0,1)');
    mask.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.globalCompositeOperation = 'destination-in';
    ctx.fillStyle = mask;
    ctx.fillRect(0, 0, size, size);
    ctx.globalCompositeOperation = 'source-over';
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * Một dãy núi. `peaks` là chiều cao tương đối của từng đỉnh (0..1), `drop` là
 * độ sâu của phần chân váy kéo xuống dưới.
 *
 * Khối được vát mỏng dọc sống núi: chính chỗ vát ấy hứng đèn và cho ra viền
 * sáng trên đỉnh - thứ mà một mặt phẳng cắt thẳng không bao giờ có, và cũng là
 * khác biệt lớn nhất so với bản cũ vẽ núi bằng `ShapeGeometry` phẳng lì.
 *
 * Hai đầu dãy núi là vách cắt thẳng đứng và đáy là một đường ngang phẳng lì.
 * Hễ chúng lọt vào khung hình là hiện nguyên hình mép khối - bậc vuông sắc
 * cạnh giữa trời. Nên người gọi phải cho `width` và `drop` rộng vượt hẳn ra
 * ngoài tầm nhìn ở độ sâu đặt núi.
 */
/**
 * Biến ảnh panorama trời thành tấm nền xa có bốn mép tan dần.
 *
 * Không dùng mặt cầu bọc kín (skybox): lớp 3D nằm ĐÈ LÊN bộ tranh cảnh giới 2D,
 * phủ kín trời là xoá luôn tranh. Tấm phẳng có mép mờ thì hoà vào tranh phía
 * dưới thay vì thay thế nó, và cũng không sinh ra đường nối cứng ngang màn.
 */
export function skyPanelTexture(img: HTMLImageElement): THREE.CanvasTexture {
  const w = 1024;
  const h = 512;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  if (ctx) {
    ctx.drawImage(img, 0, 0, w, h);

    // Mép trái/phải tan trước, rồi mép trên/dưới - đục ở giữa, trong ở rìa.
    ctx.globalCompositeOperation = 'destination-in';
    const side = ctx.createLinearGradient(0, 0, w, 0);
    side.addColorStop(0, 'rgba(0,0,0,0)');
    side.addColorStop(0.22, 'rgba(0,0,0,1)');
    side.addColorStop(0.78, 'rgba(0,0,0,1)');
    side.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = side;
    ctx.fillRect(0, 0, w, h);

    const vert = ctx.createLinearGradient(0, 0, 0, h);
    vert.addColorStop(0, 'rgba(0,0,0,0)');
    vert.addColorStop(0.3, 'rgba(0,0,0,1)');
    vert.addColorStop(0.72, 'rgba(0,0,0,1)');
    vert.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = vert;
    ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'source-over';
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function ridgeGeometry(
  peaks: number[],
  width: number,
  height: number,
  drop = height * 3,
): THREE.BufferGeometry {
  const step = width / (peaks.length - 1);
  const crest = peaks.map((p, i) => new THREE.Vector2(-width / 2 + i * step, p * height));

  // Sống núi đi theo một đường spline chạy xuyên qua mọi đỉnh.
  //
  // Bản trước nối từng cặp đỉnh bằng một cung bậc hai riêng, điểm điều khiển
  // lấy theo chiều cao của đỉnh liền trước. Hai cung gặp nhau ở mỗi đỉnh với
  // hướng khác hẳn nhau, thành ra sống núi bị gãy góc ngay tại đó - và chỗ vát
  // cạnh biến cái góc gãy ấy thành một bậc vuông sắc lẹm giữa sườn núi.
  // Spline thì liên tục cả về hướng nên không còn chỗ nào gãy.
  const line = new THREE.SplineCurve(crest).getPoints(peaks.length * 8);

  const shape = new THREE.Shape();
  shape.moveTo(-width / 2, -drop);
  for (const p of line) shape.lineTo(p.x, p.y);
  shape.lineTo(width / 2, -drop);
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: height * 0.3,
    curveSegments: 8,
    bevelEnabled: true,
    bevelThickness: height * 0.045,
    bevelSize: height * 0.045,
    bevelSegments: 1,
  });
  geo.computeVertexNormals();
  return geo;
}

/**
 * Đảo tiên lơ lửng: trên phẳng như thềm đất, dưới kéo nhọn thành chóp đá - nhìn
 * là biết vừa bị bứng khỏi mặt đất mà bay lên.
 */
export function islandGeometry(seed: number): THREE.BufferGeometry {
  const geo = new THREE.IcosahedronGeometry(1, 2);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const v = new THREE.Vector3();
  const a = seed * 1.7;
  const b = seed * 2.9;
  const c = seed * 4.3;

  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    // Nhiễu bắt buộc phải tính từ toạ độ chứ không được bốc ngẫu nhiên theo
    // đỉnh: khối hai mươi mặt không dùng chỉ mục nên mỗi góc lặp lại ba lần,
    // bốc ngẫu nhiên là ba lần ra ba chỗ khác nhau và mặt đảo sẽ nứt toác.
    const bump =
      Math.sin(v.x * 2.6 + a) * Math.cos(v.y * 3.3 + b) * 0.13 + Math.sin(v.z * 4.1 + c) * 0.07;
    v.y = v.y > 0 ? v.y * 0.26 : v.y * 1.85;
    v.multiplyScalar(0.9 + bump);
    pos.setXYZ(i, v.x, v.y, v.z);
  }

  geo.computeVertexNormals();
  return geo;
}

/**
 * Tháp nhiều tầng đứng trên đảo. Gộp sẵn thành một khối để mỗi toà tháp chỉ tốn
 * đúng một lượt vẽ thay vì hơn chục lượt cho từng mái từng thân.
 */
export function pagodaGeometry(tiers: number): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const add = (g: THREE.BufferGeometry, at: number) => {
    g.translate(0, at, 0);
    parts.push(g);
  };

  let y = 0;
  let radius = 0.62;

  add(new THREE.CylinderGeometry(radius * 1.05, radius * 1.2, 0.14, 8), 0.07);
  y = 0.14;

  for (let i = 0; i < tiers; i++) {
    // Thân phải mập, gần bằng mái. Thân mảnh như que thì cả toà tháp đọc ra
    // thành cây cột ăng-ten cắm mấy cái đĩa, không ra tháp gì cả.
    const bodyH = 0.34 - i * 0.02;
    add(new THREE.CylinderGeometry(radius * 0.86, radius * 0.92, bodyH, 8), y + bodyH / 2);
    y += bodyH;

    // Mái loe rộng hơn hẳn thân: cái hất ra ấy mới là thứ khiến người ta đọc ra
    // "tháp phương Đông" chỉ qua bóng đen, không cần thấy chi tiết nào khác.
    const roofH = 0.26;
    add(new THREE.ConeGeometry(radius * 1.75, roofH, 8, 1), y + roofH / 2);
    y += roofH;

    // Thu nhỏ chậm thôi, thu gấp quá thì mấy tầng trên bé tí như đồ chơi.
    radius *= 0.88;
  }

  add(new THREE.ConeGeometry(radius * 0.4, 0.22, 6), y + 0.11);

  const merged = mergeGeometries(parts);
  parts.forEach((p) => p.dispose());
  return merged ?? new THREE.BufferGeometry();
}

export interface QiField {
  points: THREE.Points;
  material: THREE.ShaderMaterial;
}

/**
 * Dòng linh khí: hạt sáng bay lên, xoắn nhẹ rồi vòng lại đáy. Viết bằng shader
 * để hàng nghìn hạt chỉ tốn một lượt vẽ và CPU không phải đụng vào toạ độ nào.
 */
export function qiField(count: number, spanX: number, spanY: number, depth: number, seed = 3): QiField {
  const r = rng(seed);
  const pos = new Float32Array(count * 3);
  const seeds = new Float32Array(count);
  const sizes = new Float32Array(count);

  for (let i = 0; i < count; i++) {
    pos[i * 3] = (r() - 0.5) * spanX;
    pos[i * 3 + 1] = (r() - 0.5) * spanY;
    pos[i * 3 + 2] = -5 - r() * depth;
    seeds[i] = r() * 100;
    sizes[i] = 1.1 + r() * 2.7;
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1));
  geo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));

  const material = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uTime: { value: 0 },
      uColor: { value: new THREE.Color('#ffffff') },
      uOpacity: { value: 1 },
      uScale: { value: 1 },
      uSpanY: { value: spanY },
    },
    vertexShader: /* glsl */ `
      attribute float aSeed;
      attribute float aSize;
      uniform float uTime;
      uniform float uScale;
      uniform float uSpanY;
      varying float vFade;

      void main() {
        vec3 p = position;

        // Hạt bay lên rồi quay vòng về đáy: đủ để mắt thấy một dòng khí đang
        // chảy mà không phải sinh thêm hạt mới lần nào.
        float rise = 0.35 + fract(aSeed) * 0.55;
        float y = mod(p.y + uSpanY * 0.5 + uTime * rise, uSpanY);

        float t = uTime * 0.6 + aSeed;
        p.x += sin(t * 0.7) * 1.4;
        p.z += cos(t * 0.5) * 1.0;
        p.y = y - uSpanY * 0.5;

        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = aSize * uScale * (30.0 / max(1.0, -mv.z));

        // Mờ dần ở hai đầu hành trình để không ai thấy hạt bật ra hay tắt ngóm
        float h = y / uSpanY;
        float edge = smoothstep(0.0, 0.15, h) * (1.0 - smoothstep(0.72, 1.0, h));
        float twinkle = 0.5 + 0.5 * sin(uTime * 1.8 + aSeed * 6.2831);
        vFade = edge * (0.45 + 0.55 * twinkle);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      uniform float uOpacity;
      varying float vFade;

      void main() {
        vec2 d = gl_PointCoord - vec2(0.5);
        float r = dot(d, d);          // bình phương khoảng cách, khỏi tính căn
        if (r > 0.25) discard;
        float core = 1.0 - r * 4.0;   // 1 ở tâm, 0 ở mép
        gl_FragColor = vec4(uColor, core * core * vFade * uOpacity);
      }
    `,
  });

  return { points: new THREE.Points(geo, material), material };
}
