export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export interface AtomData {
  index: number;
  element: string;
  atomic_number: number;
  isotope: number;
  formal_charge: number;
  is_aromatic: boolean;
  position: Vector3;
}

export interface BondData {
  index: number;
  begin_atom: number;
  end_atom: number;
  order: number;
  bond_type: string;
  is_aromatic: boolean;
  is_in_ring: boolean;
}

export interface Molecule {
  id: string;
  name: string;
  source_smiles: string;
  canonical_smiles: string;
  formula: string;
  molecular_weight: number;
  atom_count: number;
  bond_count: number;
  atoms: AtomData[];
  bonds: BondData[];
  conformer: {
    method: "ETKDGv3";
    seed: number;
    coordinate_unit: "angstrom";
  };
  mol_block: string;
}

export interface HealthStatus {
  status: "ok";
  service: string;
  rdkit_version: string;
}

export type Representation = "ball-stick" | "stick" | "space-filling";
export type ExportFormat = "sdf" | "mol" | "xyz" | "smiles";
