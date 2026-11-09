import math

import pytest

from app.services.chemistry.errors import ChemistryError
from app.services.chemistry.molecules import generate_from_smiles


def test_ethanol_has_explicit_hydrogens_and_real_coordinates() -> None:
    molecule = generate_from_smiles("CCO", "Ethanol")

    assert molecule.canonical_smiles == "CCO"
    assert molecule.formula == "C2H6O"
    assert molecule.molecular_weight == pytest.approx(46.069, abs=0.001)
    assert molecule.atom_count == 9
    assert molecule.bond_count == 8
    assert sum(atom.element == "H" for atom in molecule.atoms) == 6
    assert all(
        math.isfinite(value)
        for atom in molecule.atoms
        for value in (atom.position.x, atom.position.y, atom.position.z)
    )
    assert any(abs(atom.position.z) > 0.01 for atom in molecule.atoms)
    assert "V2000" in molecule.mol_block
    assert molecule.conformer.method == "ETKDGv3"

    carbon_carbon = next(
        bond
        for bond in molecule.bonds
        if molecule.atoms[bond.begin_atom - 1].element == "C"
        and molecule.atoms[bond.end_atom - 1].element == "C"
    )
    first = molecule.atoms[carbon_carbon.begin_atom - 1].position
    second = molecule.atoms[carbon_carbon.end_atom - 1].position
    distance = math.dist((first.x, first.y, first.z), (second.x, second.y, second.z))
    assert 1.2 < distance < 1.8


def test_benzene_retains_aromaticity_and_ring_flags() -> None:
    molecule = generate_from_smiles("c1ccccc1", "Benzene")

    assert molecule.formula == "C6H6"
    assert molecule.atom_count == 12
    aromatic_bonds = [bond for bond in molecule.bonds if bond.is_aromatic]
    assert len(aromatic_bonds) == 6
    assert all(bond.order == 1.5 and bond.is_in_ring for bond in aromatic_bonds)
    assert all(atom.is_aromatic for atom in molecule.atoms if atom.element == "C")


def test_acetic_acid_retains_double_bond() -> None:
    molecule = generate_from_smiles("CC(=O)O", "Acetic acid")

    assert molecule.formula == "C2H4O2"
    assert sum(bond.order == 2 for bond in molecule.bonds) == 1


def test_formal_charge_is_preserved() -> None:
    molecule = generate_from_smiles("CC(=O)[O-]", "Acetate")

    assert sum(atom.formal_charge for atom in molecule.atoms) == -1
    assert sum(atom.element == "O" and atom.formal_charge == -1 for atom in molecule.atoms) == 1


def test_conformer_generation_is_deterministic() -> None:
    first = generate_from_smiles("CCO", "Ethanol")
    second = generate_from_smiles("CCO", "Ethanol")

    assert [atom.position for atom in first.atoms] == [atom.position for atom in second.atoms]


@pytest.mark.parametrize("smiles", ["not-a-smiles", "C(F)(F)(F)(F)F"])
def test_invalid_chemistry_is_rejected(smiles: str) -> None:
    with pytest.raises(ChemistryError) as error:
        generate_from_smiles(smiles, "Invalid")

    assert error.value.code == "invalid_smiles"
