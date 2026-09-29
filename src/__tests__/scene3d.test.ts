import { describe, expect, it } from "vitest";
import {
  formationRingGeometry,
  qiField,
  rng,
} from "../components/scene3d/build";

describe("rng", () => {
  it("returns a repeatable sequence for the same seed", () => {
    const first = rng(42);
    const second = rng(42);
    expect([first(), first(), first()]).toEqual([second(), second(), second()]);
  });

  it("keeps its values inside [0, 1)", () => {
    const random = rng(7);
    for (let i = 0; i < 500; i++) {
      const value = random();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });
});

describe("formationRingGeometry", () => {
  it("builds a smooth closed ring with normals for the PBR material", () => {
    const geometry = formationRingGeometry(2.35, 0.023, 112);
    expect(geometry.attributes.position.count).toBeGreaterThan(1000);
    expect(geometry.attributes.normal.count).toBe(geometry.attributes.position.count);
    expect(Array.from(geometry.attributes.position.array).every(Number.isFinite)).toBe(true);
    geometry.dispose();
  });

  it("rejects tube dimensions that cannot form a ring", () => {
    expect(() => formationRingGeometry(0, 0.1)).toThrow(RangeError);
    expect(() => formationRingGeometry(1, 1)).toThrow(RangeError);
  });
});

describe("qiField", () => {
  it("creates a seed and size for each GPU-driven particle", () => {
    const field = qiField(50, 40, 20, 10);
    expect(field.points.geometry.attributes.position.count).toBe(50);
    expect(field.points.geometry.attributes.aSeed.count).toBe(50);
    expect(field.points.geometry.attributes.aSize.count).toBe(50);
    expect(field.material.uniforms.uSpanY.value).toBe(20);
    for (const key of ["uTime", "uColor", "uOpacity", "uScale", "uSpanY"]) {
      expect(field.material.uniforms[key]).toBeDefined();
    }
    field.points.geometry.dispose();
    field.material.dispose();
  });
});
