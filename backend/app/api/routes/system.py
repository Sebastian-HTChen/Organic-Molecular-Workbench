from fastapi import APIRouter
from rdkit import __version__ as rdkit_version

from app.schemas.molecule import HealthResponse

router = APIRouter(tags=["system"])


@router.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    return HealthResponse(service="organic-molecular-workbench", rdkit_version=rdkit_version)
