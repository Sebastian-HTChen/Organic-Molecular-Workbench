# Organic Molecular Workbench — Architecture

## Phase 1 scope

The current MVP implements the complete path **SMILES → FastAPI → RDKit ETKDGv3 → explicit-hydrogen molecular model + SDF → 3Dmol.js**. It also provides atom selection, live geometric measurements, and real SDF/MOL/XYZ/SMILES export.

Ketcher 3.18 provides real 2D editing. Its MOL output is posted to `POST /api/v1/molecules/from-mol`, sanitized, and embedded with the same RDKit pipeline. The API returns independent 2D and 3D molblocks. The atom palette selects Ketcher's actual atom tool; zoom controls call 3Dmol.js `zoom` without resetting the camera.

Not yet implemented: file import, application-level undo/redo, geometry editing, DFT execution, and HPC submission. These controls are disabled or identified by a future-phase label. No calculation result is synthesized in the browser.

## Runtime data flow

1. The browser posts a name and SMILES string to `POST /api/v1/molecules/from-smiles`.
2. RDKit parses and sanitizes the molecule, adds explicit hydrogens, and embeds one conformer using ETKDGv3 with seed 42. A random-coordinate retry is used if the first embedding fails. Failure is returned as a structured 422 error.
3. The API returns atom indices (one-based), elements, isotopes, formal charges, aromatic flags, Cartesian coordinates, bond orders, ring flags, canonical SMILES, formula, molecular weight, and an MDL molblock.
4. The normalized JSON model is the browser's single source of truth. 3Dmol.js parses the accompanying molblock; atom index `n - 1` in 3Dmol corresponds to API atom index `n`.
5. Selection and measurements use JSON coordinates, not screenshots or hard-coded values. Export serializes the active model.

RDKit owns chemical parsing and conformer generation. 3Dmol.js owns rendering and mouse interaction. The browser does not re-perceive aromaticity, assign valence, or claim to optimize energy.

## Frontend modules

- `components/layout`: top actions, structure builder, tool rail, properties, settings, and status.
- `components/viewport`: persistent Ketcher 2D editor, 3Dmol.js lifecycle, representation, labels, visibility, selection, and camera zoom/fitting.
- `components/ui`: reusable shadcn/ui-style controls built with CVA, clsx, and Tailwind Merge.
- `features/molecule/api.ts`: HTTP errors and API contracts.
- `features/molecule/types.ts`: normalized molecule contract.
- `features/molecule/geometry.ts`: distance, bond angle, and signed dihedral calculations.
- `features/molecule/export.ts`: file serialization and browser download.
- `App.tsx`: application state and stale-request protection.

## Local launcher and project skill

- `scripts/workbench.py`: cross-platform process launcher. It checks/install project-local dependencies, starts Uvicorn without reload and Vite directly through Node, waits for both HTTP endpoints, opens the browser, and terminates both child processes on exit.
- `start-workbench.cmd`: Windows double-click entry point.
- `.kimi-code/skills/organic-workbench/SKILL.md`: optional Kimi Code project skill that delegates startup to the same launcher. The skill does not replace the standalone launcher or implement a separate service lifecycle.

## Backend modules

- `api/routes`: transport-only FastAPI endpoints.
- `schemas/molecule.py`: validated request and response models.
- `services/chemistry/molecules.py`: RDKit parsing and conformer generation.
- `services/chemistry/errors.py`: domain errors mapped to structured HTTP responses.
- `services/calculation/base.py`: abstract provider and calculation task contract. No execution provider is registered.
- `services/calculation/orca.py`: validates an RDKit 3D molblock and serializes actual Cartesian coordinates into an ORCA input. `POST /api/v1/calculations/orca/input` allowlists supported functionals, basis sets, and task types. It does not run ORCA or submit jobs.
- `components/calculation/orca-dialog.tsx`: task, functional, basis, charge, multiplicity, and resource controls with live backend-generated preview and practical starting configurations.

## Planned phases

### Phase 2 — editing, optimization, and import

- Integrate `ketcher-react`/`ketcher-core` with React 18. Ketcher MOL input/output is converted through the backend into the same normalized model. The current 3D viewport is not represented as a 2D editor.
- MMFF94 and UFF optimization is implemented at `POST /api/v1/molecules/optimize`. `services/chemistry/optimization.py` checks parameter coverage, performs actual single-step minimization calls, counts iterations, and reports initial/final energies and convergence separately. Energies are **force-field potential energies**, not DFT total energies or Gibbs free energies.
- Import XYZ, SDF, MOL, and SMILES. Preserve SDF/MOL topology and charges. For XYZ, use explicit connectivity perception and report inferred topology, bond-order limitations, and failures.
- Add undo/redo around immutable molecular-model snapshots.

### Phase 3 — geometry editing

- Keep ordered one-to-four-atom selection.
- Apply bond length, angle, and dihedral changes through backend RDKit conformer transforms; update the model and viewer without losing selection.
- Restrict or warn on ring bonds and unsuitable conjugated bonds. Rotatable-bond checks must consider ring membership and terminal moving fragments.
- Validate degenerate geometries and reject undefined angles rather than displaying NaN.

### Phase 4 — calculation providers

Extend the existing ORCA input writer and add Gaussian input generation behind the calculation module. Job submission belongs in a separate asynchronous service with persistent task IDs, status polling, logs, and cancellation. DFT optimization, frequency, single-point energy, Gibbs free energy, and HPC submission remain unavailable until a real provider and execution backend are configured. Generating an input file does not execute these calculations.

## Storage and compatibility

Phase 1 is stateless and needs no database. Local downloads provide file output. SQLite is appropriate when saved projects, history, or asynchronous jobs are introduced.

Confirmed environment: Python 3.12, RDKit 2026.09.1, FastAPI 0.162.2, Node.js 24, React 18.3.1, Vite 6.4.6, 3Dmol.js 2.5.5, and Tailwind CSS 3.4.19. The backend runs in `backend/.venv`; it does not modify the system RDKit installation.
