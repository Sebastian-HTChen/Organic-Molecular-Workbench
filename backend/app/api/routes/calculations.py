from fastapi import APIRouter

from app.schemas.calculation import OrcaInputRequest, OrcaInputResponse
from app.services.calculation.orca import generate_orca_input

router = APIRouter(prefix="/calculations", tags=["calculations"])


@router.post("/orca/input", response_model=OrcaInputResponse)
def create_orca_input(request: OrcaInputRequest) -> OrcaInputResponse:
    return generate_orca_input(request)
