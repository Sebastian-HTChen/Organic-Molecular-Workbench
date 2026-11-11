from fastapi.testclient import TestClient

from app.schemas.molecule import OptimizationRequest
from app.services.chemistry.molecules import generate_from_smiles
from app.services.chemistry.optimization import optimize_geometry


def optimization_request(method: str) -> OptimizationRequest:
    molecule = generate_from_smiles("CCO", "Ethanol")
    return OptimizationRequest(mol_block=molecule.mol_block, name=molecule.name, method=method)


def test_mmff94_returns_real_energies_steps_and_convergence() -> None:
    result = optimize_geometry(optimization_request("MMFF94"))
    optimization = result.optimization

    assert optimization is not None
    assert optimization.converged
    assert optimization.energy_after < optimization.energy_before
    assert optimization.steps >= 1
    assert optimization.energy_unit == "kcal/mol"
    assert result.atom_count == 9
    assert result.mol_block_2d


def test_uff_optimizes_the_same_structure() -> None:
    result = optimize_geometry(optimization_request("UFF"))

    assert result.optimization is not None
    assert result.optimization.method == "UFF"
    assert result.optimization.energy_after <= result.optimization.energy_before


def test_optimization_endpoint_returns_updated_coordinates(client: TestClient) -> None:
    request = optimization_request("MMFF94")
    response = client.post("/api/v1/molecules/optimize", json=request.model_dump())

    assert response.status_code == 200
    body = response.json()
    assert body["optimization"]["converged"] is True
    assert body["optimization"]["energy_after"] < body["optimization"]["energy_before"]


def test_invalid_molecule_is_rejected(client: TestClient) -> None:
    response = client.post(
        "/api/v1/molecules/optimize",
        json={"mol_block": "not a molfile", "name": "Broken", "method": "MMFF94"},
    )

    assert response.status_code == 422
    assert response.json()["detail"]["code"] == "invalid_mol_block"
