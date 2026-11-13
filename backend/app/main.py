from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.routes import calculations, imports, molecules, system
from app.services.chemistry.errors import ChemistryError

app = FastAPI(
    title="Organic Molecular Workbench API",
    version="0.1.0",
    description="RDKit-backed molecular modeling services. No DFT or HPC provider is configured.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://127.0.0.1:5173", "http://localhost:5173"],
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)

app.include_router(system.router, prefix="/api/v1")
app.include_router(molecules.router, prefix="/api/v1")
app.include_router(calculations.router, prefix="/api/v1")
app.include_router(imports.router, prefix="/api/v1")


@app.exception_handler(ChemistryError)
def handle_chemistry_error(_request: Request, error: ChemistryError) -> JSONResponse:
    return JSONResponse(
        status_code=error.status_code,
        content={"detail": {"code": error.code, "message": error.message}},
    )


@app.get("/", include_in_schema=False)
def root() -> dict[str, str]:
    return {"service": "Organic Molecular Workbench API", "docs": "/docs"}
