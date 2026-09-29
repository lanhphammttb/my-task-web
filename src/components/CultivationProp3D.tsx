import { useEffect, useRef } from "react";
import * as THREE from "three";
import { cn } from "@/lib/utils";
import { glowTexture } from "./scene3d/build";

type PropKind = "jade-core" | "alchemy-furnace" | "quest-scroll" | "realm-gate";

interface Props {
  kind: PropKind;
  active?: boolean;
  resting?: boolean;
  className?: string;
}

/** Small, real-time Three.js props used in the focus sanctum and alchemy hall. */
export default function CultivationProp3D({
  kind,
  active = false,
  resting = false,
  className,
}: Props) {
  const host = useRef<HTMLDivElement>(null);
  const state = useRef({ active, resting });

  useEffect(() => {
    state.current = { active, resting };
  }, [active, resting]);

  useEffect(() => {
    const el = host.current;
    if (!el) return;

    const reducedMotion =
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    const small = window.innerWidth < 768;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: !small,
        powerPreference: "low-power",
        precision: small ? "mediump" : "highp",
      });
    } catch {
      el.dataset.webglFallback = "true";
      return;
    }
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.18;
    renderer.setPixelRatio(Math.min(small ? 1 : 1.35, window.devicePixelRatio || 1));
    renderer.setClearColor(0x000000, 0);
    el.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 30);
    const isFurnace = kind === "alchemy-furnace";
    const isScroll = kind === "quest-scroll";
    const isGate = kind === "realm-gate";
    camera.position.set(0, isFurnace ? 1.18 : 0, isGate ? 5.7 : 5.1);
    camera.lookAt(0, isFurnace ? 0.44 : isGate ? 0.04 : 0, 0);
    scene.add(new THREE.HemisphereLight(0xf5ead0, 0x172019, 1.24));

    const key = new THREE.DirectionalLight(0xffedc5, 2.45);
    key.position.set(-3.2, 4.5, 5);
    scene.add(key);
    const rim = new THREE.DirectionalLight(
      isFurnace ? 0xff913e : isGate ? 0x79cfb0 : isScroll ? 0xc29b5d : 0x61c9a0,
      isFurnace ? 2.15 : isGate ? 1.25 : isScroll ? 0.92 : 0.78,
    );
    rim.position.set(3.4, 0.4, -2.2);
    scene.add(rim);
    const front = new THREE.PointLight(
      isFurnace ? 0xffc278 : isGate ? 0xa3dfc6 : isScroll ? 0xe2c995 : 0xd6e1b2,
      isFurnace ? 2.2 : isGate ? 1.15 : isScroll ? 0.84 : 1.02,
      8,
      2,
    );
    front.position.set(0.15, 1.1, 4);
    scene.add(front);

    const textures = new Set<THREE.Texture>();
    const jadeGrainData = new Uint8Array(96 * 96 * 4);
    let grainSeed = 0x2f6e4b;
    for (let i = 0; i < 96 * 96; i++) {
      grainSeed = (grainSeed * 1664525 + 1013904223) >>> 0;
      const grain = 116 + ((grainSeed >>> 24) % 27);
      const offset = i * 4;
      jadeGrainData[offset] = grain;
      jadeGrainData[offset + 1] = grain;
      jadeGrainData[offset + 2] = grain;
      jadeGrainData[offset + 3] = 255;
    }
    const jadeGrain = new THREE.DataTexture(
      jadeGrainData,
      96,
      96,
      THREE.RGBAFormat,
    );
    jadeGrain.wrapS = THREE.RepeatWrapping;
    jadeGrain.wrapT = THREE.RepeatWrapping;
    jadeGrain.repeat.set(2.5, 2.5);
    jadeGrain.minFilter = THREE.LinearFilter;
    jadeGrain.magFilter = THREE.LinearFilter;
    jadeGrain.needsUpdate = true;
    textures.add(jadeGrain);

    const prop = new THREE.Group();
    scene.add(prop);
    const gold = new THREE.MeshPhysicalMaterial({
      color: 0xb9934e,
      metalness: 0.62,
      roughness: 0.22,
      clearcoat: 0.85,
      clearcoatRoughness: 0.18,
    });
    const jade = new THREE.MeshPhysicalMaterial({
      color: 0x285943,
      emissive: 0x0b2218,
      emissiveIntensity: 0.22,
      metalness: 0.27,
      roughness: 0.3,
      bumpMap: jadeGrain,
      bumpScale: 0.035,
      clearcoat: 0.76,
      clearcoatRoughness: 0.22,
    });
    const bronze = new THREE.MeshPhysicalMaterial({
      color: 0x59432c,
      metalness: 0.78,
      roughness: 0.27,
      clearcoat: 0.72,
    });

    const beadGeometry = new THREE.SphereGeometry(0.065, 16, 12);
    let orbitA: THREE.Mesh | undefined;
    let orbitB: THREE.Mesh | undefined;
    let orbitC: THREE.Mesh | undefined;
    let ember: THREE.Mesh | undefined;
    let fireLight: THREE.PointLight | undefined;

    if (kind === "jade-core") {
      const core = new THREE.Mesh(
        // Keep the cut facets visible: polished mineral, not a smooth glowing ball.
        new THREE.IcosahedronGeometry(0.62, 1),
        jade,
      );
      prop.add(core);

      orbitA = new THREE.Mesh(new THREE.TorusGeometry(0.98, 0.021, 10, 96), gold);
      orbitA.rotation.set(0.82, 0.18, -0.38);
      prop.add(orbitA);

      const fineJade = new THREE.MeshPhysicalMaterial({
        color: 0x589b78,
        emissive: 0x153b2c,
        emissiveIntensity: 0.35,
        metalness: 0.74,
        roughness: 0.25,
        clearcoat: 0.8,
      });
      orbitB = new THREE.Mesh(
        new THREE.TorusGeometry(0.81, 0.009, 8, 96),
        fineJade,
      );
      orbitB.rotation.set(-0.95, 0.7, 0.28);
      prop.add(orbitB);

      const seal = new THREE.Mesh(
        new THREE.TorusGeometry(1.13, 0.006, 6, 96),
        new THREE.MeshBasicMaterial({ color: 0x997b48, transparent: true, opacity: 0.55 }),
      );
      seal.rotation.set(0.25, 0.1, 0.08);
      prop.add(seal);

      const dots = new THREE.Group();
      for (let i = 0; i < 6; i++) {
        const bead = new THREE.Mesh(beadGeometry, i % 2 ? fineJade : gold);
        const angle = (i / 6) * Math.PI * 2;
        bead.position.set(Math.cos(angle) * 0.99, Math.sin(angle) * 0.99, 0);
        dots.add(bead);
      }
      orbitA.add(dots);

      const halo = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: glowTexture(),
          color: state.current.resting ? 0x8bc99d : 0xc49b54,
          transparent: true,
          opacity: 0.2,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        }),
      );
      halo.scale.set(2.25, 2.25, 1);
      halo.position.z = -0.65;
      prop.add(halo);
      if (halo.material.map) textures.add(halo.material.map);
    } else if (isFurnace) {
      // A cast-bronze pill furnace with a hollow mouth, forged bands and side handles.
      const profile = [
        new THREE.Vector2(0.27, 0.12),
        new THREE.Vector2(0.32, 0.2),
        new THREE.Vector2(0.42, 0.36),
        new THREE.Vector2(0.47, 0.58),
        new THREE.Vector2(0.43, 0.77),
        new THREE.Vector2(0.35, 0.86),
        new THREE.Vector2(0.3, 0.87),
      ];
      const body = new THREE.Mesh(new THREE.LatheGeometry(profile, 40), bronze);
      prop.add(body);

      const base = new THREE.Mesh(new THREE.TorusGeometry(0.33, 0.045, 10, 36), gold);
      base.position.y = 0.2;
      base.rotation.x = Math.PI / 2;
      prop.add(base);
      for (const [radius, y, tube] of [
        [0.455, 0.57, 0.026],
        [0.37, 0.82, 0.022],
        [0.34, 0.9, 0.035],
      ]) {
        const band = new THREE.Mesh(new THREE.TorusGeometry(radius, tube, 8, 40), gold);
        band.position.y = y;
        band.rotation.x = Math.PI / 2;
        prop.add(band);
      }

      const lid = new THREE.Mesh(new THREE.SphereGeometry(0.31, 24, 12), bronze);
      lid.scale.set(1, 0.34, 1);
      lid.position.y = 0.93;
      prop.add(lid);
      const knob = new THREE.Mesh(new THREE.SphereGeometry(0.08, 16, 12), gold);
      knob.position.y = 1.08;
      prop.add(knob);

      for (const side of [-1, 1]) {
        const handle = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.035, 8, 24), gold);
        handle.rotation.y = Math.PI / 2;
        handle.position.set(side * 0.43, 0.64, 0);
        prop.add(handle);

        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.085, 0.28, 8), bronze);
        leg.position.set(side * 0.27, 0.09, 0.02);
        leg.rotation.z = side * -0.12;
        prop.add(leg);
      }
      const rearLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.08, 0.26, 8), bronze);
      rearLeg.position.set(0, 0.08, -0.29);
      prop.add(rearLeg);

      ember = new THREE.Mesh(
        new THREE.IcosahedronGeometry(0.135, 1),
        new THREE.MeshPhysicalMaterial({
          color: 0xb46627,
          emissive: 0xe46d18,
          emissiveIntensity: 2.15,
          roughness: 0.29,
          metalness: 0.15,
        }),
      );
      ember.position.set(0, 0.89, 0.15);
      prop.add(ember);
      fireLight = new THREE.PointLight(0xf08028, 1.4, 2.8, 2);
      fireLight.position.set(0, 1.02, 0.55);
      prop.add(fireLight);

      for (const angle of [0.35, 2.45, 4.55]) {
        const foot = new THREE.Mesh(beadGeometry, gold);
        foot.scale.set(1, 0.62, 1);
        foot.position.set(Math.cos(angle) * 0.32, 0.035, Math.sin(angle) * 0.32);
        prop.add(foot);
      }
    } else if (isScroll) {
      // A mission scroll: textured parchment, carved rollers, brass caps and a wax seal.
      const canvas = document.createElement("canvas");
      canvas.width = 256;
      canvas.height = 384;
      const context = canvas.getContext("2d");
      if (context) {
        const paper = context.createLinearGradient(0, 0, 256, 0);
        paper.addColorStop(0, "#8d7047");
        paper.addColorStop(0.12, "#ddc898");
        paper.addColorStop(0.5, "#e8d7ad");
        paper.addColorStop(0.88, "#d5bd8c");
        paper.addColorStop(1, "#816442");
        context.fillStyle = paper;
        context.fillRect(0, 0, 256, 384);
        context.strokeStyle = "rgba(81, 54, 31, .28)";
        context.lineWidth = 2;
        context.strokeRect(22, 18, 212, 348);
        context.fillStyle = "rgba(84, 49, 32, .72)";
        context.font = "bold 20px serif";
        context.textAlign = "center";
        context.fillText("修 行 札", 128, 62);
        context.strokeStyle = "rgba(85, 55, 35, .42)";
        context.lineWidth = 3;
        for (let line = 0; line < 6; line++) {
          context.beginPath();
          context.moveTo(50, 106 + line * 31);
          context.lineTo(206 - (line % 3) * 12, 106 + line * 31);
          context.stroke();
        }
        context.beginPath();
        context.arc(184, 300, 27, 0, Math.PI * 2);
        context.fillStyle = "#873c2b";
        context.fill();
        context.strokeStyle = "rgba(246, 205, 122, .78)";
        context.lineWidth = 2;
        context.stroke();
        context.fillStyle = "#f1cf88";
        context.font = "bold 22px serif";
        context.fillText("令", 184, 308);
      }
      const paperTexture = new THREE.CanvasTexture(canvas);
      paperTexture.colorSpace = THREE.SRGBColorSpace;
      textures.add(paperTexture);
      const parchment = new THREE.Mesh(
        new THREE.PlaneGeometry(0.86, 1.28),
        new THREE.MeshPhysicalMaterial({
          map: paperTexture,
          roughness: 0.82,
          metalness: 0.02,
          side: THREE.DoubleSide,
          clearcoat: 0.12,
        }),
      );
      parchment.position.z = 0.05;
      parchment.rotation.y = -0.08;
      prop.add(parchment);

      const rollerGeometry = new THREE.CylinderGeometry(0.082, 0.082, 1.02, 20);
      for (const y of [-0.68, 0.68]) {
        const roller = new THREE.Mesh(rollerGeometry, bronze);
        roller.rotation.z = Math.PI / 2;
        roller.position.set(0, y, 0.06);
        prop.add(roller);
        for (const side of [-1, 1]) {
          const cap = new THREE.Mesh(new THREE.SphereGeometry(0.083, 16, 12), gold);
          cap.scale.set(0.54, 1, 1);
          cap.position.set(side * 0.52, y, 0.06);
          prop.add(cap);
        }
      }
      const tassel = new THREE.Mesh(
        new THREE.CylinderGeometry(0.008, 0.026, 0.24, 8),
        new THREE.MeshPhysicalMaterial({ color: 0x8b372b, roughness: 0.86 }),
      );
      tassel.position.set(0.43, -0.82, 0.09);
      prop.add(tassel);
      const wax = new THREE.Mesh(
        new THREE.DodecahedronGeometry(0.12, 1),
        new THREE.MeshPhysicalMaterial({
          color: 0x963c2e,
          roughness: 0.3,
          clearcoat: 0.9,
          clearcoatRoughness: 0.16,
        }),
      );
      wax.position.set(0.26, -0.37, 0.12);
      wax.scale.set(1, 0.92, 0.42);
      prop.add(wax);
    } else {
      // A miniature breakthrough gate, inlaid with jade light and hand-forged brass.
      const stone = new THREE.MeshPhysicalMaterial({
        color: 0x465047,
        metalness: 0.53,
        roughness: 0.34,
        clearcoat: 0.6,
        clearcoatRoughness: 0.28,
      });
      const portalJade = new THREE.MeshPhysicalMaterial({
        color: 0x5da88a,
        emissive: 0x1b6049,
        emissiveIntensity: 0.9,
        metalness: 0.32,
        roughness: 0.2,
        clearcoat: 0.95,
        transparent: true,
        opacity: 0.88,
      });
      const lintel = new THREE.Mesh(new THREE.BoxGeometry(1.58, 0.17, 0.26), stone);
      lintel.position.y = 0.78;
      prop.add(lintel);
      for (const side of [-1, 1]) {
        const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.105, 0.14, 1.48, 10), stone);
        pillar.position.set(side * 0.66, 0.03, 0);
        prop.add(pillar);
        const foot = new THREE.Mesh(new THREE.BoxGeometry(0.39, 0.13, 0.38), gold);
        foot.position.set(side * 0.66, -0.73, 0);
        prop.add(foot);
        const crown = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.24, 4), gold);
        crown.position.set(side * 0.66, 0.91, 0);
        crown.rotation.y = Math.PI / 4;
        prop.add(crown);
      }
      const threshold = new THREE.Mesh(new THREE.BoxGeometry(1.72, 0.12, 0.38), stone);
      threshold.position.set(0, -0.83, 0.04);
      prop.add(threshold);

      const portal = new THREE.Group();
      portal.position.set(0, -0.01, -0.08);
      prop.add(portal);
      const jadeArch = new THREE.Mesh(new THREE.TorusGeometry(0.53, 0.045, 12, 72), portalJade);
      portal.add(jadeArch);
      orbitB = new THREE.Mesh(
        new THREE.TorusGeometry(0.43, 0.012, 8, 72),
        new THREE.MeshPhysicalMaterial({
          color: 0xd4ae64,
          emissive: 0x534018,
          emissiveIntensity: 0.42,
          metalness: 0.82,
          roughness: 0.2,
        }),
      );
      portal.add(orbitB);
      orbitC = new THREE.Mesh(
        new THREE.TorusGeometry(0.61, 0.009, 8, 72),
        new THREE.MeshBasicMaterial({ color: 0xa6ceb4, transparent: true, opacity: 0.52 }),
      );
      orbitC.rotation.z = Math.PI / 2;
      portal.add(orbitC);
      const light = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: glowTexture(),
          color: 0x60bd93,
          transparent: true,
          opacity: 0.36,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        }),
      );
      light.scale.set(0.84, 1.24, 1);
      light.position.z = -0.1;
      portal.add(light);
      if (light.material.map) textures.add(light.material.map);

      for (let i = 0; i < 7; i++) {
        const angle = (i / 7) * Math.PI * 2;
        const rune = new THREE.Mesh(
          new THREE.OctahedronGeometry(i % 2 ? 0.045 : 0.06, 0),
          i % 2 ? portalJade : gold,
        );
        rune.position.set(Math.cos(angle) * 0.68, Math.sin(angle) * 0.62, 0.11);
        portal.add(rune);
      }
      orbitA = new THREE.Mesh(new THREE.TorusGeometry(0.83, 0.009, 8, 72), gold);
      orbitA.rotation.x = Math.PI / 2.6;
      orbitA.position.y = -0.72;
      prop.add(orbitA);
    }

    const resize = () => {
      const width = Math.max(1, el.clientWidth);
      const height = Math.max(1, el.clientHeight);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(el);
    resize();

    let time = 0;
    let lastFrame = 0;
    let raf = 0;
    const render = (now: number) => {
      raf = requestAnimationFrame(render);
      if (lastFrame && now - lastFrame < 1000 / 30) return;
      const dt = Math.min(0.05, lastFrame ? (now - lastFrame) / 1000 : 0.016);
      lastFrame = now;
      time += dt;
      prop.rotation.y += dt * (state.current.active ? 0.48 : 0.17);
      prop.rotation.x = Math.sin(time * 0.3) * 0.035;
      if (orbitA) orbitA.rotation.z += dt * (state.current.active ? 0.31 : 0.12);
      if (orbitB) {
        if (isGate) orbitB.rotation.z += dt * (state.current.active ? 0.22 : 0.1);
        else orbitB.rotation.y += dt * 0.18;
      }
      if (orbitC) orbitC.rotation.y += dt * 0.13;
      if (ember) {
        const warmth = state.current.active ? 1 : 0.58;
        (ember.material as THREE.MeshPhysicalMaterial).emissiveIntensity =
          warmth * (1.45 + Math.sin(time * 3.2) * 0.42);
      }
      if (fireLight) fireLight.intensity = (state.current.active ? 1.75 : 1.0) + Math.sin(time * 3.2) * 0.28;
      renderer.render(scene, camera);
    };
    const onVisibility = () => {
      if (document.hidden) {
        cancelAnimationFrame(raf);
        raf = 0;
      } else if (!raf && !reducedMotion) {
        lastFrame = 0;
        raf = requestAnimationFrame(render);
      }
    };
    if (reducedMotion) renderer.render(scene, camera);
    else {
      raf = requestAnimationFrame(render);
      document.addEventListener("visibilitychange", onVisibility);
    }

    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("visibilitychange", onVisibility);
      observer.disconnect();
      scene.traverse((object) => {
        const drawable = object as THREE.Mesh;
        drawable.geometry?.dispose?.();
        const material = drawable.material as THREE.Material | THREE.Material[] | undefined;
        if (Array.isArray(material)) material.forEach((item) => item.dispose());
        else material?.dispose?.();
      });
      textures.forEach((texture) => texture.dispose());
      renderer.dispose();
      if (renderer.domElement.parentElement === el) el.removeChild(renderer.domElement);
    };
  }, [kind]);

  return (
    <div
      ref={host}
      className={cn("cultivation-prop-3d", className)}
      data-prop={kind}
      data-active={active}
      data-resting={resting}
      aria-hidden="true"
    >
      <span className="cultivation-prop-fallback" />
    </div>
  );
}
