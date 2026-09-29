# Three.js environment art

These alpha-cutout assets are used as depth layers by `src/components/Scene3DBackdrop.tsx`.
Three.js supplies the perspective, parallax, glow, mist, orbiting seal, and animation; the art
supplies material detail that the previous procedural low-poly geometry could not.

| File | Purpose | Source prompt |
| --- | --- | --- |
| `floating-sanctuary-v1.webp` | Main distant floating sect with pagoda, pines, waterfall, and stone | Single three-quarter floating sanctuary, cinematic realistic 3D game render, transparent background, cool dawn with warm lanterns, no UI/text |
| `jade-dragon-spirit-v1.webp` | Occasional dragon-spirit flyby through the upper sky | Full-body eastern jade-and-gold celestial dragon, S-curve flight pose, cinematic 3D game render, transparent background, no scenery/UI/text |

PNG masters are retained in the Codex generated-images library. Project copies use WebP with alpha
to keep first-load transfer modest while preserving soft cutout edges.
