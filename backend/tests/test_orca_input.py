import pytest
from fastapi.testclient import TestClient
from rdkit import Chem
from rdkit.Chem import AllChem

from app.schemas.calculation import OrcaInputRequest
from app.services.calculation.orca import generate_orca_input


def ethanol_block() -> str:
    molecule = Chem.AddHs(Chem.MolFromSmiles("CCO"))
    AllChem.EmbedMolecule(molecule, randomSeed=42)
    return Chem.MolToMolBlock(molecule)


def request(**overrides) -> OrcaInputRequest:
    values = {
        "name": "Ethanol",
        "mol_block": ethanol_block(),
        "functional": "B3LYP",
        "basis_set": "def2-SVP",
        "task": "opt_freq",
    }
    values.update(overrides)
    return OrcaInputRequest(**values)


def test_orca_input_contains_real_coordinates_and_opt_freq() -> None:
    result = generate_orca_input(request())

    assert "! B3LYP def2-SVP Opt Freq TightSCF" in result.input_text
    assert "* xyz 0 1" in result.input_text
    assert result.input_text.count("\n  C ") == 2
    assert result.input_text.count("\n  O ") == 1
    assert result.input_text.count("\n  H ") == 6
    assert result.filename == "Ethanol_opt_freq.inp"
    assert result.execution == "not_submitted"


def test_orca_input_honors_charge_multiplicity_and_resources() -> None:
    text = generate_orca_input(
        request(functional="PBE0", basis_set="def2-TZVP", task="single_point", charge=-1, multiplicity=2, nprocs=8, maxcore_mb=4000)
    ).input_text

    assert "! PBE0 def2-TZVP SP TightSCF" in text
    assert "%pal nprocs 8 end" in text
    assert "%maxcore 4000" in text
    assert "* xyz -1 2" in text


def test_orca_endpoint_returns_downloadable_input(client: TestClient) -> None:
    response = client.post("/api/v1/calculations/orca/input", json=request().model_dump())

    assert response.status_code == 200
    assert response.json()["provider"] == "ORCA"
    assert response.json()["input_text"].endswith("*\n")


def test_unsupported_functional_is_rejected(client: TestClient) -> None:
    response = client.post(
        "/api/v1/calculations/orca/input",
        json=request().model_dump() | {"functional": "FAKE-DFT"},
    )

    assert response.status_code == 422


def test_non_3d_coordinates_are_rejected() -> None:
    molecule = Chem.MolFromSmiles("CCO")
    AllChem.Compute2DCoords(molecule)

    from app.services.chemistry.errors import ChemistryError
    with pytest.raises(ChemistryError) as error:
        generate_orca_input(request(mol_block=Chem.MolToMolBlock(molecule)))

    assert error.value.code == "missing_3d_coordinates"
