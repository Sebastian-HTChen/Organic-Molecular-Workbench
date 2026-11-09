from fastapi import APIRouter

from app.schemas.molecule import MoleculeFromSmilesRequest, MoleculeResponse
from app.services.chemistry.molecules import generate_from_smiles

router = APIRouter(prefix="/molecules", tags=["molecules"])


@router.post("/from-smiles", response_model=MoleculeResponse, status_code=201)
def create_from_smiles(request: MoleculeFromSmilesRequest) -> MoleculeResponse:
    return generate_from_smiles(request.smiles, request.name)
