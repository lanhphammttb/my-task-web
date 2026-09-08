import { useEffect, useRef } from 'react';
import * as THREE from 'three';

/**
 * Cảnh thiên kiếp dựng bằng three.js: mây đen vần vũ, linh khí cuộn quanh một
 * hạt nhân sáng, và những tia sét giáng xuống. Chỉ dùng đúng lúc độ kiếp nên
 * component này được nạp trễ (lazy) để three.js không nằm trong bundle chính.
 */
interface Props {
  /** Màu chủ đạo, thường lấy theo cảnh giới sắp bước vào */
  color: string;
  /** Đang giáng kiếp: sét dày và nhanh hơn */
  striking: boolean;
  className?: string;
}

/** Sinh một tia sét gấp khúc từ trên xuống, có nhánh phụ. */
function makeBolt(rand: () => number): Float32Array {
  const pts: number[] = [];
  let x = (rand() - 0.5) * 3;
  let y = 6;
  let z = (rand() - 0.5) * 3;
  const steps = 14;
  for (let i = 0; i < steps; i++) {
    const nx = x + (rand() - 0.5) * 1.1;
    const ny = y - 6 / steps;
    const nz = z + (rand() - 0.5) * 1.1;
    pts.push(x, y, z, nx, ny, nz);
    // Nhánh phụ toả ra hai bên cho giống sét thật.
    if (rand() < 0.25) {
      pts.push(nx, ny, nz, nx + (rand() - 0.5) * 1.6, ny - 0.5, nz + (rand() - 0.5) * 1.6);
    }
    x = nx;
    y = ny;
    z = nz;
  }
  return new Float32Array(pts);
}

export default function TribulationScene({ color, striking, className }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const strikingRef = useRef(striking);
  strikingRef.current = striking;

  useEffect(() => {
    const el = host.current;
    if (!el) return;

    const tint = new THREE.Color(color);
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x05060b, 0.075);

    const camera = new THREE.PerspectiveCamera(52, 1, 0.1, 100);
    camera.position.set(0, 1.2, 9);

    // Máy không có WebGL (hoặc bị tắt, hoặc môi trường test) thì bỏ qua lớp 3D
    // chứ không làm sập cả app - phía dưới vẫn còn nền tranh 2D.
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch {
      return;
    }
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
    el.appendChild(renderer.domElement);

    // ------------------------------------------------------------- mây đen
    const cloudGeo = new THREE.IcosahedronGeometry(1, 1);
    const cloudMat = new THREE.MeshBasicMaterial({
      color: tint.clone().multiplyScalar(0.35),
      transparent: true,
      opacity: 0.16,
    });
    const clouds = new THREE.InstancedMesh(cloudGeo, cloudMat, 26);
    const m = new THREE.Matrix4();
    for (let i = 0; i < 26; i++) {
      const a = (i / 26) * Math.PI * 2;
      const r = 3.4 + Math.random() * 2.6;
      m.makeScale(1 + Math.random() * 1.4, 0.55 + Math.random() * 0.4, 1 + Math.random() * 1.4);
      m.setPosition(Math.cos(a) * r, 3.4 + Math.random() * 1.6, Math.sin(a) * r);
      clouds.setMatrixAt(i, m);
    }
    scene.add(clouds);

    // ------------------------------------------ hạt nhân linh khí và vòng xoáy
    const core = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.62, 3),
      new THREE.MeshBasicMaterial({ color: tint, transparent: true, opacity: 0.9 }),
    );
    core.position.y = -0.6;
    scene.add(core);

    const halo = new THREE.Mesh(
      new THREE.SphereGeometry(1.5, 24, 24),
      new THREE.MeshBasicMaterial({
        color: tint,
        transparent: true,
        opacity: 0.1,
        blending: THREE.AdditiveBlending,
      }),
    );
    halo.position.copy(core.position);
    scene.add(halo);

    const rings: THREE.Mesh[] = [];
    for (let i = 0; i < 3; i++) {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(1.5 + i * 0.55, 0.012, 8, 96),
        new THREE.MeshBasicMaterial({ color: tint, transparent: true, opacity: 0.5 }),
      );
      ring.position.copy(core.position);
      ring.rotation.x = Math.PI / 2 + (i - 1) * 0.25;
      scene.add(ring);
      rings.push(ring);
    }

    // --------------------------------------------------- hạt linh khí bay lên
    const moteCount = 320;
    const motePos = new Float32Array(moteCount * 3);
    for (let i = 0; i < moteCount; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = 0.6 + Math.random() * 3.4;
      motePos[i * 3] = Math.cos(a) * r;
      motePos[i * 3 + 1] = -1.4 + Math.random() * 5;
      motePos[i * 3 + 2] = Math.sin(a) * r;
    }
    const moteGeo = new THREE.BufferGeometry();
    moteGeo.setAttribute('position', new THREE.BufferAttribute(motePos, 3));
    const motes = new THREE.Points(
      moteGeo,
      new THREE.PointsMaterial({
        color: tint,
        size: 0.055,
        transparent: true,
        opacity: 0.75,
        blending: THREE.AdditiveBlending,
      }),
    );
    scene.add(motes);

    // ------------------------------------------------------------------ sét
    const boltMat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0 });
    const boltGeo = new THREE.BufferGeometry();
    boltGeo.setAttribute('position', new THREE.BufferAttribute(makeBolt(Math.random), 3));
    const bolt = new THREE.LineSegments(boltGeo, boltMat);
    scene.add(bolt);

    const flash = new THREE.Mesh(
      new THREE.SphereGeometry(24, 8, 8),
      new THREE.MeshBasicMaterial({ color: tint, transparent: true, opacity: 0, side: THREE.BackSide }),
    );
    scene.add(flash);

    const resize = () => {
      const w = el.clientWidth || 1;
      const h = el.clientHeight || 1;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(el);

    let raf = 0;
    let nextStrike = 0;
    let boltLife = 0;
    const clock = new THREE.Clock();

    const tick = () => {
      const t = clock.getElapsedTime();
      const dt = clock.getDelta();

      clouds.rotation.y = t * 0.06;
      core.rotation.y = t * 0.5;
      core.rotation.x = t * 0.22;
      halo.scale.setScalar(1 + Math.sin(t * 2.2) * 0.06);
      rings.forEach((r, i) => {
        r.rotation.z = t * (0.4 + i * 0.18) * (i % 2 ? -1 : 1);
      });

      // Hạt linh khí trôi lên rồi lặp lại từ dưới.
      const pos = moteGeo.getAttribute('position') as THREE.BufferAttribute;
      for (let i = 0; i < moteCount; i++) {
        let y = pos.getY(i) + dt * (0.5 + (i % 5) * 0.16);
        if (y > 4.2) y = -1.6;
        pos.setY(i, y);
      }
      pos.needsUpdate = true;

      // Sét: lóe lên rồi tắt dần, tần suất tuỳ trạng thái.
      if (t > nextStrike) {
        boltGeo.setAttribute('position', new THREE.BufferAttribute(makeBolt(Math.random), 3));
        boltLife = 1;
        nextStrike = t + (strikingRef.current ? 0.35 + Math.random() * 0.5 : 1.6 + Math.random() * 2.2);
      }
      boltLife = Math.max(0, boltLife - dt * 5);
      boltMat.opacity = boltLife;
      (flash.material as THREE.MeshBasicMaterial).opacity = boltLife * (strikingRef.current ? 0.16 : 0.07);

      // Máy quay lượn nhẹ quanh trục cho có chiều sâu.
      camera.position.x = Math.sin(t * 0.16) * 1.6;
      camera.position.z = 9 + Math.cos(t * 0.16) * 0.8;
      camera.lookAt(0, 0.2, 0);

      renderer.render(scene, camera);
      raf = requestAnimationFrame(tick);
    };
    tick();

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      renderer.dispose();
      scene.traverse((o) => {
        const anyO = o as THREE.Mesh;
        anyO.geometry?.dispose?.();
        const mat = anyO.material as THREE.Material | THREE.Material[] | undefined;
        if (Array.isArray(mat)) mat.forEach((x) => x.dispose());
        else mat?.dispose?.();
      });
      el.removeChild(renderer.domElement);
    };
  }, [color]);

  return <div ref={host} className={className} aria-hidden />;
}
