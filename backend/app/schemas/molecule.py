from typing import Literal

from pydantic import BaseModel, Field, field_validator


class MoleculeFromSmilesRequest(BaseModel):
    smiles: str = Field(min_length=1, max_length=10_000)
    name: str = Field(default="Untitled molecule", max_length=120)

    @field_validator("smiles")
    @classmethod
    def validate_smiles(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("SMILES must not be blank")
        return value

    @field_validator("name")
    @classmethod
    def normalize_name(cls, value: str) -> str:
        return value.strip() or "Untitled molecule"


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
    position: Vector3


class BondData(BaseModel):
    index: int = Field(ge=1)
    begin_atom: int = Field(ge=1)
    end_atom: int = Field(ge=1)
    order: float = Field(gt=0)
    bond_type: str
    is_aromatic: bool
    is_in_ring: bool


class ConformerData(BaseModel):
    method: Literal["ETKDGv3"] = "ETKDGv3"
    seed: int
    coordinate_unit: Literal["angstrom"] = "angstrom"


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


class HealthResponse(BaseModel):
    status: Literal["ok"] = "ok"
    service: str
    rdkit_version: str
