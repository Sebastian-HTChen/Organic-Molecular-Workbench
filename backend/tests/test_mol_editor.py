import pytest
from fastapi.testclient import TestClient
from rdkit import Chem
from rdkit.Chem import AllChem

from app.services.chemistry.errors import ChemistryError
from app.services.chemistry.molecules import generate_from_mol_block


def mol_block(smiles: str) -> str:
    molecule = Chem.MolFromSmiles(smiles)
    AllChem.Compute2DCoords(molecule)
    return Chem.MolToMolBlock(molecule)


def test_editor_mol_generates_3d_and_separate_2d_coordinates() -> None:
    molecule = generate_from_mol_block(mol_block("CCCl"), "Chloroethane")

    assert molecule.canonical_smiles == "CCCl"
    assert molecule.formula == "C2H5Cl"
    assert molecule.atom_count == 8
    assert any(atom.element == "Cl" for atom in molecule.atoms)
    assert Chem.MolFromMolBlock(molecule.mol_block, removeHs=False).GetConformer().Is3D()
    assert not Chem.MolFromMolBlock(molecule.mol_block_2d).GetConformer().Is3D()


def test_editor_preserves_bond_orders_and_formal_charges() -> None:
    molecule = generate_from_mol_block(mol_block("CC(=O)[O-]"), "Acetate")

    assert sum(bond.order == 2 for bond in molecule.bonds) == 1
    assert sum(atom.formal_charge for atom in molecule.atoms) == -1


def test_mol_endpoint_accepts_real_2d_editor_input(client: TestClient) -> None:
    block = mol_block("CCN")
    response = client.post(
        "/api/v1/molecules/from-mol",
        json={"mol_block": block, "name": "Ethylamine"},
    )

    assert response.status_code == 201
    from app.schemas.molecule import MoleculeFromMolRequest
    assert MoleculeFromMolRequest(mol_block=block).mol_block == block
    body = response.json()
    assert body["canonical_smiles"] == "CCN"
    assert body["formula"] == "C2H7N"
    assert body["mol_block_2d"]


def test_invalid_mol_returns_structured_error(client: TestClient) -> None:
    response = client.post(
        "/api/v1/molecules/from-mol",
        json={"mol_block": "not a molfile", "name": "Broken"},
    )

    assert response.status_code == 422
    assert response.json()["detail"]["code"] == "invalid_mol_block"


def test_empty_editor_is_rejected() -> None:
    empty = Chem.MolToMolBlock(Chem.RWMol())
    with pytest.raises(ChemistryError) as error:
        generate_from_mol_block(empty, "Empty")

    assert error.value.code == "empty_molecule"
