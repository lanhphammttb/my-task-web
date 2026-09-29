import { useEffect, useRef } from "react";
import * as THREE from "three";
import {
  formationRingGeometry,
  formationSealTexture,
  glowTexture,
  qiField,
  rng,
} from "./scene3d/build";

const SANCTUARY_ART = "/art/3d/floating-sanctuary-v1.webp";
const DRAGON_ART = "/art/3d/jade-dragon-spirit-v1.webp";
const GOLD = new THREE.Color("#f1d18a");
const PALE = new THREE.Color("#eff8ff");

interface Props {
  color: string;
  light?: boolean;
  intensity?: number;
  className?: string;
}

interface TintedMaterial {
  mat: THREE.Material & { color?: THREE.Color; opacity: number };
  original: THREE.Color;
  base: number;
  mix: number;
  shade: number;
}

/**
 * A lightweight 2.5D scene layered over the realm painting: real alpha-cutout game art,
 * a lit cultivation seal, drifting qi and an occasional spirit-dragon flyby.
 * The old procedural low-poly mountain/island layer has been retired.
 */
export default function Scene3DBackdrop({
  color,
  light = false,
  intensity = 1,
  className,
}: Props) {
  const host = useRef<HTMLDivElement>(null);
  const want = useRef({ color, light, intensity });
  const redraw = useRef<(() => void) | null>(null);

  useEffect(() => {
    const el = host.current;
    if (!el) return;

    const reducedMotion =
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    let small = window.innerWidth < 768;
    let disposed = false;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: !small,
        alpha: true,
        powerPreference: "low-power",
        precision: small ? "mediump" : "highp",
      });
    } catch {
      return;
    }
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    renderer.setPixelRatio(Math.min(small ? 1.15 : 1.65, window.devicePixelRatio || 1));
    el.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(46, 1, 0.1, 180);
    camera.position.set(0, 0, 7);

    const tint = new THREE.Color(want.current.color);
    const targetColor = new THREE.Color();
    const fog = new THREE.FogExp2(tint.getHex(), 0.0048);
    scene.fog = fog;

    scene.add(new THREE.HemisphereLight(0xb8d7e2, 0x172018, 0.72));
    const keyLight = new THREE.DirectionalLight(PALE, 2.1);
    keyLight.position.set(-7, 12, 8);
    scene.add(keyLight);
    const rimLight = new THREE.PointLight(0x83d9c6, 1.8, 36, 2);
    rimLight.position.set(4, 6, -8);
    scene.add(rimLight);

    const tinted: TintedMaterial[] = [];
    const opacityMaterials: Array<{ mat: THREE.Material & { opacity: number }; base: number }> = [];
    const textures = new Set<THREE.Texture>();
    const track = <T extends THREE.Material & { color?: THREE.Color; opacity: number }>(
      mat: T,
      base: number,
      mix: number,
      shade = 1,
    ): T => {
      if (mat.color) tinted.push({ mat, original: mat.color.clone(), base, mix, shade });
      return mat;
    };
    const trackOpacity = <T extends THREE.Material & { opacity: number }>(
      mat: T,
      base: number,
    ) => {
      opacityMaterials.push({ mat, base });
      return mat;
    };

    const glowTex = glowTexture();
    const sealTex = formationSealTexture();
    textures.add(glowTex);
    textures.add(sealTex);

    const loader = new THREE.TextureLoader();
    const loadArt = (url: string) => {
      const tex = loader.load(url, (loaded) => {
        if (disposed) {
          loaded.dispose();
          return;
        }
        loaded.colorSpace = THREE.SRGBColorSpace;
        loaded.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
        redraw.current?.();
      });
      tex.colorSpace = THREE.SRGBColorSpace;
      textures.add(tex);
      return tex;
    };

    // Distant lantern sparks are a quiet depth cue, kept sparse on phones.
    const starCount = small ? 100 : 250;
    const starSeed = rng(112);
    const starPositions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      starPositions[i * 3] = (starSeed() - 0.5) * 110;
      starPositions[i * 3 + 1] = (starSeed() - 0.5) * 54;
      starPositions[i * 3 + 2] = -42 - starSeed() * 45;
    }
    const starGeometry = new THREE.BufferGeometry();
    starGeometry.setAttribute("position", new THREE.BufferAttribute(starPositions, 3));
    const stars = new THREE.Points(
      starGeometry,
      track(
        new THREE.PointsMaterial({
          size: 0.19,
          transparent: true,
          depthWrite: false,
          fog: false,
        }),
        0.34,
        0.8,
        1.2,
      ),
    );
    scene.add(stars);

    // Real cutout art becomes a depth-layered object instead of another flat background.
    const sanctuaryTexture = loadArt(SANCTUARY_ART);
    const sanctuaryMaterial = trackOpacity(
      new THREE.MeshBasicMaterial({
        map: sanctuaryTexture,
        transparent: true,
        alphaTest: 0.018,
        depthWrite: false,
        side: THREE.DoubleSide,
        toneMapped: false,
      }),
      0.84,
    );
    const sanctuary = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), sanctuaryMaterial);
    sanctuary.position.set(3.5, 7.8, -30);
    sanctuary.scale.set(4.7, 4.95, 1);
    sanctuary.rotation.z = -0.025;
    sanctuary.renderOrder = 2;
    scene.add(sanctuary);

    // A hovering jade seal frames the disciple portrait and gives the scene a real 3D focal point.
    const formation = new THREE.Group();
    const ringSpecs = [
      { radius: 2.35, tube: 0.045, color: 0xffdf91, opacity: 0.95, tilt: 0.13 },
      { radius: 2.1, tube: 0.032, color: 0x9dffe7, opacity: 0.9, tilt: -0.32 },
      { radius: 2.62, tube: 0.018, color: 0xffe7ae, opacity: 0.76, tilt: 0.52 },
    ];
    const rings: THREE.Mesh[] = [];
    ringSpecs.forEach((spec, i) => {
      // A broad, low-opacity jade/gold underglow keeps the formation readable
      // against pale skies on mobile; the finer tube above it carries the metal edge.
      const haloMaterial = trackOpacity(
        new THREE.MeshBasicMaterial({
          color: spec.color,
          transparent: true,
          opacity: 0.22,
          depthWrite: false,
          side: THREE.DoubleSide,
          toneMapped: false,
        }),
        0.22,
      );
      const halo = new THREE.Mesh(
        formationRingGeometry(spec.radius, spec.tube * 2.5, 112),
        haloMaterial,
      );
      halo.rotation.set(spec.tilt, i * 0.36, i * 0.72);
      halo.renderOrder = 3;
      formation.add(halo);

      const mat = track(
        new THREE.MeshPhysicalMaterial({
          color: spec.color,
          emissive: spec.color,
          emissiveIntensity: 0.12,
          metalness: 0.78,
          roughness: 0.24,
          clearcoat: 0.92,
          clearcoatRoughness: 0.18,
          transparent: true,
          opacity: spec.opacity,
          depthWrite: false,
          side: THREE.DoubleSide,
        }),
        spec.opacity,
        0.035,
        1.1,
      );
      const ring = new THREE.Mesh(
        formationRingGeometry(spec.radius, spec.tube, 112),
        mat,
      );
      ring.rotation.set(spec.tilt, i * 0.36, i * 0.72);
      formation.add(ring);
      rings.push(ring);
    });
    formation.position.set(0, 5.05, -13.5);
    formation.renderOrder = 4;
    scene.add(formation);

    // Engraved lightwork beneath the tilted metal hoops makes the seal read as a
    // deliberate game spell on narrow screens, while the hoops retain the 3D depth.
    const sealMaterial = trackOpacity(
      new THREE.SpriteMaterial({
        map: sealTex,
        color: 0xffffff,
        transparent: true,
        opacity: 0.76,
        depthWrite: false,
        fog: false,
        toneMapped: false,
        blending: THREE.AdditiveBlending,
      }),
      0.76,
    );
    const sealSprite = new THREE.Sprite(sealMaterial);
    sealSprite.scale.set(small ? 6.1 : 5.35, small ? 6.1 : 5.35, 1);
    sealSprite.position.set(0, 0, 0.15);
    sealSprite.renderOrder = 3;
    formation.add(sealSprite);

    const glyphs: THREE.Mesh[] = [];
    for (let i = 0; i < 10; i++) {
      const angle = (i / 10) * Math.PI * 2;
      const shardMaterial = track(
        new THREE.MeshStandardMaterial({
          color: i % 2 ? 0x7ec7b5 : 0xe5c16e,
          emissive: i % 2 ? 0x153f38 : 0x60430f,
          emissiveIntensity: 0.55,
          metalness: 0.48,
          roughness: 0.24,
          transparent: true,
          depthWrite: false,
        }),
        0.22,
        0.7,
        1.2,
      );
      const shard = new THREE.Mesh(new THREE.OctahedronGeometry(0.075, 0), shardMaterial);
      shard.position.set(Math.cos(angle) * 2.75, Math.sin(angle) * 1.65, Math.sin(angle) * 0.25);
      formation.add(shard);
      glyphs.push(shard);
    }

    const orb = new THREE.Mesh(
      new THREE.DodecahedronGeometry(0.255, 0),
      track(
        new THREE.MeshPhysicalMaterial({
          // Deep mineral jade with a restrained inner warmth; the previous
          // pale mint + strong glow read as a plastic bead against the sky.
          color: 0x27553f,
          emissive: 0x07190f,
          emissiveIntensity: 0.22,
          metalness: 0.38,
          roughness: 0.3,
          clearcoat: 0.68,
          clearcoatRoughness: 0.2,
          opacity: 0.99,
        }),
        0.96,
        0.035,
        1.08,
      ),
    );
    orb.position.set(2.55, 6.25, -12.8);
    scene.add(orb);

    const orbOrbitMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xb89555,
      emissive: 0x39280e,
      emissiveIntensity: 0.2,
      metalness: 0.91,
      roughness: 0.24,
      clearcoat: 0.82,
      transparent: true,
      opacity: 0.86,
      depthWrite: false,
    });
    const orbOrbit = new THREE.Group();
    const orbGoldRing = new THREE.Mesh(
      formationRingGeometry(0.37, 0.013, 80),
      orbOrbitMaterial,
    );
    orbGoldRing.rotation.set(0.7, 0.22, -0.42);
    orbOrbit.add(orbGoldRing);
    const orbFineRing = new THREE.Mesh(
      formationRingGeometry(0.45, 0.006, 80),
      new THREE.MeshBasicMaterial({
        color: 0x907c50,
        transparent: true,
        opacity: 0.58,
        depthWrite: false,
      }),
    );
    orbFineRing.rotation.set(-0.86, 0.28, 0.52);
    orbOrbit.add(orbFineRing);
    scene.add(orbOrbit);

    const orbGlow = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: glowTex,
        color: 0xb49a61,
        transparent: true,
        depthWrite: false,
        fog: false,
        blending: THREE.AdditiveBlending,
      }),
    );
    orbGlow.scale.set(0.9, 0.9, 1);
    orbGlow.position.copy(orb.position);
    orbGlow.position.z -= 0.35;
    scene.add(orbGlow);
    track(orbGlow.material, 0.13, 0.12, 1.05);

    const qi = qiField(small ? 220 : 620, 72, 42, 33, 41);
    scene.add(qi.points);

    // The dragon cutout is a true alpha texture on a moving 3D plane. Keep the
    // creature itself as the effect: a broad additive halo/trail bleached the scene.
    const dragonTexture = loadArt(DRAGON_ART);
    const dragonMaterial = new THREE.MeshBasicMaterial({
      map: dragonTexture,
      transparent: true,
      alphaTest: 0.075,
      depthWrite: false,
      side: THREE.DoubleSide,
      toneMapped: false,
      opacity: 0,
    });
    const dragon = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), dragonMaterial);
    dragon.scale.set(small ? 6.5 : 9.2, small ? 4.35 : 6.15, 1);
    dragon.position.set(-10, 8, -18);
    dragon.renderOrder = 3;
    scene.add(dragon);

    let skyAspect = 1;
    let formationX = 0;
    let formationY = 5.05;
    let sanctuaryX = 3.15;
    let sanctuaryY = 7.8;
    const resize = () => {
      const width = Math.max(1, el.clientWidth);
      const height = Math.max(1, el.clientHeight);
      small = window.innerWidth < 768;
      renderer.setPixelRatio(Math.min(small ? 1.15 : 1.65, window.devicePixelRatio || 1));
      renderer.setSize(width, height);
      skyAspect = width / height;
      camera.aspect = skyAspect;
      camera.updateProjectionMatrix();

      // The desktop seal sits behind the disciple area; mobile keeps its portrait framing.
      formationX = small ? 0 : -skyAspect * 1.78;
      formationY = small ? 5.05 : -2.05;
      formation.position.set(formationX, formationY, -13.5);
      formation.scale.setScalar(small ? 1 : 0.84);
      sealSprite.scale.set(small ? 6.1 : 5.35, small ? 6.1 : 5.35, 1);

      // Keep one distant sanctuary in the scene, scaled for each viewport.
      sanctuaryX = small ? 3.15 : Math.min(13, skyAspect * 5.25);
      sanctuary.position.x = sanctuaryX;
      sanctuaryY = small ? 7.8 : 8.35;
      sanctuary.scale.set(small ? 4.7 : 6.35, small ? 4.95 : 6.65, 1);

      orb.position.set(formationX + (small ? 2.55 : 2.15), formationY + (small ? 1.2 : 1.75), -12.8);
      orbOrbit.position.copy(orb.position);
      orbGlow.position.copy(orb.position);
      orbGlow.position.z -= 0.35;

      dragon.scale.set(small ? 5.35 : 6.8, small ? 3.55 : 4.55, 1);
      qi.material.uniforms.uScale.value = (height * renderer.getPixelRatio()) / 950;
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(el);
    window.addEventListener("resize", resize, { passive: true });
    window.visualViewport?.addEventListener("resize", resize, { passive: true });

    const aim = { x: 0, y: 0 };
    const onMove = (event: PointerEvent) => {
      aim.x = (event.clientX / Math.max(1, window.innerWidth) - 0.5) * 2;
      aim.y = (event.clientY / Math.max(1, window.innerHeight) - 0.5) * 2;
    };
    const onPointerEnd = () => {
      aim.x = 0;
      aim.y = 0;
    };
    if (!reducedMotion) {
      // Touch movement gives the phone scene real parallax; the cutout art,
      // rings and distant sanctuary now shift at separate depths with a soft return.
      window.addEventListener("pointermove", onMove, { passive: true });
      window.addEventListener("pointerup", onPointerEnd, { passive: true });
      window.addEventListener("pointercancel", onPointerEnd, { passive: true });
    }

    let lastLight = want.current.light;
    const applyMode = (isLight: boolean) => {
      qi.material.blending = isLight ? THREE.NormalBlending : THREE.AdditiveBlending;
      qi.material.needsUpdate = true;
    };
    applyMode(lastLight);

    let dim = 0;
    const applyTint = (dt: number) => {
      const target = want.current;
      targetColor.set(target.color);
      const ease = dt <= 0 ? 1 : 1 - Math.exp(-dt * 1.25);
      tint.lerp(targetColor, ease);
      const targetDim = (target.light ? 0.82 : 1) * Math.max(0, Math.min(1, target.intensity));
      dim += (targetDim - dim) * (dt <= 0 ? 1 : 1 - Math.exp(-dt * 2.6));

      if (target.light !== lastLight) {
        lastLight = target.light;
        applyMode(lastLight);
      }
      fog.color.copy(tint);
      keyLight.color.copy(tint).lerp(PALE, 0.68);
      keyLight.intensity = 2.25 * (0.5 + dim * 0.5);
      rimLight.intensity = 1.2 * dim;

      for (const { mat, original, base, mix, shade } of tinted) {
        mat.color?.copy(original).lerp(tint, mix).multiplyScalar(shade);
        mat.opacity = base * dim;
      }
      for (const { mat, base } of opacityMaterials) mat.opacity = base * dim;
      qi.material.uniforms.uColor.value.copy(tint).lerp(GOLD, 0.62);
      qi.material.uniforms.uOpacity.value = (target.light ? 0.63 : 0.84) * dim * (small ? 0.52 : 0.86);
    };

    const clamp01 = (n: number) => Math.max(0, Math.min(1, n));
    const smooth = (edge0: number, edge1: number, x: number) => {
      const n = clamp01((x - edge0) / (edge1 - edge0));
      return n * n * (3 - 2 * n);
    };
    let t = 0;
    let lastFrame = 0;
    let raf = 0;
    const animateDragon = (time: number) => {
      const duration = 7.6;
      const period = 22;
      // Let the first pass begin at once, then keep it as a periodic world event.
      const phase = (time % period + period) % period;
      const u = clamp01(phase / duration);
      const active = phase >= 0 && phase <= duration;
      const sweep = small ? Math.max(4.8, skyAspect * 8.6) : Math.max(10, skyAspect * 8.2);
      const x = -sweep + sweep * 2 * u;
      const y = (small ? 5.7 : 6.9) + Math.sin(u * Math.PI) * 0.8;
      const z = -17.8 + Math.sin(u * Math.PI * 2) * 1.15;
      const fade = active ? smooth(0, 0.1, u) * (1 - smooth(0.83, 1, u)) : 0;

      dragon.position.set(x, y, z);
      dragon.rotation.z = Math.cos(u * Math.PI) * 0.075;
      dragonMaterial.opacity = fade * 0.76 * dim;
    };

    const render = (now: number) => {
      raf = requestAnimationFrame(render);
      if (small && lastFrame && now - lastFrame < 1000 / 30) return;
      const dt = Math.min(0.05, lastFrame ? (now - lastFrame) / 1000 : 0.016);
      lastFrame = now;
      t += dt;
      applyTint(dt);

      const damp = 1 - Math.exp(-dt * 2.1);
      camera.position.x += (aim.x * (small ? 0.62 : 0.9) + Math.sin(t * 0.055) * 0.25 - camera.position.x) * damp;
      camera.position.y += (-aim.y * (small ? 0.38 : 0.55) + Math.cos(t * 0.04) * 0.16 - camera.position.y) * damp;
      camera.lookAt(0, 0, -26);

      stars.rotation.z = t * 0.0018;
      // Move the foreground seal, qi and distant sanctuary at different rates:
      // touch/hover now reveals depth instead of translating the whole backdrop.
      formation.position.x = formationX + aim.x * (small ? 0.1 : 0.18);
      formation.position.y = formationY - aim.y * (small ? 0.08 : 0.14);
      formation.rotation.x = -aim.y * 0.045;
      formation.rotation.y = Math.sin(t * 0.22) * 0.18 + aim.x * 0.07;
      formation.rotation.z = Math.sin(t * 0.16) * 0.08 + aim.x * 0.015;
      sealSprite.material.rotation = -t * 0.018;
      sanctuary.position.x = sanctuaryX + aim.x * (small ? 0.24 : 0.4);
      sanctuary.position.y = sanctuaryY + Math.sin(t * 0.32) * 0.16 - aim.y * 0.16;
      sanctuary.rotation.y = Math.sin(t * 0.09) * 0.035 + aim.x * 0.012;
      rings.forEach((ring, i) => {
        ring.rotation.z += dt * (i % 2 ? -0.045 : 0.035);
      });
      glyphs.forEach((glyph, i) => {
        glyph.rotation.x += dt * (0.28 + (i % 3) * 0.08);
        glyph.rotation.y += dt * 0.42;
      });
      orb.position.x = formationX + (small ? 2.55 : 2.15) + aim.x * 0.19;
      orb.position.y = formationY + (small ? 1.2 : 1.75) + Math.sin(t * 0.8) * 0.19 - aim.y * 0.12;
      orb.rotation.x += dt * 0.22;
      orb.rotation.y += dt * 0.31;
      orbOrbit.position.copy(orb.position);
      orbOrbit.rotation.z += dt * 0.12;
      orbOrbit.rotation.y += dt * 0.08;
      orbGlow.position.y = orb.position.y;
      qi.material.uniforms.uTime.value = t;

      animateDragon(t);
      renderer.render(scene, camera);
    };

    const drawStill = () => {
      applyTint(0);
      qi.material.uniforms.uTime.value = 3.6;
      animateDragon(0);
      renderer.render(scene, camera);
    };
    redraw.current = drawStill;

    const onVisibility = () => {
      if (document.hidden) {
        cancelAnimationFrame(raf);
        raf = 0;
      } else if (!raf && !reducedMotion) {
        lastFrame = 0;
        raf = requestAnimationFrame(render);
      }
    };
    if (reducedMotion) drawStill();
    else {
      raf = requestAnimationFrame(render);
      document.addEventListener("visibilitychange", onVisibility);
    }

    return () => {
      cancelAnimationFrame(raf);
      redraw.current = null;
      observer.disconnect();
      window.removeEventListener("resize", resize);
      window.visualViewport?.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onPointerEnd);
      window.removeEventListener("pointercancel", onPointerEnd);
      document.removeEventListener("visibilitychange", onVisibility);
      disposed = true;
      scene.traverse((object) => {
        const renderable = object as THREE.Mesh;
        renderable.geometry?.dispose?.();
        const material = renderable.material as THREE.Material | THREE.Material[] | undefined;
        if (Array.isArray(material)) material.forEach((entry) => entry.dispose());
        else material?.dispose?.();
      });
      textures.forEach((texture) => texture.dispose());
      renderer.dispose();
      if (renderer.domElement.parentElement === el) el.removeChild(renderer.domElement);
    };
  }, []);

  useEffect(() => {
    want.current = { color, light, intensity };
    redraw.current?.();
  }, [color, light, intensity]);

  return <div ref={host} className={className} aria-hidden="true" />;
}
