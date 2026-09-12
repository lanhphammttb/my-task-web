import { useEffect, useRef } from "react";
import * as THREE from "three";
import {
  glowTexture,
  islandGeometry,
  mistTexture,
  pagodaGeometry,
  qiField,
  ridgeGeometry,
  skyPanelTexture,
} from "./scene3d/build";

/**
 * Lớp thế giới 3D chạy suốt app: núi non nhiều tầng, đảo tiên lơ lửng có tháp
 * đứng trên, sương trôi và dòng linh khí bay lên. Máy quay dịch theo con trỏ
 * nên các tầng lệch nhau - đó là chỗ sinh ra cảm giác đứng trong một không gian
 * thật thay vì nhìn một tấm ảnh phẳng.
 *
 * Lớp này nằm đè lên nền tranh 2D nên nền vẽ trong suốt, và mọi thứ đều để độ
 * mờ vừa phải: tranh phía dưới vẫn phải đọc được, 3D chỉ thêm chiều sâu chứ
 * không giành chỗ.
 *
 * Nạp trễ vì three.js khá nặng; chưa tải xong thì nền tranh 2D vẫn đủ đẹp.
 */
interface Props {
  /** Màu cảnh giới hiện tại, dạng hex. Đổi cảnh giới thì cả thế giới đổi sắc. */
  color: string;
  /** Nền sáng thì hạ độ đậm để không loè trên giấy tuyên. */
  light?: boolean;
  /**
   * Panorama trời của cảnh giới hiện tại. Bọc mặt trong một mặt cầu rất lớn.
   * Cố tình để bán trong suốt: lớp 3D nằm ĐÈ LÊN bộ tranh cảnh giới 2D, phủ
   * kín là xoá luôn tranh vừa vẽ.
   */
  sky?: string;
  /**
   * 0..1 - hạ xuống khi có bảng đang mở, để nền lùi hẳn ra sau và không tranh
   * chú ý với nội dung người dùng đang đọc.
   */
  intensity?: number;
  className?: string;
}

/** Màu mực nền của mọi bóng núi, bóng đảo. Sắc cảnh giới pha thêm lên trên. */
const INK = new THREE.Color("#0a0c11");

/** Pha vào đèn cho ánh sáng nhạt bớt, kẻo mặt được chiếu bị nhuộm quá gắt. */
const PALE = new THREE.Color("#ffffff");

/** Sắc vàng kim của app. Hạt linh khí ngả về đây để không lẫn vào nền tranh. */
const GOLD = new THREE.Color("#f2d492");

/**
 * Ba tầng núi ở ba độ sâu: tầng gần trôi nhanh hơn tầng xa, đó là chiều sâu.
 *
 * `w` và `drop` cố tình để rộng gấp mấy lần tầm nhìn ở độ sâu tương ứng, kể cả
 * trên màn siêu rộng. Hụt một chút là vách cắt hai đầu hoặc đáy phẳng của khối
 * lọt vào khung và hiện thành bậc vuông sắc cạnh giữa lưng trời.
 */
const RIDGES = [
  {
    peaks: [0.1, 0.62, 0.3, 0.86, 0.28, 0.7, 0.2, 0.78, 0.16],
    w: 260,
    h: 17,
    drop: 60,
    y: -18.8,
    z: -46,
    o: 0.09,
  },
  {
    peaks: [0.08, 0.46, 0.22, 0.6, 0.18, 0.5, 0.55, 0.2, 0.4],
    w: 200,
    h: 14,
    drop: 50,
    y: -13.4,
    z: -32,
    o: 0.12,
  },
  {
    peaks: [0.06, 0.3, 0.12, 0.36, 0.1, 0.26, 0.16, 0.32, 0.08],
    w: 150,
    h: 11,
    drop: 40,
    y: -8.9,
    z: -19,
    o: 0.16,
  },
];

/**
 * Đảo tiên, đặt hết lên nửa trên khung hình.
 *
 * Nửa dưới màn hình là sân, là nền tranh 2D vốn đã kín chi tiết, mà giữa màn
 * hình là chỗ đứng của HUD và nút đột phá - thả đảo xuống đấy chỉ tổ rối mắt.
 * Khoảng trời hai bên phía trên mới là chỗ trống thật sự để đảo có đất diễn.
 */
const ISLANDS = [
  { x: -15, y: 6.5, z: -24, s: 1.8, tiers: 3, bob: 0.9 },
  { x: 13, y: 8, z: -27, s: 2.2, tiers: 4, bob: 1.2 },
  { x: -21, y: 2, z: -33, s: 2.4, tiers: 0, bob: 1 },
  { x: 20, y: 3, z: -30, s: 2, tiers: 0, bob: 0.8 },
  { x: -9, y: 11.5, z: -38, s: 2.6, tiers: 5, bob: 1.4 },
  { x: 8, y: 12.5, z: -36, s: 2.1, tiers: 0, bob: 1.3 },
];

/** Vật liệu có màu và độ mờ được nhuộm lại theo cảnh giới ở mỗi khung hình. */
interface Tinted {
  mat: THREE.Material & { color: THREE.Color; opacity: number };
  /** Độ mờ gốc, sẽ nhân với độ đậm chung. */
  base: number;
  /** Pha bao nhiêu phần sắc cảnh giới vào màu mực. 1 là lấy trọn sắc. */
  mix: number;
  /** Nhân sáng/tối sau khi pha. */
  shade: number;
}

export default function Scene3DBackdrop({
  color,
  light = false,
  sky,
  intensity = 1,
  className,
}: Props) {
  const host = useRef<HTMLDivElement>(null);

  // Cảnh giới và độ đậm đổi ngay giữa lúc cảnh đang chạy, nên nhét vào ref để
  // vòng lặp đọc được giá trị mới mà không phải dựng lại toàn bộ thế giới.
  const want = useRef({ color, light, sky, intensity });

  // Khi người dùng tắt hiệu ứng chuyển động, cảnh đứng yên và chỉ vẽ lại đúng
  // lúc có gì đó thật sự đổi. Hàm vẽ lại ấy được gắn vào đây.
  const redraw = useRef<(() => void) | null>(null);

  useEffect(() => {
    const el = host.current;
    if (!el) return;

    const reduce =
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

    // Máy không có WebGL (hoặc bị tắt, hoặc môi trường test) thì bỏ hẳn lớp 3D
    // chứ không làm sập cả app - phía dưới vẫn còn nguyên nền tranh 2D.
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: "low-power",
      });
    } catch {
      return;
    }

    // Máy nhỏ gánh ít hạt và ít đảo hơn: nền đẹp mấy cũng vô nghĩa nếu gõ việc
    // vào bị giật.
    const small = window.innerWidth < 768;
    renderer.setPixelRatio(
      Math.min(small ? 1.4 : 1.75, window.devicePixelRatio),
    );
    el.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(48, 1, 0.1, 220);
    camera.position.set(0, 0, 14);

    // Lấy trạng thái ban đầu qua `want` chứ không qua props: hiệu ứng này chỉ
    // chạy đúng một lần, đọc thẳng props sẽ khoá cứng giá trị của lần render
    // đầu và mọi lần đột phá sau đó đọc phải giá trị cũ.
    const tint = new THREE.Color(want.current.color);
    const fog = new THREE.FogExp2(tint.getHex(), 0.0125);
    scene.fog = fog;

    const tinted: Tinted[] = [];
    const track = (
      mat: Tinted["mat"],
      base: number,
      mix: number,
      shade: number,
    ) => {
      tinted.push({ mat, base, mix, shade });
      return mat;
    };

    // ------------------------------------------------------------------ đèn
    // Một đèn hướng duy nhất từ trên chếch trái. Núi và đảo chỉ cần chừng ấy để
    // có mặt sáng mặt tối, còn lại cứ để chìm trong bóng cho ra chất thuỷ mặc.
    const key = new THREE.DirectionalLight(tint.getHex(), 2.4);
    key.position.set(-8, 12, 6);
    scene.add(key);
    scene.add(new THREE.AmbientLight(0xffffff, 0.1));

    let disposed = false;
    const glowTex = glowTexture();
    const mistTex = mistTexture();

    // --------------------------------------------------------- panorama trời
    // Tấm phẳng đặt xa, KHÔNG phải mặt cầu bọc kín: lớp 3D đè lên tranh cảnh
    // giới 2D nên phủ kín trời là xoá mất tranh. Bốn mép tan dần để hoà vào
    // tranh phía dưới thay vì cắt ngang màn một đường cứng.
    let skyTex: THREE.Texture | null = null;
    let skyMat: THREE.MeshBasicMaterial | null = null;
    let skyShown: string | undefined;

    /**
     * Nạp panorama trời, và đổi tấm khi lên cảnh giới mới.
     *
     * Phải đi qua `want` chứ không đọc thẳng prop `sky`: hiệu ứng dựng cảnh
     * chỉ chạy đúng một lần, nên đọc thẳng là khoá cứng tấm trời của lần render
     * đầu - đột phá xong trời vẫn y nguyên cho tới khi tải lại trang, đúng thứ
     * tính năng này sinh ra để tránh.
     *
     * Đổi tấm thì chỉ thay texture trên vật liệu cũ, không dựng lại mặt phẳng:
     * dựng lại là mất luôn hiệu ứng chuyển sắc đang chạy dở.
     */
    const syncSky = () => {
      const url = want.current.sky;
      if (url === skyShown) return;
      skyShown = url;
      if (!url) return;

      const img = new Image();
      img.onload = () => {
        // Bỏ qua nếu cảnh đã dọn, hoặc người dùng đã đột phá tiếp trong lúc
        // ảnh còn đang tải và giờ tấm này không còn là tấm đang cần.
        if (disposed || skyShown !== url) return;
        const next = skyPanelTexture(img);

        if (skyMat) {
          skyTex?.dispose();
          skyTex = next;
          skyMat.map = next;
          skyMat.needsUpdate = true;
        } else {
          skyTex = next;
          skyMat = new THREE.MeshBasicMaterial({
            map: next,
            transparent: true,
            depthWrite: false,
            fog: false,
          });
          const panel = new THREE.Mesh(new THREE.PlaneGeometry(210, 105), skyMat);
          panel.position.set(2, 12, -88);
          panel.renderOrder = -1;
          scene.add(panel);
          track(skyMat, 0.5, 0, 1);
        }
        redraw.current?.();
      };
      // Thiếu file thì im lặng bỏ qua, thế giới vẫn chạy như cũ.
      img.onerror = () => {};
      img.src = url;
    };
    syncSky();

    // ------------------------------------------------------------- sao trời
    const starCount = small ? 240 : 460;
    const starPos = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      starPos[i * 3] = (Math.random() - 0.5) * 130;
      starPos[i * 3 + 1] = (Math.random() - 0.5) * 70;
      starPos[i * 3 + 2] = -62 - Math.random() * 44;
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute("position", new THREE.BufferAttribute(starPos, 3));
    const starMat = new THREE.PointsMaterial({
      size: 0.36,
      transparent: true,
      depthWrite: false,
      fog: false,
    });
    const stars = new THREE.Points(starGeo, track(starMat, 0.45, 1, 1.25));
    scene.add(stars);

    // ------------------------------------------------- quầng linh khí phía xa
    const halo = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: glowTex,
        transparent: true,
        depthWrite: false,
        fog: false,
      }),
    );
    halo.scale.set(78, 78, 1);
    halo.position.set(7, 13, -56);
    scene.add(halo);
    track(halo.material, 0.1, 1, 1);

    // ---------------------------------------------------------------- núi non
    const ridges = RIDGES.map((r, i) => {
      const mat = new THREE.MeshLambertMaterial({
        transparent: true,
        depthWrite: false,
      });
      // Núi xa phải sáng hơn nền chứ không tối hơn: bóng gần đen đặt trên nền
      // đêm là chìm mất tăm, còn dãy núi bắt sương mới ra được chất thuỷ mặc.
      const mesh = new THREE.Mesh(
        ridgeGeometry(r.peaks, r.w, r.h, r.drop),
        track(mat, r.o, 0.85, 1.1),
      );
      mesh.position.set(0, r.y, r.z);
      scene.add(mesh);
      // Tầng gần trôi nhanh và xa hơn tầng xa - đó là chỗ sinh ra chiều sâu.
      return { mesh, amp: 2 + i * 2, speed: 0.02 * (i + 1) };
    });

    // ------------------------------------------------------------- đảo tiên
    const islandSpecs = small ? ISLANDS.slice(0, 4) : ISLANDS;
    const islandGroups: {
      group: THREE.Group;
      spec: (typeof ISLANDS)[number];
      phase: number;
    }[] = [];

    islandSpecs.forEach((spec, i) => {
      const group = new THREE.Group();

      const rockMat = new THREE.MeshLambertMaterial({
        transparent: true,
        flatShading: true,
        depthWrite: false,
      });
      const rock = new THREE.Mesh(
        islandGeometry(i + 1),
        track(rockMat, 0.5, 0.52, 1),
      );
      rock.rotation.y = i * 1.1;
      group.add(rock);

      if (spec.tiers > 0) {
        const towerMat = new THREE.MeshLambertMaterial({
          transparent: true,
          depthWrite: false,
        });
        const tower = new THREE.Mesh(
          pagodaGeometry(spec.tiers),
          track(towerMat, 0.62, 0.7, 1.2),
        );
        tower.scale.setScalar(0.78);
        tower.position.y = 0.2;
        tower.rotation.y = 0.4 + i * 0.3;
        group.add(tower);
      }

      // Hào quang bám quanh đảo: chính lớp này khiến đảo dính vào không khí chứ
      // không nổi lên như miếng dán cắt rời.
      const aura = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: glowTex,
          transparent: true,
          depthWrite: false,
          fog: false,
        }),
      );
      aura.scale.set(4.6, 3.4, 1);
      aura.position.y = -0.2;
      group.add(aura);
      track(aura.material, 0.16, 1, 1);

      group.position.set(spec.x, spec.y, spec.z);
      group.scale.setScalar(spec.s);
      scene.add(group);
      islandGroups.push({ group, spec, phase: i * 1.7 });
    });

    // ---------------------------------------------------------------- sương
    const mists: THREE.Sprite[] = [];
    for (let i = 0; i < (small ? 8 : 16); i++) {
      const sprite = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: mistTex,
          transparent: true,
          depthWrite: false,
        }),
      );
      const w = 12 + Math.random() * 16;
      sprite.scale.set(w, w * 0.42, 1);
      sprite.position.set(
        (Math.random() - 0.5) * 120,
        -4 + Math.random() * 18,
        -20 - Math.random() * 30,
      );
      scene.add(sprite);
      mists.push(sprite);
      track(sprite.material, 0.1, 0.85, 1);
    }

    // ----------------------------------------------------------- dòng linh khí
    const qi = qiField(small ? 420 : 1100, 90, 46, 34);
    scene.add(qi.points);

    // ------------------------------------------------------------------ khung
    let aspect = 1;
    const resize = () => {
      const w = el.clientWidth || 1;
      const h = el.clientHeight || 1;
      // Để three tự đặt luôn kích thước CSS của canvas: không có rule CSS nào
      // cho thẻ canvas, bỏ qua bước này là canvas phình to gấp devicePixelRatio
      // lần và cảnh bị cắt mất một góc.
      renderer.setSize(w, h);
      aspect = w / h;
      camera.aspect = aspect;
      camera.updateProjectionMatrix();

      // Hạt phải to nhỏ theo chiều cao khung, nếu không thì màn hình càng cao
      // hạt trông càng bé li ti.
      qi.material.uniforms.uScale.value = (h * renderer.getPixelRatio()) / 900;

      // Màn dọc hẹp thì kéo đảo vào gần trục giữa, không thì chúng nằm hết
      // ngoài rìa và điện thoại chẳng thấy đảo nào.
      const pull = Math.min(1, Math.max(0.42, aspect / 1.6));
      for (const it of islandGroups) it.group.position.x = it.spec.x * pull;
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(el);

    // Con trỏ điều khiển hướng nhìn, biên độ nhỏ để không gây chóng mặt.
    const aim = { x: 0, y: 0 };
    const onMove = (e: PointerEvent) => {
      aim.x = (e.clientX / window.innerWidth - 0.5) * 2;
      aim.y = (e.clientY / window.innerHeight - 0.5) * 2;
    };
    if (!reduce)
      window.addEventListener("pointermove", onMove, { passive: true });

    // ------------------------------------------------------- nhuộm theo cảnh giới
    const targetColor = new THREE.Color();
    let dim = 0;
    let lastLight = want.current.light;

    /** Đổi cách pha hạt linh khí giữa nền sáng và nền tối. */
    const applyMode = (isLight: boolean) => {
      // Nền giấy sáng mà cộng thêm ánh sáng thì hạt bay màu trắng xoá, không
      // thấy gì; chuyển sang pha thường và để hạt đậm hơn nền mới đọc được.
      qi.material.blending = isLight
        ? THREE.NormalBlending
        : THREE.AdditiveBlending;
      qi.material.needsUpdate = true;
    };
    applyMode(lastLight);

    /** Kéo màu, độ đậm và mọi vật liệu về đúng trạng thái cảnh giới đang tu. */
    const applyTint = (dt: number) => {
      const w = want.current;
      // Rẻ như so hai chuỗi khi trời không đổi, nên gọi mỗi khung cũng không sao.
      syncSky();
      targetColor.set(w.color);

      // Đột phá cảnh giới thì cả thế giới chuyển sắc từ từ chứ không giật một
      // cái sang màu mới - đó mới là cảm giác "cảnh giới vừa đổi".
      const ease = dt <= 0 ? 1 : 1 - Math.exp(-dt * 1.6);
      tint.lerp(targetColor, ease);

      const wantDim =
        (w.light ? 0.6 : 1) * Math.max(0, Math.min(1, w.intensity));
      dim += (wantDim - dim) * (dt <= 0 ? 1 : 1 - Math.exp(-dt * 3));

      if (w.light !== lastLight) {
        lastLight = w.light;
        applyMode(w.light);
      }

      fog.color.copy(tint);
      key.color.copy(tint).lerp(PALE, 0.55);
      key.intensity = 3.2 * (0.4 + 0.6 * dim);

      for (const it of tinted) {
        it.mat.color.copy(INK).lerp(tint, it.mix).multiplyScalar(it.shade);
        it.mat.opacity = it.base * dim;
      }

      // Hạt lấy sắc cảnh giới nhưng kéo mạnh về vàng kim: để nguyên sắc cảnh
      // giới thì hạt trùng màu nền tranh và biến mất hẳn khỏi mắt người nhìn.
      qi.material.uniforms.uColor.value
        .copy(tint)
        .lerp(GOLD, 0.55)
        .multiplyScalar(w.light ? 0.5 : 1.5);
      qi.material.uniforms.uOpacity.value = (w.light ? 0.85 : 0.9) * dim;
    };

    // ------------------------------------------------------------- vòng lặp
    // Tự cộng thời gian thay vì hỏi Clock: tạm dừng lúc ẩn tab rồi quay lại là
    // cảnh chạy tiếp đúng chỗ cũ, không nhảy vọt vì một delta khổng lồ.
    let t = 0;
    let last = 0;
    let raf = 0;

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(0.05, last ? (now - last) / 1000 : 0.016);
      last = now;
      t += dt;

      applyTint(dt);

      const damp = 1 - Math.exp(-dt * 3);
      // Cộng thêm một nhịp trôi rất chậm: không ai chạm chuột thì cảnh vẫn thở.
      camera.position.x +=
        (aim.x * 1.6 + Math.sin(t * 0.07) * 0.9 - camera.position.x) * damp;
      camera.position.y +=
        (-aim.y * 1 + Math.cos(t * 0.05) * 0.5 - camera.position.y) * damp;
      camera.lookAt(0, 0, -28);

      stars.rotation.z = t * 0.004;
      halo.scale.setScalar(78 * (1 + Math.sin(t * 0.5) * 0.03));
      qi.material.uniforms.uTime.value = t;

      for (const r of ridges) r.mesh.position.x = Math.sin(t * r.speed) * r.amp;

      for (const it of islandGroups) {
        // Đảo dập dềnh và xoay rất chậm quanh trục đứng: đủ để mắt bắt được
        // rằng đây là khối có bề dày, không phải hình cắt dán.
        it.group.position.y =
          it.spec.y + Math.sin(t * 0.28 + it.phase) * it.spec.bob;
        it.group.rotation.y = Math.sin(t * 0.05 + it.phase) * 0.25;
      }

      for (const m of mists) {
        m.position.x += dt * (0.45 + (m.position.z + 52) * 0.02);
        if (m.position.x > 66) m.position.x = -66;
      }

      renderer.render(scene, camera);
    };

    const onVisibility = () => {
      if (document.hidden) {
        cancelAnimationFrame(raf);
        raf = 0;
      } else if (!raf && !reduce) {
        last = 0;
        raf = requestAnimationFrame(frame);
      }
    };

    if (reduce) {
      // Tôn trọng lựa chọn tắt chuyển động: dựng một khung tĩnh, chỉ vẽ lại khi
      // cảnh giới hoặc chế độ sáng tối thật sự đổi.
      const still = () => {
        applyTint(0);
        qi.material.uniforms.uTime.value = 6;
        renderer.render(scene, camera);
      };
      redraw.current = still;
      still();
    } else {
      raf = requestAnimationFrame(frame);
      document.addEventListener("visibilitychange", onVisibility);
    }

    return () => {
      cancelAnimationFrame(raf);
      redraw.current = null;
      ro.disconnect();
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("visibilitychange", onVisibility);
      disposed = true;
      glowTex.dispose();
      mistTex.dispose();
      skyTex?.dispose();
      scene.traverse((o) => {
        const mesh = o as THREE.Mesh;
        mesh.geometry?.dispose?.();
        const mat = mesh.material as
          THREE.Material | THREE.Material[] | undefined;
        if (Array.isArray(mat)) mat.forEach((x) => x.dispose());
        else mat?.dispose?.();
      });
      renderer.dispose();
      el.removeChild(renderer.domElement);
    };
    // Dựng đúng một lần. Mọi thay đổi từ props đi qua `want` và được vòng lặp
    // nhuộm dần vào cảnh - dựng lại cả thế giới mỗi lần đột phá thì vừa giật
    // vừa mất luôn hiệu ứng chuyển sắc.
  }, []);

  useEffect(() => {
    // Ghi ref ở đây chứ không ghi thẳng trong thân hàm: ghi lúc render là đụng
    // vào giá trị ngoài luồng render của React, đúng thứ chế độ nghiêm ngặt bắt
    // lỗi và cũng là thứ dễ sinh trạng thái lệch khi React render thử hai lần.
    want.current = { color, light, sky, intensity };
    // Ở chế độ tắt chuyển động không có vòng lặp nào chạy, nên props đổi thì
    // phải tự gọi vẽ lại một khung.
    redraw.current?.();
  }, [color, light, sky, intensity]);

  return <div ref={host} className={className} aria-hidden />;
}
