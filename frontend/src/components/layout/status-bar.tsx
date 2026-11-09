import type { Molecule } from "@/features/molecule/types";

interface StatusBarProps {
  backend: "checking" | "online" | "offline";
  rdkitVersion: string | null;
  molecule: Molecule | null;
  selectedCount: number;
}

export function StatusBar({ backend, rdkitVersion, molecule, selectedCount }: StatusBarProps) {
  return (
    <footer className="flex h-6 shrink-0 items-center gap-4 border-t border-border bg-panel px-3 font-mono text-[9px] text-muted-foreground">
      <div className="flex items-center gap-1.5">
        <span className={`h-1.5 w-1.5 rounded-full ${backend === "online" ? "bg-emerald-400" : backend === "offline" ? "bg-red-400" : "bg-amber-400"}`} />
        <span>{backend === "online" ? "Backend ready" : backend === "offline" ? "Backend offline" : "Checking backend"}</span>
      </div>
      {rdkitVersion && <span>RDKit {rdkitVersion}</span>}
      <div className="h-3 w-px bg-border" />
      <span>{molecule ? `${molecule.atom_count} atoms · ${molecule.bond_count} bonds` : "No molecule"}</span>
      {selectedCount > 0 && <span>{selectedCount} selected</span>}
      <span className="ml-auto">Coordinates: Å · ETKDGv3 · No DFT / HPC provider configured</span>
    </footer>
  );
}
