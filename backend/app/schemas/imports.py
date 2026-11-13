from pydantic import BaseModel, Field, field_validator

from app.schemas.molecule import MoleculeResponse


class ImportFileRequest(BaseModel):
    filename: str = Field(min_length=1, max_length=255)
    content: str = Field(min_length=1, max_length=5_000_000)
    format: str | None = None

    @field_validator("filename")
    @classmethod
    def safe_filename(cls, value: str) -> str:
        return value.replace("\\", "/").rsplit("/", 1)[-1]


class ImportBatchRequest(BaseModel):
    files: list[ImportFileRequest] = Field(min_length=1, max_length=50)


class ImportFailure(BaseModel):
    filename: str
    code: str
    message: str


class ImportBatchResponse(BaseModel):
    molecules: list[MoleculeResponse]
    failures: list[ImportFailure]
