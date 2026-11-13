from uuid import uuid4

from rdkit import Chem
from rdkit.Chem import AllChem, Descriptors, rdMolDescriptors

from app.schemas.molecule import (
    AtomData,
    BondData,
    ConformerData,
    MoleculeResponse,
    OptimizationResult,
    StructureProvenance,
    Vector3,
)
from app.services.chemistry.errors import ChemistryError

RANDOM_SEED = 42
MAX_BASE_ATOMS = 1_000
MAX_EXPLICIT_ATOMS = 2_000


def generate_from_smiles(smiles: str, name: str) -> MoleculeResponse:
    base_molecule = Chem.MolFromSmiles(smiles)
    if base_molecule is None:
        raise ChemistryError(
            "invalid_smiles",
            "RDKit could not parse this SMILES. Check syntax, valence, and aromaticity.",
        )
    return _generate_3d(base_molecule, name, source_smiles=smiles, source_format="SMILES")


def generate_from_mol_block(mol_block: str, name: str) -> MoleculeResponse:
    try:
        base_molecule = Chem.MolFromMolBlock(mol_block, sanitize=True, removeHs=False)
    except ValueError:
        base_molecule = None
    if base_molecule is None:
        raise ChemistryError(
            "invalid_mol_block",
            "RDKit could not parse this MOL structure. Check atom valence, bonds, and charges.",
        )
    if base_molecule.GetNumAtoms() == 0:
        raise ChemistryError(
            "empty_molecule",
            "The 2D editor is empty. Draw at least one atom before generating 3D.",
        )
    canonical_smiles = Chem.MolToSmiles(base_molecule, canonical=True)
    return _generate_3d(base_molecule, name, source_smiles=canonical_smiles, source_format="2D MOL")


def _generate_3d(
    base_molecule: Chem.Mol,
    name: str,
    source_smiles: str,
    source_format: str,
) -> MoleculeResponse:
    if base_molecule.GetNumAtoms() > MAX_BASE_ATOMS:
        raise ChemistryError(
            "molecule_too_large",
            f"Molecules are limited to {MAX_BASE_ATOMS} atoms before explicit hydrogens.",
            status_code=413,
        )

    molecule = Chem.AddHs(base_molecule)
    if molecule.GetNumAtoms() > MAX_EXPLICIT_ATOMS:
        raise ChemistryError(
            "molecule_too_large",
            f"Molecules are limited to {MAX_EXPLICIT_ATOMS} atoms including hydrogens.",
            status_code=413,
        )
    molecule.SetProp("_Name", name)

    parameters = AllChem.ETKDGv3()
    parameters.randomSeed = RANDOM_SEED
    parameters.enforceChirality = True
    parameters.maxIterations = 300
    result = AllChem.EmbedMolecule(molecule, parameters)
    if result != 0:
        parameters.useRandomCoords = True
        result = AllChem.EmbedMolecule(molecule, parameters)
    if result != 0 or molecule.GetNumConformers() == 0:
        raise ChemistryError(
            "conformer_generation_failed",
            "RDKit could not generate a 3D conformer for this molecule. "
            "Check stereochemistry and structural constraints.",
        )

    return molecule_response(molecule, name, source_smiles=source_smiles, source_format=source_format)


def molecule_response(
    molecule: Chem.Mol,
    name: str,
    optimization: OptimizationResult | None = None,
    source_smiles: str | None = None,
    source_format: str = "MOL",
    provenance: StructureProvenance | None = None,
) -> MoleculeResponse:
    base_molecule = Chem.RemoveHs(Chem.Mol(molecule))
    conformer = molecule.GetConformer()
    atoms = [
        AtomData(
            index=atom.GetIdx() + 1,
            element=atom.GetSymbol(),
            atomic_number=atom.GetAtomicNum(),
            isotope=atom.GetIsotope(),
            formal_charge=atom.GetFormalCharge(),
            is_aromatic=atom.GetIsAromatic(),
            position=Vector3(
                x=conformer.GetAtomPosition(atom.GetIdx()).x,
                y=conformer.GetAtomPosition(atom.GetIdx()).y,
                z=conformer.GetAtomPosition(atom.GetIdx()).z,
            ),
        )
        for atom in molecule.GetAtoms()
    ]
    bonds = [
        BondData(
            index=bond.GetIdx() + 1,
            begin_atom=bond.GetBeginAtomIdx() + 1,
            end_atom=bond.GetEndAtomIdx() + 1,
            order=bond.GetBondTypeAsDouble(),
            bond_type=str(bond.GetBondType()),
            is_aromatic=bond.GetIsAromatic(),
            is_in_ring=bond.IsInRing(),
            source=provenance.topology_source if provenance and provenance.topology_source != "none" else ("file" if optimization else "generated"),
        )
        for bond in molecule.GetBonds()
    ]

    editor_molecule = Chem.Mol(base_molecule)
    editor_molecule.RemoveAllConformers()
    AllChem.Compute2DCoords(editor_molecule)
    editor_molecule.SetProp("_Name", name)
    total_charge = sum(atom.GetFormalCharge() for atom in molecule.GetAtoms())
    electron_count = sum(
        atom.GetAtomicNum() + atom.GetTotalNumHs(includeNeighbors=True)
        for atom in molecule.GetAtoms()
    ) - total_charge

    return MoleculeResponse(
        id=str(uuid4()),
        name=name,
        source_smiles=source_smiles or Chem.MolToSmiles(base_molecule, canonical=True),
        canonical_smiles=Chem.MolToSmiles(base_molecule, canonical=True),
        formula=rdMolDescriptors.CalcMolFormula(molecule),
        molecular_weight=Descriptors.MolWt(molecule),
        atom_count=molecule.GetNumAtoms(),
        bond_count=molecule.GetNumBonds(),
        atoms=atoms,
        bonds=bonds,
        conformer=ConformerData(seed=RANDOM_SEED, method=f"{optimization.method} optimized" if optimization else "ETKDGv3"),
        mol_block=Chem.MolToMolBlock(molecule, kekulize=True),
        mol_block_2d=Chem.MolToMolBlock(editor_molecule, kekulize=True),
        optimization=optimization,
        provenance=provenance or StructureProvenance(
            source_format=source_format,
            topology_source="generated" if optimization is None else "file",
            charge_source="file" if source_format in {"2D MOL", "MOL"} else "inferred",
            total_charge=total_charge,
            multiplicity=2 if electron_count % 2 else 1,
        ),
    )
