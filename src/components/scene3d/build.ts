import * as THREE from "three";

/** Stable random values keep particle placement calm between visits and renders. */
export function rng(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = Math.imul(state ^ (state >>> 15), 1 | state);
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

/** Soft light used around the jade orb. */
export function glowTexture(): THREE.CanvasTexture {
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const context = canvas.getContext("2d");
  if (context) {
    const gradient = context.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    gradient.addColorStop(0, "rgba(255,255,255,0.92)");
    gradient.addColorStop(0.18, "rgba(255,255,255,0.38)");
    gradient.addColorStop(1, "rgba(255,255,255,0)");
    context.fillStyle = gradient;
    context.fillRect(0, 0, size, size);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/** A polished, finely tessellated torus for the spinning cultivation formation. */
export function formationRingGeometry(
  radius: number,
  tube: number,
  segments = 112,
): THREE.TorusGeometry {
  if (!Number.isFinite(radius) || !Number.isFinite(tube) || radius <= 0 || tube <= 0 || tube >= radius) {
    throw new RangeError("Formation ring radius and tube must be positive, with tube smaller than radius.");
  }
  const radialSegments = Math.max(6, Math.round(segments));
  return new THREE.TorusGeometry(radius, tube, 10, radialSegments);
}

/** Camera-facing ink for the orbiting 3D seal: thin jade/gold runes stay legible on phone skies. */
export function formationSealTexture(): THREE.CanvasTexture {
  const size = 512;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const context = canvas.getContext("2d");
  if (context) {
    const center = size / 2;
    const gold = "#ffdf91";
    const jade = "#9dffe7";
    const strokeRing = (radius: number, color: string, width: number, alpha: number) => {
      context.beginPath();
      context.arc(center, center, radius, 0, Math.PI * 2);
      context.strokeStyle = color;
      context.lineWidth = width;
      context.globalAlpha = alpha;
      context.stroke();
    };
    context.save();
    context.shadowBlur = 11;
    context.shadowColor = gold;
    strokeRing(157, gold, 2.2, 0.78);
    strokeRing(184, jade, 1.4, 0.58);
    strokeRing(205, gold, 0.9, 0.38);
    context.shadowBlur = 5;
    context.setLineDash([8, 11]);
    strokeRing(170, jade, 2, 0.82);
    context.setLineDash([]);
    for (let i = 0; i < 24; i++) {
      const angle = (i / 24) * Math.PI * 2;
      const inner = i % 3 === 0 ? 176 : 181;
      const outer = i % 3 === 0 ? 201 : 194;
      context.beginPath();
      context.moveTo(center + Math.cos(angle) * inner, center + Math.sin(angle) * inner);
      context.lineTo(center + Math.cos(angle) * outer, center + Math.sin(angle) * outer);
      context.strokeStyle = i % 3 === 0 ? gold : jade;
      context.lineWidth = i % 3 === 0 ? 2 : 1;
      context.globalAlpha = i % 3 === 0 ? 0.8 : 0.38;
      context.stroke();
      if (i % 3 === 0) {
        context.beginPath();
        context.arc(center + Math.cos(angle) * 157, center + Math.sin(angle) * 157, 3, 0, Math.PI * 2);
        context.fillStyle = gold;
        context.globalAlpha = 0.9;
        context.fill();
      }
    }
    context.restore();
    context.globalAlpha = 1;
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export interface QiField {
  points: THREE.Points<THREE.BufferGeometry, THREE.ShaderMaterial>;
  material: THREE.ShaderMaterial;
}

/** Upward-flowing, gently twinkling qi, animated on the GPU to stay light on mobile. */
export function qiField(
  count: number,
  spanX: number,
  spanY: number,
  depth: number,
  seed = 3,
): QiField {
  const random = rng(seed);
  const positions = new Float32Array(count * 3);
  const seeds = new Float32Array(count);
  const sizes = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    positions[i * 3] = (random() - 0.5) * spanX;
    positions[i * 3 + 1] = (random() - 0.5) * spanY;
    positions[i * 3 + 2] = -5 - random() * depth;
    seeds[i] = random() * 100;
    sizes[i] = 1 + random() * 2.2;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 1));
  geometry.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));
  const material = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uTime: { value: 0 },
      uColor: { value: new THREE.Color("#ffffff") },
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
        float rise = 0.25 + fract(aSeed) * 0.4;
        float y = mod(p.y + uSpanY * 0.5 + uTime * rise, uSpanY);
        float t = uTime * 0.45 + aSeed;
        p.x += sin(t * 0.7) * 1.1;
        p.z += cos(t * 0.45) * 0.8;
        p.y = y - uSpanY * 0.5;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = aSize * uScale * (30.0 / max(1.0, -mv.z));
        float h = y / uSpanY;
        float edge = smoothstep(0.0, 0.17, h) * (1.0 - smoothstep(0.76, 1.0, h));
        float twinkle = 0.55 + 0.45 * sin(uTime * 1.5 + aSeed * 6.2831);
        vFade = edge * twinkle;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      uniform float uOpacity;
      varying float vFade;
      void main() {
        vec2 d = gl_PointCoord - vec2(0.5);
        float r = dot(d, d);
        if (r > 0.25) discard;
        float core = 1.0 - r * 4.0;
        gl_FragColor = vec4(uColor, core * core * vFade * uOpacity);
      }
    `,
  });
  return { points: new THREE.Points(geometry, material), material };
}
