import {
  Atom,
  Box,
  ChevronDown,
  Download,
  FolderOpen,
  Redo2,
  Save,
  Settings,
  Undo2,
} from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import type { ExportFormat, Molecule } from "@/features/molecule/types";

interface TopBarProps {
  molecule: Molecule | null;
  canGenerate: boolean;
  generating: boolean;
  onNew: () => void;
  onGenerate: () => void;
  onExport: (format: ExportFormat) => void;
  onOpenSettings: () => void;
}

const exportFormats: { id: ExportFormat; label: string; detail: string }[] = [
  { id: "sdf", label: "SDF", detail: "Coordinates and bond topology" },
  { id: "mol", label: "MOL", detail: "Single MDL molfile record" },
  { id: "xyz", label: "XYZ", detail: "Coordinates only; no bond orders" },
  { id: "smiles", label: "SMILES", detail: "Canonical SMILES string" },
];

export function TopBar({
  molecule,
  canGenerate,
  generating,
  onNew,
  onGenerate,
  onExport,
  onOpenSettings,
}: TopBarProps) {
  const [exportOpen, setExportOpen] = useState(false);

  function exportMolecule(format: ExportFormat) {
    onExport(format);
    setExportOpen(false);
  }

  return (
    <header className="flex h-[52px] shrink-0 items-center gap-1 border-b border-border bg-panel px-3">
      <div className="mr-3 flex items-center gap-2.5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-primary/35 bg-primary/10 text-primary">
          <Atom size={20} strokeWidth={1.7} />
        </div>
        <div className="leading-tight">
          <div className="text-[13px] font-semibold tracking-wide">Organic Molecular Workbench</div>
          <div className="text-[9px] uppercase tracking-[0.2em] text-muted-foreground">
            Molecular modeling environment
          </div>
        </div>
      </div>

      <Button variant="ghost" size="sm" onClick={onNew}>
        <span className="text-sm leading-none">+</span> New Molecule
      </Button>
      <Button variant="ghost" size="sm" disabled title="File import is planned for Phase 2">
        <FolderOpen size={13} /> Open
      </Button>
      <Button
        variant="ghost"
        size="sm"
        disabled={!molecule}
        title="Save the current structure as SDF"
        onClick={() => molecule && exportMolecule("sdf")}
      >
        <Save size={13} /> Save
      </Button>

      <div className="mx-1 h-5 w-px bg-border" />
      <Button variant="ghost" size="icon-sm" disabled title="Undo history is planned for Phase 2">
        <Undo2 size={14} />
      </Button>
      <Button variant="ghost" size="icon-sm" disabled title="Redo history is planned for Phase 2">
        <Redo2 size={14} />
      </Button>
      <div className="mx-1 h-5 w-px bg-border" />

      <Button size="sm" disabled={!canGenerate || generating} onClick={onGenerate}>
        <Box size={13} /> Generate 3D
      </Button>
      <Button variant="outline" size="sm" disabled title="MMFF94 / UFF optimization is planned for Phase 2">
        Optimize Geometry
      </Button>

      <div className="relative">
        <Button
          variant="outline"
          size="sm"
          disabled={!molecule}
          onClick={() => setExportOpen((open) => !open)}
        >
          <Download size={13} /> Export <ChevronDown size={11} />
        </Button>
        {exportOpen && molecule && (
          <>
            <button
              aria-label="Close export menu"
              className="fixed inset-0 z-30 cursor-default"
              onClick={() => setExportOpen(false)}
            />
            <div className="animate-fade-in absolute right-0 top-9 z-40 w-64 rounded-lg border border-border bg-panel p-1.5 shadow-xl">
              {exportFormats.map((format) => (
                <button
                  key={format.id}
                  className="flex w-full items-start gap-3 rounded-md px-2.5 py-2 text-left hover:bg-muted"
                  onClick={() => exportMolecule(format.id)}
                >
                  <span className="w-12 font-mono text-[11px] font-semibold text-primary">
                    {format.label}
                  </span>
                  <span className="text-[10px] leading-4 text-muted-foreground">{format.detail}</span>
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="ml-auto flex items-center gap-2">
        <span className="hidden rounded border border-border px-1.5 py-0.5 font-mono text-[9px] text-muted-foreground xl:inline">
          MVP · PHASE 1
        </span>
        <Button variant="ghost" size="sm" onClick={onOpenSettings}>
          <Settings size={14} /> Settings
        </Button>
      </div>
    </header>
  );
}
