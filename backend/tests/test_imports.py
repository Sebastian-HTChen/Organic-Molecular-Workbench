import math

from fastapi.testclient import TestClient
from rdkit import Chem

from app.schemas.molecule import MoleculeResponse
from app.services.chemistry.molecule_io import parse_structure
from app.services.chemistry.molecules import generate_from_smiles


def test_ethanol_xyz_preserves_coordinates_and_marks_inferred_bonds() -> None:
    original = generate_from_smiles("CCO", "Ethanol")
    coordinates = "\n".join(
        f"{atom.element} {atom.position.x} {atom.position.y} {atom.position.z}" for atom in original.atoms
    )
    result = parse_structure("ethanol.xyz", f"9\nEthanol\n{coordinates}\n")[0]

    assert result.formula == "C2H6O"
    assert result.atom_count == 9
    assert result.bond_count == 8
    assert result.provenance.topology_source == "inferred"
    assert not result.provenance.topology_confirmed
    assert all(bond.source == "inferred" for bond in result.bonds)
    assert result.provenance.warnings
    assert result.atoms[0].position.x == original.atoms[0].position.x


def test_mol_and_sdf_keep_file_topology_and_charges() -> None:
    acetate = Chem.MolFromSmiles("CC(=O)[O-]")
    from rdkit.Chem import AllChem
    AllChem.Compute2DCoords(acetate)
    result = parse_structure("acetate.mol", Chem.MolToMolBlock(acetate))[0]

    assert result.provenance.topology_confirmed
    assert result.provenance.total_charge == -1
    assert sum(bond.order == 2 for bond in result.bonds) == 1
    assert all(bond.source == "file" for bond in result.bonds)


def test_multiple_sdf_records_and_batch_failures(client: TestClient) -> None:
    water = generate_from_smiles("O", "Water")
    ethanol = generate_from_smiles("CCO", "Ethanol")
    content = f"{water.mol_block}\n$$$$\n{ethanol.mol_block}\n$$$$\n"
    response = client.post("/api/v1/imports", json={"files": [
        {"filename": "pair.sdf", "content": content},
        {"filename": "broken.xyz", "content": "2\nBad\nC 0 sodium 0\n"},
    ]})

    assert response.status_code == 200
    body = response.json()
    assert len(body["molecules"]) == 2
    assert body["molecules"][0]["atom_count"] == 3
    assert body["failures"][0]["code"] == "invalid_xyz"


def test_invalid_xyz_values_are_rejected() -> None:
    response = parse_structure
    for content in ("1\nBad\nXx 0 0 0\n", "1\nBad\nC 0 NaN 0\n", "2\nBad\nC 0 0 0\n"):
        try:
            response("bad.xyz", content)
        except Exception as error:
            assert getattr(error, "status_code") == 422
        else:
            raise AssertionError("Invalid XYZ should be rejected")


def test_mol2_preserves_connections_and_partial_charge_distinction() -> None:
    content = """@<TRIPOS>MOLECULE
Water
3 2 0 0 0
SMALL
USER_CHARGES
@<TRIPOS>ATOM
1 O 0.0 0.0 0.0 O.3 1 SOL -0.8
2 H1 0.75 0.5 0.0 H 1 SOL 0.4
3 H2 -0.75 0.5 0.0 H 1 SOL 0.4
@<TRIPOS>BOND
1 1 2 1
2 1 3 1
"""
    result = parse_structure("water.mol2", content)[0]

    assert result.bond_count == 2
    assert result.atoms[0].partial_charge == -0.8
    assert result.atoms[0].formal_charge == 0
    assert result.name == "Water"
    assert "MOL2 partial charges and atom types are not formal charges." in " ".join(result.provenance.warnings)


def test_pdb_conect_is_preserved_without_proximity_invention() -> None:
    content = """HETATM    1  C   LIG A   1       0.000   0.000   0.000  1.00  0.00           C
HETATM    2  O   LIG A   1       1.400   0.000   0.000  1.00  0.00           O
CONECT    1    2
END
"""
    result = parse_structure("ligand.pdb", content)[0]

    assert result.atom_count == 2
    assert result.bond_count == 1
    assert result.bonds[0].source == "file"


def test_ion_xyz_requires_topology_review(client: TestClient) -> None:
    response = client.post("/api/v1/imports", json={"files": [{"filename": "sodium.xyz", "content": "1\nNa+\nNa 0 0 0\n"}]})
    molecule = response.json()["molecules"][0]
    assert molecule["provenance"]["topology_confirmed"] is False
    assert molecule["atoms"][0]["element"] == "Na"

    updated = client.put("/api/v1/imports/settings", json={
        "molecule": molecule, "total_charge": 1, "multiplicity": 1, "topology_confirmed": True,
    })
    assert updated.status_code == 200
    assert updated.json()["provenance"]["charge_source"] == "user"
    assert updated.json()["provenance"]["total_charge"] == 1


def test_spin_and_charge_consistency_is_checked(client: TestClient) -> None:
    molecule = generate_from_smiles("CCO", "Ethanol")
    response = client.put("/api/v1/imports/settings", json={
        "molecule": molecule.model_dump(), "total_charge": 0, "multiplicity": 2, "topology_confirmed": True,
    })
    assert response.status_code == 422
    assert response.json()["detail"]["code"] == "invalid_multiplicity"


def test_unsanitized_mol_keeps_file_bonds_without_confirming_chemistry() -> None:
    molecule = Chem.RWMol(Chem.MolFromSmiles("C"))
    center = molecule.GetAtomWithIdx(0)
    center.SetNoImplicit(True)
    for _ in range(5):
        atom = molecule.AddAtom(Chem.Atom(6))
        molecule.AddBond(0, atom, Chem.BondType.SINGLE)
    structure = molecule.GetMol()
    structure.UpdatePropertyCache(strict=False)
    Chem.rdDepictor.Compute2DCoords(structure)

    result = parse_structure("hypervalent.mol", Chem.MolToMolBlock(structure))[0]

    assert result.bond_count == 5
    assert all(bond.source == "file" for bond in result.bonds)
    assert result.provenance.topology_source == "file"
    assert result.provenance.topology_confirmed is False
    assert result.canonical_smiles == ""
    assert any("sanitization failed" in warning for warning in result.provenance.warnings)


def test_extended_xyz_lattice_is_metadata_not_periodic_simulation() -> None:
    result = parse_structure("carbon.extxyz", '1\nLattice="5 0 0 0 5 0 0 0 5" charge=1\nC 0 0 0\n')[0]

    assert result.provenance.metadata["charge"] == "1"
    assert result.provenance.total_charge == 0
    assert any("not used for periodic" in warning for warning in result.provenance.warnings)
    assert any("do not establish chemistry" in warning for warning in result.provenance.warnings)


def test_short_mol2_is_a_structured_import_failure(client: TestClient) -> None:
    response = client.post("/api/v1/imports", json={"files": [{"filename": "broken.mol2", "content": "@<TRIPOS>MOLECULE\nBroken\n"}]})

    assert response.status_code == 200
    assert response.json()["molecules"] == []
    assert response.json()["failures"][0]["code"] == "invalid_mol2"


def test_xyz_rejects_extra_coordinates_and_warns_about_overlap(client: TestClient) -> None:
    overlapping = parse_structure("overlap.xyz", "2\nClose atoms\nC 0 0 0\nC 0.05 0 0\n")[0]
    assert any("overlap" in warning for warning in overlapping.provenance.warnings)

    response = client.post("/api/v1/imports", json={"files": [{"filename": "count.xyz", "content": "1\nMismatch\nC 0 0 0\nH 1 0 0\n"}]})
    assert response.json()["failures"][0]["code"] == "invalid_xyz"


def test_charged_molecule_preserves_charge_in_generated_provenance() -> None:
    result = generate_from_smiles("[Na+]", "Sodium ion")

    assert result.provenance.total_charge == 1
    assert result.provenance.multiplicity == 1
    assert all(bond.source == "generated" for bond in result.bonds)


def test_updating_charge_does_not_relabel_file_topology(client: TestClient) -> None:
    imported = parse_structure("sodium.mol", Chem.MolToMolBlock(Chem.MolFromSmiles("[Na+]")))[0]
    response = client.put("/api/v1/imports/settings", json={
        "molecule": imported.model_dump(), "total_charge": 0, "multiplicity": 2, "topology_confirmed": True,
    })
    assert response.status_code == 200
    assert response.json()["provenance"]["topology_source"] == "file"
    assert response.json()["provenance"]["charge_source"] == "user"


def test_forcefield_optimization_preserves_import_provenance(client: TestClient) -> None:
    imported = generate_from_smiles("CCO", "Ethanol")
    imported.provenance = imported.provenance.model_copy(update={
        "source_format": "XYZ", "filename": "ethanol.xyz", "topology_source": "inferred",
        "topology_confirmed": False, "charge_source": "inferred", "input_sha256": "a" * 64,
        "warnings": ["Bond orders are inferred."],
    })
    response = client.post("/api/v1/molecules/optimize", json={
        "mol_block": imported.mol_block, "name": imported.name, "method": "UFF",
        "max_iterations": 10, "provenance": imported.provenance.model_dump(),
    })

    assert response.status_code == 200
    optimized = MoleculeResponse.model_validate(response.json())
    assert optimized.conformer.method == "UFF optimized"
    assert optimized.provenance.filename == "ethanol.xyz"
    assert optimized.provenance.input_sha256 == "a" * 64
    assert optimized.provenance.topology_source == "inferred"
    assert optimized.provenance.topology_confirmed is False
    assert all(bond.source == "inferred" for bond in optimized.bonds)
    assert optimized.provenance.warnings == ["Bond orders are inferred."]
