import type { Vector3 } from "./types";

const EPSILON = 1e-10;

function subtract(a: Vector3, b: Vector3): Vector3 {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}

function dot(a: Vector3, b: Vector3): number {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

function cross(a: Vector3, b: Vector3): Vector3 {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
  };
}

function norm(vector: Vector3): number {
  return Math.sqrt(dot(vector, vector));
}

function normalize(vector: Vector3): Vector3 | null {
  const length = norm(vector);
  if (length < EPSILON) return null;
  return { x: vector.x / length, y: vector.y / length, z: vector.z / length };
}

export function distance(a: Vector3, b: Vector3): number {
  return norm(subtract(a, b));
}

export function bondAngle(a: Vector3, vertex: Vector3, c: Vector3): number | null {
  const first = normalize(subtract(a, vertex));
  const second = normalize(subtract(c, vertex));
  if (!first || !second) return null;
  const cosine = Math.max(-1, Math.min(1, dot(first, second)));
  return (Math.acos(cosine) * 180) / Math.PI;
}

export function dihedralAngle(
  a: Vector3,
  b: Vector3,
  c: Vector3,
  d: Vector3,
): number | null {
  const firstBond = subtract(a, b);
  const centralBond = normalize(subtract(c, b));
  const lastBond = subtract(d, c);
  if (!centralBond) return null;

  const firstProjection = {
    x: firstBond.x - dot(firstBond, centralBond) * centralBond.x,
    y: firstBond.y - dot(firstBond, centralBond) * centralBond.y,
    z: firstBond.z - dot(firstBond, centralBond) * centralBond.z,
  };
  const lastProjection = {
    x: lastBond.x - dot(lastBond, centralBond) * centralBond.x,
    y: lastBond.y - dot(lastBond, centralBond) * centralBond.y,
    z: lastBond.z - dot(lastBond, centralBond) * centralBond.z,
  };
  const first = normalize(firstProjection);
  const last = normalize(lastProjection);
  if (!first || !last) return null;

  const x = dot(first, last);
  const y = dot(cross(centralBond, first), last);
  return (-Math.atan2(y, x) * 180) / Math.PI;
}
