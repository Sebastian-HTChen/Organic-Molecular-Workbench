from fastapi import APIRouter

from app.schemas.molecule import (
    MoleculeFromMolRequest,
    MoleculeFromSmilesRequest,
    MoleculeResponse,
    OptimizationRequest,
)
from app.services.chemistry.molecules import generate_from_mol_block, generate_from_smiles
from app.services.chemistry.optimization import optimize_geometry

router = APIRouter(prefix="/molecules", tags=["molecules"])


@router.post("/from-smiles", response_model=MoleculeResponse, status_code=201)
def create_from_smiles(request: MoleculeFromSmilesRequest) -> MoleculeResponse:
    return generate_from_smiles(request.smiles, request.name)


@router.post("/from-mol", response_model=MoleculeResponse, status_code=201)
def create_from_mol(request: MoleculeFromMolRequest) -> MoleculeResponse:
    return generate_from_mol_block(request.mol_block, request.name)


@router.post("/optimize", response_model=MoleculeResponse)
def optimize_molecule(request: OptimizationRequest) -> MoleculeResponse:
    return optimize_geometry(request)
