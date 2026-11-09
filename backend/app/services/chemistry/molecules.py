from uuid import uuid4

from rdkit import Chem
from rdkit.Chem import AllChem, Descriptors, rdMolDescriptors

from app.schemas.molecule import (
    AtomData,
    BondData,
    ConformerData,
    MoleculeResponse,
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
        )
        for bond in molecule.GetBonds()
    ]

    return MoleculeResponse(
        id=str(uuid4()),
        name=name,
        source_smiles=smiles,
        canonical_smiles=Chem.MolToSmiles(base_molecule, canonical=True),
        formula=rdMolDescriptors.CalcMolFormula(molecule),
        molecular_weight=Descriptors.MolWt(molecule),
        atom_count=molecule.GetNumAtoms(),
        bond_count=molecule.GetNumBonds(),
        atoms=atoms,
        bonds=bonds,
        conformer=ConformerData(seed=RANDOM_SEED),
        mol_block=Chem.MolToMolBlock(molecule, kekulize=True),
    )
