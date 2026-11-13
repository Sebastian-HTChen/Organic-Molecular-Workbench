import { request } from "@/features/molecule/api";
import type { Molecule } from "@/features/molecule/types";

export interface ImportResult {
  molecules: Molecule[];
  failures: { filename: string; code: string; message: string }[];
}

export async function importMolecules(files: File[]): Promise<ImportResult> {
  const payload = await Promise.all(files.map(async (file) => ({
    filename: file.name,
    content: await file.text(),
  })));
  return request<ImportResult>("/imports", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ files: payload }),
  });
}

export function updateStructureSettings(
  molecule: Molecule,
  totalCharge: number,
  multiplicity: number,
  topologyConfirmed: boolean,
): Promise<Molecule> {
  return request<Molecule>("/imports/settings", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ molecule, total_charge: totalCharge, multiplicity, topology_confirmed: topologyConfirmed }),
  });
}
