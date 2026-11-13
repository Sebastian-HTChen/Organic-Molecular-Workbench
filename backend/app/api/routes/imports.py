from fastapi import APIRouter
from rdkit import Chem

from app.schemas.imports import ImportBatchRequest, ImportBatchResponse, ImportFailure
from app.schemas.molecule import MoleculeResponse, StructureSettingsRequest
from app.services.chemistry.errors import ChemistryError
from app.services.chemistry.molecule_io import parse_structure
from app.services.chemistry.validation import validate_spin

router = APIRouter(prefix="/imports", tags=["imports"])


@router.post("", response_model=ImportBatchResponse)
def import_molecules(request: ImportBatchRequest) -> ImportBatchResponse:
    molecules: list[MoleculeResponse] = []
    failures: list[ImportFailure] = []
    for file in request.files:
        try:
            molecules.extend(parse_structure(file.filename, file.content, file.format))
        except ChemistryError as error:
            failures.append(ImportFailure(filename=file.filename, code=error.code, message=error.message))
    return ImportBatchResponse(molecules=molecules, failures=failures)


@router.put("/settings", response_model=MoleculeResponse)
def update_structure_settings(request: StructureSettingsRequest) -> MoleculeResponse:
    molecule = request.molecule
    parsed = Chem.MolFromMolBlock(molecule.mol_block, removeHs=False, sanitize=False)
    if parsed is None:
        raise ChemistryError("invalid_mol_block", "The current molecular structure is invalid.", 422)
    electron_count = sum(atom.GetAtomicNum() + atom.GetTotalNumHs(includeNeighbors=True) for atom in parsed.GetAtoms())
    validate_spin(request.total_charge, request.multiplicity, electron_count)
    if request.topology_confirmed and molecule.bond_count == 0 and molecule.atom_count > 1:
        raise ChemistryError("topology_required", "Add or infer connections before confirming this topology.", 422)
    provenance = molecule.provenance.model_copy(update={
        "total_charge": request.total_charge,
        "multiplicity": request.multiplicity,
        "charge_source": "user",
        "topology_source": "user" if request.topology_confirmed and not molecule.provenance.topology_confirmed else molecule.provenance.topology_source,
        "topology_confirmed": request.topology_confirmed,
        "warnings": [warning for warning in molecule.provenance.warnings if "Verify charge and spin multiplicity" not in warning],
    })
    return molecule.model_copy(update={"provenance": provenance})
