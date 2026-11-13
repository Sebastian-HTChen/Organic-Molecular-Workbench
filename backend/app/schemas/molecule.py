from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field, field_validator


class NamedMoleculeRequest(BaseModel):
    name: str = Field(default="Untitled molecule", max_length=120)

    @field_validator("name")
    @classmethod
    def normalize_name(cls, value: str) -> str:
        return value.strip() or "Untitled molecule"


class MoleculeFromSmilesRequest(NamedMoleculeRequest):
    smiles: str = Field(min_length=1, max_length=10_000)

    @field_validator("smiles")
    @classmethod
    def validate_smiles(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("SMILES must not be blank")
        return value


class MoleculeFromMolRequest(NamedMoleculeRequest):
    mol_block: str = Field(min_length=1, max_length=2_000_000)

    @field_validator("mol_block")
    @classmethod
    def validate_mol_block(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("MOL block must not be blank")
        return value


class Vector3(BaseModel):
    x: float
    y: float
    z: float


class AtomData(BaseModel):
    index: int = Field(ge=1)
    element: str
    atomic_number: int
    isotope: int = Field(ge=0)
    formal_charge: int
    is_aromatic: bool
    partial_charge: float | None = None
    position: Vector3


class BondData(BaseModel):
    index: int = Field(ge=1)
    begin_atom: int = Field(ge=1)
    end_atom: int = Field(ge=1)
    order: float = Field(gt=0)
    bond_type: str
    is_aromatic: bool
    is_in_ring: bool
    source: Literal["file", "inferred", "user", "generated"] = "file"


class ConformerData(BaseModel):
    method: str = "ETKDGv3"
    seed: int | None = None
    coordinate_unit: Literal["angstrom"] = "angstrom"


class OptimizationRequest(NamedMoleculeRequest):
    mol_block: str = Field(min_length=1, max_length=2_000_000)
    method: Literal["MMFF94", "UFF"] = "MMFF94"
    max_iterations: int = Field(default=500, ge=1, le=2000)
    provenance: StructureProvenance | None = None


class OptimizationResult(BaseModel):
    method: Literal["MMFF94", "UFF"]
    energy_before: float
    energy_after: float
    energy_unit: Literal["kcal/mol"] = "kcal/mol"
    steps: int = Field(ge=1)
    converged: bool


class StructureProvenance(BaseModel):
    source_format: str = "SMILES"
    filename: str | None = None
    input_sha256: str | None = None
    topology_source: Literal["file", "inferred", "user", "generated", "none"] = "generated"
    topology_confirmed: bool = True
    total_charge: int = 0
    multiplicity: int = Field(default=1, ge=1, le=10)
    charge_source: Literal["file", "inferred", "user"] = "inferred"
    metal_oxidation_states: dict[str, int] = Field(default_factory=dict)
    metadata: dict[str, str] = Field(default_factory=dict)
    warnings: list[str] = Field(default_factory=list)


class MoleculeResponse(BaseModel):
    id: str
    name: str
    source_smiles: str
    canonical_smiles: str
    formula: str
    molecular_weight: float
    atom_count: int
    bond_count: int
    atoms: list[AtomData]
    bonds: list[BondData]
    conformer: ConformerData
    mol_block: str
    mol_block_2d: str
    optimization: OptimizationResult | None = None
    provenance: StructureProvenance = Field(default_factory=StructureProvenance)


class StructureSettingsRequest(BaseModel):
    molecule: MoleculeResponse
    total_charge: int = Field(ge=-20, le=20)
    multiplicity: int = Field(ge=1, le=10)
    topology_confirmed: bool


class HealthResponse(BaseModel):
    status: Literal["ok"] = "ok"
    service: str
    rdkit_version: str
