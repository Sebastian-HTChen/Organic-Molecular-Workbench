import { Box, Eye, FlaskConical, Loader2, Maximize2, Tag } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { ToggleButton } from "@/components/ui/toggle-button";
import type { Molecule, Representation } from "@/features/molecule/types";

import { Viewer3D } from "./viewer-3d";

interface MoleculeViewportProps {
  molecule: Molecule | null;
  generating: boolean;
  selectedAtoms: number[];
  theme: "dark" | "light";
  onSelect: (atomIndex: number) => void;
}

export function MoleculeViewport({
  molecule,
  generating,
  selectedAtoms,
  theme,
  onSelect,
}: MoleculeViewportProps) {
  const [representation, setRepresentation] = useState<Representation>("ball-stick");
  const [showHydrogens, setShowHydrogens] = useState(true);
  const [showLabels, setShowLabels] = useState(false);
  const [fitSignal, setFitSignal] = useState(0);

  return (
    <main className="relative flex min-w-0 flex-1 flex-col bg-background">
      <div className="flex h-10 shrink-0 items-center gap-2 border-b border-border bg-panel px-2.5">
        <div className="mr-1 flex h-7 items-center rounded-md bg-background p-0.5">
          <button type="button" className="flex h-6 items-center gap-1.5 rounded bg-muted px-2.5 text-[11px] font-medium text-foreground shadow-sm">
            <Box size={12} /> 3D
          </button>
          <button
            type="button"
            disabled
            title="Ketcher 2D editing is planned for Phase 2"
            className="flex h-6 items-center gap-1.5 px-2.5 text-[11px] text-muted-foreground opacity-40"
          >
            2D Editor <span className="text-[8px]">PHASE 2</span>
          </button>
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          <select
            aria-label="Representation"
            className="h-7 rounded-md border border-border bg-panel px-2 text-[11px] text-foreground outline-none focus:border-primary disabled:opacity-40"
            value={representation}
            disabled={!molecule}
            onChange={(event) => setRepresentation(event.target.value as Representation)}
          >
            <option value="ball-stick">Ball & Stick</option>
            <option value="stick">Stick</option>
            <option value="space-filling">Space-Filling</option>
          </select>
          <ToggleButton
            pressed={showHydrogens}
            disabled={!molecule}
            icon={<Eye size={12} />}
            title="Show or hide hydrogen atoms"
            onClick={() => setShowHydrogens((visible) => !visible)}
          >
            H
          </ToggleButton>
          <ToggleButton
            pressed={showLabels}
            disabled={!molecule}
            icon={<Tag size={12} />}
            title="Show atom indices"
            onClick={() => setShowLabels((visible) => !visible)}
          >
            123
          </ToggleButton>
          <Button
            variant="ghost"
            size="icon-sm"
            disabled={!molecule}
            title="Center and fit molecule"
            aria-label="Center and fit molecule"
            onClick={() => setFitSignal((signal) => signal + 1)}
          >
            <Maximize2 size={14} />
          </Button>
        </div>
      </div>

      <div className="viewport-grid relative min-h-0 flex-1 overflow-hidden shadow-viewport">
        {molecule ? (
          <Viewer3D
            molecule={molecule}
            representation={representation}
            showHydrogens={showHydrogens}
            showLabels={showLabels}
            selectedAtoms={selectedAtoms}
            fitSignal={fitSignal}
            theme={theme}
            onSelect={onSelect}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center p-8">
            <div className="max-w-sm text-center">
              <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-border bg-panel text-primary shadow-sm">
                <FlaskConical size={30} strokeWidth={1.3} />
              </div>
              <h2 className="text-base font-semibold">Build a molecular structure</h2>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">
                Enter a SMILES string in the Structure Builder, then generate a real three-dimensional conformer with RDKit ETKDGv3.
              </p>
              <div className="mt-5 inline-flex items-center gap-2 rounded-md border border-border bg-panel px-3 py-2 font-mono text-[11px] text-muted-foreground">
                <span className="text-primary">SMILES</span>
                <span>→</span><span>RDKit</span><span>→</span><span>3Dmol.js</span>
              </div>
            </div>
          </div>
        )}

        {molecule && (
          <div className="pointer-events-none absolute left-3 top-3 rounded-md border border-border/80 bg-panel/85 px-2.5 py-1.5 backdrop-blur-sm">
            <div className="text-[11px] font-medium">{molecule.name}</div>
            <div className="mt-0.5 font-mono text-[9px] text-muted-foreground">
              {molecule.formula} · {molecule.conformer.method} · Å
            </div>
          </div>
        )}

        {generating && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/65 backdrop-blur-[2px]">
            <div className="flex items-center gap-3 rounded-lg border border-border bg-panel px-4 py-3 text-xs shadow-xl">
              <Loader2 size={17} className="animate-spin text-primary" />
              <div>
                <div className="font-medium">Generating 3D conformer</div>
                <div className="mt-0.5 text-[10px] text-muted-foreground">RDKit ETKDGv3 · explicit hydrogens</div>
              </div>
            </div>
          </div>
        )}

        <div className="pointer-events-none absolute bottom-3 left-3 flex gap-3 rounded-md bg-panel/75 px-2.5 py-1.5 text-[9px] text-muted-foreground backdrop-blur-sm">
          <span><b className="font-medium text-foreground">Left drag</b> rotate</span>
          <span><b className="font-medium text-foreground">Wheel</b> zoom</span>
          <span><b className="font-medium text-foreground">Right drag</b> pan</span>
          <span><b className="font-medium text-foreground">Click atom</b> select</span>
        </div>
        <div className="pointer-events-none absolute bottom-3 right-3 font-mono text-[9px] text-muted-foreground">
          Coordinates / Å
        </div>
      </div>
    </main>
  );
}
