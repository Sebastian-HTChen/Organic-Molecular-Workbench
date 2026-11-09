import { describe, expect, it } from "vitest";

import { bondAngle, dihedralAngle, distance } from "./geometry";
import type { Vector3 } from "./types";

const point = (x: number, y: number, z: number): Vector3 => ({ x, y, z });

describe("molecular geometry", () => {
  it("measures distance in angstrom", () => {
    expect(distance(point(0, 0, 0), point(1, 2, 2))).toBe(3);
  });

  it("measures a bond angle with the second atom as vertex", () => {
    expect(bondAngle(point(1, 0, 0), point(0, 0, 0), point(0, 2, 0))).toBe(90);
    expect(bondAngle(point(1, 0, 0), point(0, 0, 0), point(-1, 0, 0))).toBe(180);
  });

  it("distinguishes cis and trans planar dihedrals", () => {
    const a = point(1, 0, 0);
    const b = point(0, 0, 0);
    const c = point(0, 1, 0);
    expect(dihedralAngle(a, b, c, point(1, 1, 0))).toBeCloseTo(0);
    expect(Math.abs(dihedralAngle(a, b, c, point(-1, 1, 0)) ?? 0)).toBeCloseTo(180);
  });

  it("measures a non-planar signed dihedral", () => {
    expect(
      dihedralAngle(point(1, 0, 0), point(0, 0, 0), point(0, 1, 0), point(1, 1, 1)),
    ).toBeCloseTo(45);
  });

  it("rejects undefined angles instead of displaying NaN", () => {
    expect(bondAngle(point(0, 0, 0), point(0, 0, 0), point(1, 0, 0))).toBeNull();
    expect(
      dihedralAngle(point(0, 0, 0), point(0, 0, 0), point(0, 0, 0), point(1, 1, 1)),
    ).toBeNull();
  });
});
