import type { AtomData, BondData, Molecule } from "./types";

export interface Neighbor {
  atom: AtomData;
  bond: BondData;
}

export function getNeighbors(molecule: Molecule, atomIndex: number): Neighbor[] {
  return molecule.bonds.flatMap((bond) => {
    let neighborIndex: number | null = null;
    if (bond.begin_atom === atomIndex) neighborIndex = bond.end_atom;
    if (bond.end_atom === atomIndex) neighborIndex = bond.begin_atom;
    if (neighborIndex === null) return [];
    const atom = molecule.atoms[neighborIndex - 1];
    return atom ? [{ atom, bond }] : [];
  });
}

export function getBondBetween(
  molecule: Molecule,
  first: number,
  second: number,
): BondData | undefined {
  return molecule.bonds.find(
    (bond) =>
      (bond.begin_atom === first && bond.end_atom === second) ||
      (bond.begin_atom === second && bond.end_atom === first),
  );
}

export function toggleSelection(selection: number[], atomIndex: number): number[] {
  if (selection.includes(atomIndex)) {
    return selection.filter((index) => index !== atomIndex);
  }
  return selection.length >= 4 ? [...selection.slice(1), atomIndex] : [...selection, atomIndex];
}
