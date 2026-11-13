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
  partial_charge?: number | null;
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
  source?: "file" | "inferred" | "user" | "generated";
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
    method: string;
    seed: number | null;
    coordinate_unit: "angstrom";
  };
  mol_block: string;
  mol_block_2d: string;
  provenance: {
    source_format: string;
    filename: string | null;
    input_sha256: string | null;
    topology_source: "file" | "inferred" | "user" | "generated" | "none";
    topology_confirmed: boolean;
    total_charge: number;
    multiplicity: number;
    charge_source: "file" | "inferred" | "user";
    metal_oxidation_states: Record<string, number>;
    metadata: Record<string, string>;
    warnings: string[];
  };
  optimization?: {
    method: "MMFF94" | "UFF";
    energy_before: number;
    energy_after: number;
    energy_unit: "kcal/mol";
    steps: number;
    converged: boolean;
  } | null;
}

export interface HealthStatus {
  status: "ok";
  service: string;
  rdkit_version: string;
}

export type Representation = "ball-stick" | "stick" | "space-filling";
export type ExportFormat = "sdf" | "mol" | "xyz" | "smiles";
