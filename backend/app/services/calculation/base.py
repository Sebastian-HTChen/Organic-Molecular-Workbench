from abc import ABC, abstractmethod
from dataclasses import dataclass
from enum import StrEnum


class CalculationTask(StrEnum):
    GEOMETRY_OPTIMIZATION = "geometry_optimization"
    FREQUENCY = "frequency"
    SINGLE_POINT = "single_point"
    GIBBS_FREE_ENERGY = "gibbs_free_energy"


@dataclass(frozen=True)
class CalculationRequest:
    task: CalculationTask
    mol_block: str
    method: str
    basis_set: str | None = None
    charge: int = 0
    multiplicity: int = 1


@dataclass(frozen=True)
class CalculationJob:
    external_id: str
    provider: str
    task: CalculationTask


class CalculationProvider(ABC):
    @abstractmethod
    def supported_tasks(self) -> set[CalculationTask]:
        raise NotImplementedError

    @abstractmethod
    def submit(self, request: CalculationRequest) -> CalculationJob:
        raise NotImplementedError
