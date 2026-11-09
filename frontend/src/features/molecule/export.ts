import type { ExportFormat, Molecule } from "./types";

function safeFileName(name: string): string {
  const normalized = name
    .trim()
    .replace(/[^a-zA-Z0-9_-]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return normalized || "molecule";
}

export function serializeXyz(molecule: Molecule): string {
  const coordinates = molecule.atoms.map(
    (atom) =>
      `${atom.element.padEnd(2)} ${atom.position.x.toFixed(8).padStart(15)} ` +
      `${atom.position.y.toFixed(8).padStart(15)} ${atom.position.z.toFixed(8).padStart(15)}`,
  );
  return [
    String(molecule.atom_count),
    `${molecule.name} | RDKit ETKDGv3 | XYZ contains no bond-order topology`,
    ...coordinates,
    "",
  ].join("\n");
}

export function serializeMolecule(molecule: Molecule, format: ExportFormat): string {
  if (format === "smiles") return `${molecule.canonical_smiles}\n`;
  if (format === "xyz") return serializeXyz(molecule);
  if (format === "sdf") return `${molecule.mol_block.trimEnd()}\n$$$$\n`;
  return molecule.mol_block;
}

export function downloadMolecule(molecule: Molecule, format: ExportFormat): void {
  const mimeType = format === "smiles" ? "text/plain" : "chemical/x-mdl-molfile";
  const blob = new Blob([serializeMolecule(molecule, format)], {
    type: `${mimeType};charset=utf-8`,
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${safeFileName(molecule.name)}.${format === "smiles" ? "smi" : format}`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
