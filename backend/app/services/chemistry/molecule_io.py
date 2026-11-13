import hashlib
import math
import re
from pathlib import Path
from uuid import uuid4

from rdkit import Chem
from rdkit.Chem import AllChem, Descriptors, rdDetermineBonds, rdMolDescriptors

from app.schemas.molecule import (
    AtomData,
    BondData,
    ConformerData,
    MoleculeResponse,
    StructureProvenance,
    Vector3,
)
from app.services.chemistry.errors import ChemistryError
from app.services.chemistry.validation import validate_molecule


def _xyz(content: str) -> tuple[Chem.Mol, dict[str, str], list[str]]:
    lines = content.splitlines()
    try:
        count = int(lines[0].strip())
    except (IndexError, ValueError) as error:
        raise ChemistryError("invalid_xyz", "The XYZ atom count must be an integer on line 1.", 422) from error
    if count < 1 or len(lines) < count + 2 or any(line.strip() for line in lines[count + 2:]):
        raise ChemistryError("invalid_xyz", "The XYZ atom count does not match the coordinate lines.", 422)
    if count > 2_000:
        raise ChemistryError("molecule_too_large", "Imported XYZ files are limited to 2,000 atoms.", 413)

    molecule = Chem.RWMol()
    conformer = Chem.Conformer(count)
    periodic_table = Chem.GetPeriodicTable()
    for index, line in enumerate(lines[2:count + 2]):
        fields = line.split()
        if len(fields) < 4:
            raise ChemistryError("invalid_xyz", f"XYZ atom line {index + 3} is incomplete.", 422)
        symbol = fields[0].capitalize()
        try:
            atomic_number = periodic_table.GetAtomicNumber(symbol)
            if atomic_number <= 0:
                raise ValueError("Invalid element")
            coordinates = tuple(float(value) for value in fields[1:4])
        except (ValueError, RuntimeError) as error:
            raise ChemistryError("invalid_xyz", f"Invalid element or coordinates on XYZ line {index + 3}.", 422) from error
        if not all(math.isfinite(value) for value in coordinates):
            raise ChemistryError("invalid_coordinates", f"Non-finite coordinates on XYZ line {index + 3}.", 422)
        atom = Chem.Atom(atomic_number)
        atom.SetNoImplicit(True)
        molecule.AddAtom(atom)
        conformer.SetAtomPosition(index, coordinates)
    molecule.AddConformer(conformer)
    metadata = {
        key: first or second
        for key, first, second in re.findall(r"([A-Za-z_][\w.-]*)=(?:\"([^\"]*)\"|(\S+))", lines[1])
    }
    warnings = []
    if metadata:
        warnings.append("Extended XYZ key-value fields are retained as metadata; they do not establish chemistry or replace user settings.")
    if "Lattice" in metadata:
        warnings.append("The Extended XYZ Lattice is not used for periodic calculations. This release treats the coordinates as an isolated structure.")
    return molecule.GetMol(), metadata, warnings


def _infer_xyz_topology(molecule: Chem.Mol, warnings: list[str]) -> tuple[Chem.Mol, str]:
    warnings.append("XYZ connectivity and bond orders are inferred, not supplied by the file. Confirm the topology before conformational searches.")
    warnings.append("Total charge was assumed to be 0 during XYZ bond-order perception; verify charge and spin multiplicity.")
    perceived = Chem.Mol(molecule)
    try:
        rdDetermineBonds.DetermineBonds(perceived, charge=0)
        return perceived, "inferred"
    except (ValueError, RuntimeError):
        warnings.append("Automatic XYZ bond-order perception failed. Remaining connections, if any, are single geometric connections requiring review.")
    perceived = Chem.Mol(molecule)
    try:
        rdDetermineBonds.DetermineConnectivity(perceived)
        return perceived, "inferred"
    except (ValueError, RuntimeError):
        warnings.append("No reliable connectivity could be inferred. Add or confirm bonds manually before calculations that require topology.")
        return molecule, "none"


def _mol2_partial_charges(molecule: Chem.Mol, content: str) -> list[str]:
    lines = content.splitlines()
    start = next((index + 1 for index, line in enumerate(lines) if line.strip() == "@<TRIPOS>ATOM"), None)
    end = next((index for index, line in enumerate(lines) if line.strip() == "@<TRIPOS>BOND"), None)
    if start is None or end is None or end < start:
        return ["MOL2 atom partial charges could not be read; no partial charges have been assigned."]
    partial_charges = []
    for atom, line in zip(molecule.GetAtoms(), lines[start:end], strict=False):
        fields = line.split()
        if len(fields) < 9:
            continue
        try:
            value = float(fields[8])
            if not math.isfinite(value):
                raise ValueError("Non-finite partial charge")
            atom.SetDoubleProp("mol2_partial_charge", value)
            partial_charges.append(value)
        except ValueError:
            continue
    if len(partial_charges) != molecule.GetNumAtoms():
        return ["Some MOL2 partial charges are missing or invalid; missing values remain unassigned."]
    return [f"The sum of MOL2 atom partial charges is {sum(partial_charges):.6g}; this is not a formal-charge total."]


def _parse_mol_file(block: str, code: str, index: int | None = None) -> tuple[Chem.Mol, bool, list[str]]:
    try:
        molecule = Chem.MolFromMolBlock(block, removeHs=False, sanitize=True)
    except (ValueError, RuntimeError):
        molecule = None
    if molecule is not None:
        return molecule, True, []
    try:
        molecule = Chem.MolFromMolBlock(block, removeHs=False, sanitize=False)
    except (ValueError, RuntimeError):
        molecule = None
    if molecule is None:
        record = f" record {index}" if index is not None else ""
        raise ChemistryError(code, f"Could not parse the MOL/SDF{record}.", 422)
    molecule.UpdatePropertyCache(strict=False)
    return molecule, False, ["RDKit sanitization failed. File bonds are retained for review, but valence and aromaticity are not confirmed."]


def parse_structure(filename: str, content: str, requested_format: str | None = None) -> list[MoleculeResponse]:
    extension = (requested_format or Path(filename).suffix).lower().lstrip(".")
    if extension not in {"xyz", "extxyz", "sdf", "mol", "mol2", "pdb"}:
        if content.lstrip().startswith("@<TRIPOS>MOLECULE"):
            extension = "mol2"
        elif "ATOM  " in content or "HETATM" in content:
            extension = "pdb"
        else:
            extension = "xyz" if content.lstrip().split(" ", 1)[0].isdigit() else "mol"

    stem = Path(filename).stem or "Imported molecule"
    records: list[tuple[Chem.Mol, str, str, dict[str, str], list[str]]] = []
    if extension in {"xyz", "extxyz"}:
        molecule, metadata, warnings = _xyz(content)
        molecule, topology_source = _infer_xyz_topology(molecule, warnings)
        records.append((molecule, stem, topology_source, metadata, warnings))
    elif extension in {"mol", "sdf"}:
        blocks = [block.rstrip() + "\n" for block in content.split("$$$$") if block.strip()] if extension == "sdf" else [content]
        for index, block in enumerate(blocks, start=1):
            if index > 1:
                block = block.lstrip("\r\n")
            molecule, sanitized, warnings = _parse_mol_file(block, "invalid_mol", index)
            name = molecule.GetProp("_Name") if molecule.HasProp("_Name") else f"{stem} · record {index}"
            metadata = {"sanitization": "passed" if sanitized else "failed"}
            records.append((molecule, name, "file", metadata, warnings))
    elif extension == "mol2":
        try:
            molecule = Chem.MolFromMol2Block(content, removeHs=False, sanitize=True)
        except (ValueError, RuntimeError, TypeError):
            molecule = None
        warnings = []
        topology_source = "file"
        if molecule is None:
            try:
                molecule = Chem.MolFromMol2Block(content, removeHs=False, sanitize=False)
            except (ValueError, RuntimeError, TypeError):
                molecule = None
            if molecule is None:
                raise ChemistryError("invalid_mol2", "RDKit could not parse this MOL2 file. Check Tripos atom and bond sections.", 422)
            molecule.UpdatePropertyCache(strict=False)
            warnings.append("MOL2 sanitization failed. File bonds are retained for review, but valence and aromaticity are not confirmed.")
        warnings.extend(_mol2_partial_charges(molecule, content))
        warnings.append("MOL2 partial charges and atom types are not formal charges. Verify total charge and spin multiplicity.")
        name = molecule.GetProp("_Name") if molecule.HasProp("_Name") else stem
        records.append((molecule, name or stem, topology_source, {"partial_charges": "file"}, warnings))
    else:
        molecule = Chem.MolFromPDBBlock(content, sanitize=False, removeHs=False, proximityBonding=False)
        if molecule is None:
            raise ChemistryError("invalid_pdb", "RDKit could not parse this PDB file.", 422)
        molecule.UpdatePropertyCache(strict=False)
        warnings = ["PDB CONECT records are treated as file-provided single connections, not complete bond orders or formal charges."]
        if molecule.GetNumBonds() == 0 and molecule.GetNumAtoms() > 1:
            warnings.append("No PDB CONECT topology was found. Review connectivity before force-field calculations.")
        records.append((molecule, stem, "file" if molecule.GetNumBonds() else "none", {}, warnings))

    digest = hashlib.sha256(content.encode("utf-8")).hexdigest()
    responses = []
    for molecule, name, topology_source, metadata, warnings in records:
        if molecule.GetNumAtoms() > 2_000:
            raise ChemistryError("molecule_too_large", "Imported structures are limited to 2,000 atoms.", 413)
        warnings.extend(validate_molecule(molecule))
        sanitization_failed = any("sanitization failed" in warning for warning in warnings)
        confirmed = topology_source == "file" and not sanitization_failed
        charge = sum(atom.GetFormalCharge() for atom in molecule.GetAtoms())
        electron_count = sum(
            atom.GetAtomicNum() + atom.GetTotalNumHs(includeNeighbors=True)
            for atom in molecule.GetAtoms()
        ) - charge
        multiplicity = 2 if electron_count % 2 else 1
        warnings.append(f"Default multiplicity {multiplicity} follows electron-count parity only; verify the intended spin state.")
        responses.append(_import_response(
            molecule, name, extension, filename, digest, topology_source, confirmed, charge, metadata, warnings, multiplicity,
        ))
    return responses


def _import_response(
    molecule: Chem.Mol,
    name: str,
    source_format: str,
    filename: str,
    digest: str,
    topology_source: str,
    confirmed: bool,
    charge: int,
    metadata: dict[str, str],
    warnings: list[str],
    multiplicity: int,
) -> MoleculeResponse:
    conformer = molecule.GetConformer()
    atoms = []
    for atom in molecule.GetAtoms():
        point = conformer.GetAtomPosition(atom.GetIdx())
        atoms.append(AtomData(
            index=atom.GetIdx() + 1, element=atom.GetSymbol(), atomic_number=atom.GetAtomicNum(),
            isotope=atom.GetIsotope(), formal_charge=atom.GetFormalCharge(), is_aromatic=atom.GetIsAromatic(),
            partial_charge=atom.GetDoubleProp("mol2_partial_charge") if atom.HasProp("mol2_partial_charge") else None,
            position=Vector3(x=point.x, y=point.y, z=point.z),
        ))
    bond_origin = "file" if source_format in {"mol", "sdf", "mol2", "pdb"} else "inferred"
    bonds = [BondData(
        index=bond.GetIdx() + 1, begin_atom=bond.GetBeginAtomIdx() + 1, end_atom=bond.GetEndAtomIdx() + 1,
        order=bond.GetBondTypeAsDouble(), bond_type=str(bond.GetBondType()), is_aromatic=bond.GetIsAromatic(),
        is_in_ring=bond.IsInRing(), source=bond_origin,
    ) for bond in molecule.GetBonds()]
    editor = Chem.Mol(molecule)
    editor.RemoveAllConformers()
    try:
        editor = Chem.RemoveHs(editor)
    except ValueError:
        pass
    try:
        AllChem.Compute2DCoords(editor)
        canonical = Chem.MolToSmiles(molecule) if confirmed else ""
        mol_block = Chem.MolToMolBlock(molecule, kekulize=False)
        mol_block_2d = Chem.MolToMolBlock(editor, kekulize=False)
    except (ValueError, RuntimeError) as error:
        raise ChemistryError("invalid_structure", "The file was parsed, but its topology or coordinates cannot be represented safely. Review the structure and connectivity.", 422) from error

    return MoleculeResponse(
        id=str(uuid4()), name=name, source_smiles="", canonical_smiles=canonical,
        formula=rdMolDescriptors.CalcMolFormula(molecule), molecular_weight=Descriptors.MolWt(molecule),
        atom_count=molecule.GetNumAtoms(), bond_count=molecule.GetNumBonds(), atoms=atoms, bonds=bonds,
        conformer=ConformerData(method="imported"),
        mol_block=mol_block,
        mol_block_2d=mol_block_2d,
        provenance=StructureProvenance(
            source_format=source_format.upper(), filename=filename, input_sha256=digest,
            topology_source=topology_source, topology_confirmed=confirmed, total_charge=charge, multiplicity=multiplicity,
            charge_source="file" if source_format in {"mol", "sdf"} else "inferred",
            metadata=metadata, warnings=warnings,
        ),
    )
