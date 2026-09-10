import { useEffect, useRef } from "react";
import * as THREE from "three";

/**
 * Nền 3D chạy suốt app: sao trời, ba tầng núi ở ba độ sâu khác nhau, mây trôi
 * và ánh linh khí. Máy quay dịch theo con trỏ nên các tầng lệch nhau tạo cảm
 * giác nhiều chiều thật, không phải ảnh phẳng.
 *
 * Nạp trễ (lazy) vì three.js khá nặng; phía dưới vẫn có nền tranh 2D nên nếu
 * chưa tải xong thì màn hình vẫn đủ đẹp.
 */
interface Props {
  /** Màu cảnh giới hiện tại, dạng hex */
  color: string;
  /** Nền sáng thì giảm độ đậm để không loè */
  light?: boolean;
  className?: string;
}

/** Một dãy núi đá vôi dựng bằng Shape để đổ thành mặt phẳng có viền cong. */
function ridgeShape(
  peaks: number[],
  width: number,
  height: number,
): THREE.Shape {
  const shape = new THREE.Shape();
  const step = width / (peaks.length - 1);
  shape.moveTo(-width / 2, -height);
  for (let i = 0; i < peaks.length; i++) {
    const x = -width / 2 + i * step;
    const y = peaks[i] * height;
    if (i === 0) shape.lineTo(x, y);
    else {
      const px = x - step / 2;
      shape.quadraticCurveTo(px, peaks[i - 1] * height * 1.15, x, y);
    }
  }
  shape.lineTo(width / 2, -height);
  shape.closePath();
  return shape;
}

export default function Scene3DBackdrop({
  color,
  light = false,
  className,
}: Props) {
  const host = useRef<HTMLDivElement>(null);
  const colorRef = useRef(color);
  colorRef.current = color;

  useEffect(() => {
    const el = host.current;
    if (!el) return;

    const reduce =
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    const tint = new THREE.Color(color);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(48, 1, 0.1, 200);
    camera.position.set(0, 0, 14);

    // Máy không có WebGL (hoặc bị tắt, hoặc môi trường test) thì bỏ qua lớp 3D
    // chứ không làm sập cả app - phía dưới vẫn còn nền tranh 2D.
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch {
      return;
    }
    renderer.setPixelRatio(Math.min(1.75, window.devicePixelRatio));
    el.appendChild(renderer.domElement);

    const dim = light ? 0.45 : 1;

    // -------------------------------------------------------------- sao trời
    const starCount = 420;
    const starPos = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      starPos[i * 3] = (Math.random() - 0.5) * 120;
      starPos[i * 3 + 1] = (Math.random() - 0.5) * 60;
      starPos[i * 3 + 2] = -60 - Math.random() * 40;
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute("position", new THREE.BufferAttribute(starPos, 3));
    const stars = new THREE.Points(
      starGeo,
      new THREE.PointsMaterial({
        color: tint,
        size: 0.34,
        transparent: true,
        opacity: 0.5 * dim,
      }),
    );
    scene.add(stars);

    // -------------------------------------------------- quầng linh khí phía xa
    const glow = new THREE.Mesh(
      new THREE.SphereGeometry(26, 24, 24),
      new THREE.MeshBasicMaterial({
        color: tint,
        transparent: true,
        opacity: 0.05 * dim,
        blending: THREE.AdditiveBlending,
      }),
    );
    glow.position.set(6, 12, -50);
    scene.add(glow);

    // -------------------------------------------------- ba tầng núi theo độ sâu
    const layers: { mesh: THREE.Mesh; depth: number }[] = [];
    const specs = [
      {
        peaks: [0.1, 0.62, 0.3, 0.86, 0.28, 0.7, 0.2, 0.78, 0.16],
        w: 120,
        h: 16,
        z: -46,
        o: 0.1,
      },
      {
        peaks: [0.08, 0.46, 0.22, 0.6, 0.18, 0.5, 0.55, 0.2, 0.4],
        w: 90,
        h: 13,
        z: -30,
        o: 0.16,
      },
      {
        peaks: [0.06, 0.3, 0.12, 0.36, 0.1, 0.26, 0.16, 0.32, 0.08],
        w: 66,
        h: 10,
        z: -17,
        o: 0.24,
      },
    ];
    for (const sp of specs) {
      const mesh = new THREE.Mesh(
        new THREE.ShapeGeometry(ridgeShape(sp.peaks, sp.w, sp.h)),
        new THREE.MeshBasicMaterial({
          color: tint.clone().multiplyScalar(light ? 0.7 : 0.45),
          transparent: true,
          opacity: sp.o * dim,
        }),
      );
      mesh.position.set(0, -sp.h * 0.55, sp.z);
      scene.add(mesh);
      layers.push({ mesh, depth: sp.z });
    }

    // ------------------------------------------------------------- mây trôi
    const cloudTex = (() => {
      const c = document.createElement("canvas");
      c.width = c.height = 128;
      const ctx = c.getContext("2d");
      if (ctx) {
        const g = ctx.createRadialGradient(64, 64, 4, 64, 64, 62);
        g.addColorStop(0, "rgba(255,255,255,0.5)");
        g.addColorStop(1, "rgba(255,255,255,0)");
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, 128, 128);
      }
      return new THREE.CanvasTexture(c);
    })();

    const clouds: THREE.Sprite[] = [];
    for (let i = 0; i < 14; i++) {
      const sprite = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: cloudTex,
          color: tint,
          transparent: true,
          opacity: 0.09 * dim,
          depthWrite: false,
        }),
      );
      const s = 12 + Math.random() * 20;
      sprite.scale.set(s, s * 0.5, 1);
      sprite.position.set(
        (Math.random() - 0.5) * 110,
        -2 + Math.random() * 14,
        -22 - Math.random() * 26,
      );
      scene.add(sprite);
      clouds.push(sprite);
    }

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

    // Con trỏ điều khiển hướng nhìn, biên độ nhỏ để không gây chóng mặt.
    const target = { x: 0, y: 0 };
    const onMove = (e: PointerEvent) => {
      target.x = (e.clientX / window.innerWidth - 0.5) * 2;
      target.y = (e.clientY / window.innerHeight - 0.5) * 2;
    };
    if (!reduce)
      window.addEventListener("pointermove", onMove, { passive: true });

    let raf = 0;
    const clock = new THREE.Clock();
    const tick = () => {
      const t = clock.getElapsedTime();
      const dt = Math.min(0.05, clock.getDelta());

      camera.position.x += (target.x * 1.5 - camera.position.x) * 0.04;
      camera.position.y += (-target.y * 0.9 - camera.position.y) * 0.04;
      camera.lookAt(0, 0, -30);

      if (!reduce) {
        stars.rotation.z = t * 0.004;
        glow.scale.setScalar(1 + Math.sin(t * 0.5) * 0.04);
        // Tầng gần trôi nhanh hơn tầng xa - đó là chỗ sinh ra chiều sâu.
        layers.forEach((l, i) => {
          l.mesh.position.x = Math.sin(t * 0.02 * (i + 1)) * (2 + i * 2);
        });
        for (const c of clouds) {
          c.position.x += dt * (0.5 + (c.position.z + 48) * 0.02);
          if (c.position.x > 60) c.position.x = -60;
        }
      }

      renderer.render(scene, camera);
      raf = requestAnimationFrame(tick);
    };
    tick();

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener("pointermove", onMove);
      cloudTex.dispose();
      renderer.dispose();
      scene.traverse((o) => {
        const mesh = o as THREE.Mesh;
        mesh.geometry?.dispose?.();
        const mat = mesh.material as
          THREE.Material | THREE.Material[] | undefined;
        if (Array.isArray(mat)) mat.forEach((x) => x.dispose());
        else mat?.dispose?.();
      });
      el.removeChild(renderer.domElement);
    };
  }, [color, light]);

  return <div ref={host} className={className} aria-hidden />;
}
