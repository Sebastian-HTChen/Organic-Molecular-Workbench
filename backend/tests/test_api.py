from fastapi.testclient import TestClient


def test_health_reports_real_rdkit_version(client: TestClient) -> None:
    response = client.get("/api/v1/health")

    assert response.status_code == 200
    assert response.json()["status"] == "ok"
    assert response.json()["rdkit_version"].startswith("2026.")


def test_smiles_endpoint_returns_molecule(client: TestClient) -> None:
    response = client.post(
        "/api/v1/molecules/from-smiles",
        json={"smiles": " CCO ", "name": " Ethanol "},
    )

    assert response.status_code == 201
    body = response.json()
    assert body["name"] == "Ethanol"
    assert body["source_smiles"] == "CCO"
    assert body["atom_count"] == len(body["atoms"]) == 9
    assert body["bond_count"] == len(body["bonds"]) == 8
    assert body["conformer"]["coordinate_unit"] == "angstrom"


def test_invalid_smiles_returns_structured_error(client: TestClient) -> None:
    response = client.post(
        "/api/v1/molecules/from-smiles",
        json={"smiles": "C1CC", "name": "Broken"},
    )

    assert response.status_code == 422
    assert response.json()["detail"]["code"] == "invalid_smiles"
    assert "RDKit" in response.json()["detail"]["message"]


def test_blank_smiles_is_rejected_by_request_validation(client: TestClient) -> None:
    response = client.post(
        "/api/v1/molecules/from-smiles",
        json={"smiles": "   ", "name": "Blank"},
    )

    assert response.status_code == 422
