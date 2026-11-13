import math

from rdkit import Chem

from app.services.chemistry.errors import ChemistryError


def validate_molecule(molecule: Chem.Mol) -> list[str]:
    warnings: list[str] = []
    if molecule.GetNumAtoms() == 0:
        raise ChemistryError("empty_structure", "The file does not contain any atoms.", 422)
    if molecule.GetNumConformers() == 0:
        raise ChemistryError("missing_coordinates", "The file does not contain a coordinate set.", 422)
    conformer = molecule.GetConformer()
    for atom in molecule.GetAtoms():
        if atom.GetAtomicNum() <= 0:
            raise ChemistryError("invalid_element", f"Atom {atom.GetIdx() + 1} has an invalid element symbol.", 422)
        position = conformer.GetAtomPosition(atom.GetIdx())
        if not all(math.isfinite(value) for value in (position.x, position.y, position.z)):
            raise ChemistryError("invalid_coordinates", f"Atom {atom.GetIdx() + 1} has invalid coordinates.", 422)

    overlaps = []
    for first in range(molecule.GetNumAtoms()):
        for second in range(first + 1, molecule.GetNumAtoms()):
            if conformer.GetAtomPosition(first).Distance(conformer.GetAtomPosition(second)) < 0.1:
                overlaps.append(f"{first + 1}/{second + 1}")
    if overlaps:
        warnings.append("Possible atomic overlap (< 0.1 Å): " + ", ".join(overlaps[:20]))
    fragments = Chem.GetMolFrags(molecule)
    if len(fragments) > 1:
        warnings.append(f"The structure contains {len(fragments)} disconnected fragments. Review their bonding and charges.")
    return warnings


def validate_spin(charge: int, multiplicity: int, electron_count: int) -> None:
    electrons = electron_count - charge
    if electrons < 0:
        raise ChemistryError("invalid_charge", "Total charge implies a negative number of electrons.", 422)
    if electrons % 2 == 0 and multiplicity % 2 == 0:
        raise ChemistryError("invalid_multiplicity", "An even electron count requires an odd spin multiplicity.", 422)
    if electrons % 2 == 1 and multiplicity % 2 == 1:
        raise ChemistryError("invalid_multiplicity", "An odd electron count requires an even spin multiplicity.", 422)
