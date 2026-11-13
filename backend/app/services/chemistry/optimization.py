from rdkit import Chem
from rdkit.Chem import AllChem

from app.schemas.molecule import OptimizationRequest, OptimizationResult, MoleculeResponse
from app.services.chemistry.errors import ChemistryError
from app.services.chemistry.molecules import molecule_response


def optimize_geometry(request: OptimizationRequest) -> MoleculeResponse:
    try:
        molecule = Chem.MolFromMolBlock(request.mol_block, removeHs=False, sanitize=True)
    except ValueError:
        molecule = None
    if molecule is None or molecule.GetNumAtoms() == 0:
        raise ChemistryError("invalid_mol_block", "A valid molecular structure is required.", 422)
    if molecule.GetNumConformers() == 0 or not molecule.GetConformer().Is3D():
        raise ChemistryError("missing_3d_coordinates", "Optimization requires 3D coordinates.", 422)

    if request.method == "MMFF94":
        if not AllChem.MMFFHasAllMoleculeParams(molecule):
            raise ChemistryError(
                "forcefield_unsupported",
                "MMFF94 parameters are unavailable for this structure. Try UFF or check atom types and charges.",
                422,
            )
        properties = AllChem.MMFFGetMoleculeProperties(molecule, mmffVariant="MMFF94")
        force_field = AllChem.MMFFGetMoleculeForceField(molecule, properties)
    else:
        if not AllChem.UFFHasAllMoleculeParams(molecule):
            raise ChemistryError(
                "forcefield_unsupported",
                "UFF parameters are unavailable for one or more elements in this structure.",
                422,
            )
        force_field = AllChem.UFFGetMoleculeForceField(molecule)

    force_field.Initialize()
    energy_before = force_field.CalcEnergy()
    converged = False
    steps = 0
    for steps in range(1, request.max_iterations + 1):
        status = force_field.Minimize(maxIts=1, forceTol=1.0e-4, energyTol=1.0e-6)
        if status == 0:
            converged = True
            break
    energy_after = force_field.CalcEnergy()
    result = OptimizationResult(
        method=request.method,
        energy_before=energy_before,
        energy_after=energy_after,
        steps=steps,
        converged=converged,
    )
    return molecule_response(molecule, request.name, result, provenance=request.provenance)
