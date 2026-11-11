from typing import Literal

from pydantic import BaseModel, Field, field_validator


class OrcaInputRequest(BaseModel):
    name: str = Field(default="molecule", max_length=120)
    mol_block: str = Field(min_length=1, max_length=2_000_000)
    functional: Literal["B3LYP", "PBE0", "PBE", "TPSS", "M06-2X", "wB97X-D3"]
    basis_set: Literal["def2-SVP", "def2-TZVP", "def2-TZVPP", "def2-QZVP", "6-31G(d)", "6-311+G(d,p)"]
    task: Literal["single_point", "optimization", "frequency", "opt_freq"] = "single_point"
    charge: int = Field(default=0, ge=-20, le=20)
    multiplicity: int = Field(default=1, ge=1, le=10)
    nprocs: int = Field(default=4, ge=1, le=64)
    maxcore_mb: int = Field(default=2000, ge=256, le=65536)

    @field_validator("mol_block")
    @classmethod
    def validate_mol_block(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("MOL block must not be blank")
        return value


class OrcaInputResponse(BaseModel):
    input_text: str
    filename: str
    provider: Literal["ORCA"] = "ORCA"
    execution: Literal["not_submitted"] = "not_submitted"
