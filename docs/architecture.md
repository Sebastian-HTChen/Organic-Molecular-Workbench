# Organic Molecular Workbench — Architecture

## Implemented scope

The first MVP implements **SMILES / 2D MOL → FastAPI → RDKit ETKDGv3 → explicit-hydrogen molecular model → 3Dmol.js**. It also provides real MMFF94/UFF minimization, atom selection, geometric measurements, SDF/MOL/XYZ/SMILES export, and ORCA input generation without pretending to run ORCA.

Phase 2 adds batched molecular-file import, local-session molecule management, import validation and provenance, the real left-side Ketcher tools, and undo/redo backed by Ketcher's history. Existing optimization, export, and ORCA generation remain available.

Geometry editing, conformer searches, asynchronous persistent jobs, xTB execution, and reproducible report/archive generation are **not yet implemented**. No scientific result or progress indicator is synthesized in the browser.

## Runtime data flow

### Molecule generation and editing

1. The browser posts a name and SMILES to `POST /api/v1/molecules/from-smiles`, or a Ketcher MOL block to `/molecules/from-mol`.
2. RDKit sanitizes the molecule, adds explicit hydrogens, and embeds one conformer with ETKDGv3, seed 42, and `maxIterations = 300`; random coordinates are used only as an embedding retry.
3. The response contains the normalized molecule model and independent 2D/3D molblocks. Atom identifiers are one-based; a 3Dmol atom at zero-based index `i` corresponds to API atom `i + 1`.
4. The JSON model is the browser's source of truth for selection, measurements, and export. 3Dmol.js renders the active 3D molblock; a hidden, persistent Ketcher editor keeps the editable 2D structure independent of the 3D conformer.
5. The left tool rail invokes Ketcher's `atom`, `bond` and `eraser` tools and explicit single/double/triple/aromatic bond options. A controlled active-tool state keeps the element palette and rail indicator synchronized.
6. Top-bar undo/redo calls Ketcher's `undo`/`redo`. `historySize()` controls whether buttons are enabled. These commands cover 2D editing, not optimization results or job history.

### Structure import

`POST /api/v1/imports` accepts one to 50 text structures in one request. Each item has a filename, content, and optional explicit format. Files are limited to 5,000,000 characters/metadata units; frontend File objects are limited to 5 MB; imported structures are limited to 2,000 atoms. A failed file produces an indexed error in `failures[]` without discarding valid siblings.

`services/chemistry/molecule_io.py` detects by extension with limited content-based fallback. It derives molecular formula, coordinates, recognized bonds and properties through RDKit; it does not use demonstration coordinates or hardcoded molecules.

| Format | File-derived structure | Explicit limitations and validation |
| --- | --- | --- |
| XYZ / Extended XYZ | Element symbols and finite Cartesian coordinates | `DetermineBonds` starts with charge zero; if bond-order perception fails, geometric single-bond connectivity is attempted. Bond origin remains `inferred`. No result is marked as file-provided topology. |
| Extended XYZ fields | Supported line-2 key/value metadata, including an optional `Lattice` value | Atomic extras, comment fields, charge labels and lattice do not prove total charge/spin or periodic chemistry. This release does not perform periodic calculations. |
| MOL / SDF | Atom positions, bonds, charges and record names | Multiple SDF records are returned as separate models. Sanitization failure retains file bonds for inspection, but sets `topology_confirmed = false` and does not invent an inferred origin. |
| MOL2 | Tripos atoms, bonds, name, recognized formal chemistry and partial charges | Partial charges remain `partial_charge`, separate from `formal_charge`. The partial-charge sum is reported but is not treated as a formal-charge total. |
| PDB | Atoms and explicit CONECT connections | No proximity-generated bonds. CONECT provides single connections, not complete bond-order or formal-charge information. |

`services/chemistry/validation.py` rejects empty structures, missing conformers, invalid elements and non-finite coordinates. It reports distances below 0.1 Å as overlap warnings and records disconnected fragments. Overlap is a warning, not an automatic geometry correction.

Every imported model carries `StructureProvenance`: source format, filename, SHA-256 of normalized UTF-8 input text, topology origin, topology confirmation, total charge, charge source, multiplicity, metadata, optional oxidation-state annotations, and warnings. File-provided, inferred, generated, user-reviewed and absent topology remain distinct. Confirmation is a user assertion, not an algorithmic proof of chemistry.

`PUT /api/v1/imports/settings` saves total charge, spin multiplicity and topology-review status. Multiplicity must have parity compatible with the electron count. These are metadata settings for subsequent calculations; saving them does **not** alter atom formal charges or rewrite coordination bonds. For metal complexes, users must review coordination and method suitability rather than applying ordinary organic-valence assumptions.

Imported molecules remain in a React local-session library. Refreshing or closing the page does not persist that library, so users should export the current structure to retain it. This is intentional Phase 2 scope, not a persistent project/job archive.

## Frontend modules

- `features/molecule/types.ts`: normalized molecule and provenance contract shared by the viewer, dialogs and import library.
- `features/molecule/api.ts`: HTTP transport, typed `ApiError`, structured backend errors and shared request handling.
- `features/imports/api.ts`: batched import and structure-setting requests.
- `components/imports/import-dialog.tsx`: drag/drop, file-picker, batch feedback and valid-record opening.
- `components/imports/structure-settings.tsx`: provenance, total charge, multiplicity, topology confirmation, metadata and warnings.
- `components/layout`: top actions, structure builder, library, tool rail, properties and settings.
- `components/viewport/ketcher-editor.tsx`: typed imperative access to the real Ketcher micromolecule editor, tools and edit history.
- `components/viewport/viewer-3d.tsx`: 3Dmol lifecycle, representation, selection, visibility and camera controls.
- `App.tsx`: active molecule, imported library, selection, dialogs and stale-request protection.

## Backend modules

- `schemas/molecule.py`: validated molecule, conformer, optimization and provenance models; forward-declared provenance is validated when the API models are built.
- `schemas/imports.py`: batch import and per-file failure contracts.
- `api/routes/imports.py`: transport and charge/spin/topology-setting validation.
- `services/chemistry/molecule_io.py`: format parsing, file/inference provenance and normalized import responses.
- `services/chemistry/validation.py`: coordinate, element, overlap and fragment checks.
- `services/chemistry/molecules.py`: RDKit generation and response construction; generated bonds and real total charge are recorded.
- `services/chemistry/optimization.py`: actual MMFF94/UFF minimization with parameter-coverage checks, separate convergence and iteration reporting. Imported filename, hash, warnings and topology origin are preserved as provenance; conformer coordinates change, but the original input remains the described source.
- `services/chemistry/errors.py`: structured HTTP chemistry errors.
- `services/calculation/orca.py`: actual coordinates and allowed settings serialized into an ORCA input. No ORCA execution or HPC provider is registered.

## Planned phases

- **Phase 3:** validated conformer generation, optimization of multiple conformers, symmetry-aware clustering/RMSD, energy separation by method, progress through a persistent background job manager, cancellation and saved results. Unconfirmed XYZ topology must be reviewed before ETKDG; aromaticity/bond orders must not be reconstructed from screenshots or assumed present.
- **Phase 4:** optional, explicitly detected xTB/ASE adapters, method-support checks and compatible job execution. Unsupported elements, valences and metal systems must produce explicit failures, not silent fallback.
- **Phase 5:** reproducible JSON/HTML/PDF/CSV reports, calculation archives, actual file hashes, environment records, failure logs, and separate numerical/byte-level reproduction comparisons.
- **Phase 6:** scientific regression, end-to-end validation, compatibility checks and documentation updates.

Geometry-parameter editing remains a separate user-requested capability: bond/angle/dihedral modifications will use backend RDKit conformer transformations, preserve validated topology and reject degenerate geometry or unsuitable ring/conjugated rotations.

## Storage and compatibility

The current backend is stateless; downloads are local. No SQLite, job queue or report archive exists yet. Persistent storage and process supervision are prerequisites for surviving refreshes and stopping scientific jobs.

Confirmed environment: Python 3.12, RDKit 2026.09.1, Node.js 24, React 18.3.1, Ketcher 3.18, Vite 6.4.6, 3Dmol.js 2.5.5 and Tailwind CSS 3.4.19. The backend runs in `backend/.venv` without modifying system RDKit. No ASE/xTB backend or DFT/HPC executor is currently configured.
