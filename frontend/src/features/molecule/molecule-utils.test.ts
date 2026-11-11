import { describe, expect, it } from "vitest";

import { serializeMolecule, serializeXyz } from "./export";
import { getBondBetween, getNeighbors, toggleSelection } from "./molecule-utils";
import type { Molecule } from "./types";

const molecule = {
  id: "test",
  name: "Water",
  source_smiles: "O",
  canonical_smiles: "O",
  formula: "H2O",
  molecular_weight: 18.015,
  atom_count: 3,
  bond_count: 2,
  atoms: [
    { index: 1, element: "O", position: { x: 0, y: 0, z: 0 } },
    { index: 2, element: "H", position: { x: 0.7, y: 0.6, z: 0 } },
    { index: 3, element: "H", position: { x: -0.7, y: 0.6, z: 0 } },
  ],
  bonds: [
    { index: 1, begin_atom: 1, end_atom: 2, order: 1, is_in_ring: false },
    { index: 2, begin_atom: 1, end_atom: 3, order: 1, is_in_ring: false },
  ],
  conformer: { method: "ETKDGv3", seed: 42, coordinate_unit: "angstrom" },
  mol_block: "Water\n  RDKit\n",
  mol_block_2d: "Water\n  RDKit\n",
} as Molecule;

describe("molecule utilities", () => {
  it("finds neighbors and the connecting bond", () => {
    expect(getNeighbors(molecule, 1).map(({ atom }) => atom.index)).toEqual([2, 3]);
    expect(getBondBetween(molecule, 2, 1)?.index).toBe(1);
    expect(getBondBetween(molecule, 2, 3)).toBeUndefined();
  });

  it("keeps at most four ordered atom selections", () => {
    expect(toggleSelection([1, 2, 3, 4], 5)).toEqual([2, 3, 4, 5]);
    expect(toggleSelection([1, 2, 3], 2)).toEqual([1, 3]);
  });

  it("exports XYZ with explicit topology limitation", () => {
    const lines = serializeXyz(molecule).split("\n");
    expect(lines[0]).toBe("3");
    expect(lines[1]).toContain("no bond-order topology");
    expect(lines).toHaveLength(6);
  });

  it("writes a valid SDF record terminator", () => {
    expect(serializeMolecule(molecule, "sdf").endsWith("\n$$$$\n")).toBe(true);
    expect(serializeMolecule(molecule, "smiles")).toBe("O\n");
  });
});
