import { Box, Edit3, Eye, FlaskConical, Loader2, Maximize2, Tag, ZoomIn, ZoomOut } from "lucide-react";
import { useState } from "react";
import type { MutableRefObject } from "react";

import { Button } from "@/components/ui/button";
import { ToggleButton } from "@/components/ui/toggle-button";
import type { Molecule, Representation } from "@/features/molecule/types";

import type { KetcherEditorHandle } from "./ketcher-editor";
import { KetcherEditor } from "./ketcher-editor";
import { Viewer3D } from "./viewer-3d";

interface MoleculeViewportProps {
  molecule: Molecule | null;
  generating: boolean;
  selectedAtoms: number[];
  theme: "dark" | "light";
  viewMode: "2d" | "3d";
  editorRef: MutableRefObject<KetcherEditorHandle | null>;
  onViewModeChange: (mode: "2d" | "3d") => void;
  onEditorReady: () => void;
  onHistoryChange: (history: { undo: number; redo: number }) => void;
  onSelect: (atomIndex: number) => void;
}

export function MoleculeViewport({
  molecule,
  generating,
  selectedAtoms,
  theme,
  viewMode,
  editorRef,
  onViewModeChange,
  onEditorReady,
  onHistoryChange,
  onSelect,
}: MoleculeViewportProps) {
  const [representation, setRepresentation] = useState<Representation>("ball-stick");
  const [showHydrogens, setShowHydrogens] = useState(true);
  const [showLabels, setShowLabels] = useState(false);
  const [fitSignal, setFitSignal] = useState(0);
  const [zoomCommand, setZoomCommand] = useState({ direction: 1 as 1 | -1, serial: 0 });

  return (
    <main className="relative flex min-w-0 flex-1 flex-col bg-background">
      <div className="flex h-10 shrink-0 items-center gap-2 border-b border-border bg-panel px-2.5">
        <div className="mr-1 flex h-7 items-center rounded-md bg-background p-0.5">
          <button
            type="button"
            aria-pressed={viewMode === "3d"}
            onClick={() => onViewModeChange("3d")}
            className={`flex h-6 items-center gap-1.5 rounded px-2.5 text-[11px] font-medium ${viewMode === "3d" ? "bg-muted text-foreground shadow-sm" : "text-muted-foreground"}`}
          >
            <Box size={12} /> 3D
          </button>
          <button
            type="button"
            aria-pressed={viewMode === "2d"}
            onClick={() => onViewModeChange("2d")}
            className={`flex h-6 items-center gap-1.5 rounded px-2.5 text-[11px] font-medium ${viewMode === "2d" ? "bg-muted text-foreground shadow-sm" : "text-muted-foreground"}`}
          >
            <Edit3 size={12} /> 2D Editor
          </button>
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          <select
            aria-label="Representation"
            className="h-7 rounded-md border border-border bg-panel px-2 text-[11px] text-foreground outline-none focus:border-primary disabled:opacity-40"
            value={representation}
            disabled={!molecule || viewMode !== "3d"}
            onChange={(event) => setRepresentation(event.target.value as Representation)}
          >
            <option value="ball-stick">Ball & Stick</option>
            <option value="stick">Stick</option>
            <option value="space-filling">Space-Filling</option>
          </select>
          <ToggleButton
            pressed={showHydrogens}
            disabled={!molecule || viewMode !== "3d"}
            icon={<Eye size={12} />}
            title="Show or hide hydrogen atoms"
            onClick={() => setShowHydrogens((visible) => !visible)}
          >H</ToggleButton>
          <ToggleButton
            pressed={showLabels}
            disabled={!molecule || viewMode !== "3d"}
            icon={<Tag size={12} />}
            title="Show atom indices"
            onClick={() => setShowLabels((visible) => !visible)}
          >123</ToggleButton>
          <Button
            variant="ghost"
            size="icon-sm"
            disabled={!molecule || viewMode !== "3d"}
            title="Zoom out"
            aria-label="Zoom out"
            onClick={() => setZoomCommand((command) => ({ direction: -1, serial: command.serial + 1 }))}
          ><ZoomOut size={14} /></Button>
          <Button
            variant="ghost"
            size="icon-sm"
            disabled={!molecule || viewMode !== "3d"}
            title="Zoom in"
            aria-label="Zoom in"
            onClick={() => setZoomCommand((command) => ({ direction: 1, serial: command.serial + 1 }))}
          ><ZoomIn size={14} /></Button>
          <Button
            variant="ghost"
            size="icon-sm"
            disabled={!molecule || viewMode !== "3d"}
            title="Center and fit molecule"
            aria-label="Center and fit molecule"
            onClick={() => setFitSignal((signal) => signal + 1)}
          ><Maximize2 size={14} /></Button>
        </div>
      </div>

      <div className="viewport-grid relative min-h-0 flex-1 overflow-hidden shadow-viewport">
        <div className={viewMode === "2d" ? "absolute inset-0 z-10" : "invisible pointer-events-none absolute inset-0"}>
          <KetcherEditor
            ref={editorRef}
            moleculeId={molecule?.id}
            initialMolBlock={molecule?.mol_block_2d}
            onReady={onEditorReady}
            onHistoryChange={onHistoryChange}
          />
        </div>
        <div className={viewMode === "3d" ? "absolute inset-0" : "hidden"}>
          {molecule ? (
            <Viewer3D
              molecule={molecule}
              representation={representation}
              showHydrogens={showHydrogens}
              showLabels={showLabels}
              selectedAtoms={selectedAtoms}
              fitSignal={fitSignal}
              zoomCommand={zoomCommand}
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
                  Enter a SMILES string or draw a structure in the 2D Editor, then generate a real three-dimensional conformer with RDKit ETKDGv3.
                </p>
                <div className="mt-5 inline-flex items-center gap-2 rounded-md border border-border bg-panel px-3 py-2 font-mono text-[11px] text-muted-foreground">
                  <span className="text-primary">SMILES / 2D</span><span>→</span><span>RDKit</span><span>→</span><span>3Dmol.js</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {molecule && viewMode === "3d" && (
          <div className="pointer-events-none absolute left-3 top-3 rounded-md border border-border/80 bg-panel/85 px-2.5 py-1.5 backdrop-blur-sm">
            <div className="text-[11px] font-medium">{molecule.name}</div>
            <div className="mt-0.5 font-mono text-[9px] text-muted-foreground">
              {molecule.formula} · {molecule.conformer.method} · Å
            </div>
          </div>
        )}
        {generating && (
          <div className="absolute inset-0 z-30 flex items-center justify-center bg-background/65 backdrop-blur-[2px]">
            <div className="flex items-center gap-3 rounded-lg border border-border bg-panel px-4 py-3 text-xs shadow-xl">
              <Loader2 size={17} className="animate-spin text-primary" />
              <div>
                <div className="font-medium">Generating 3D conformer</div>
                <div className="mt-0.5 text-[10px] text-muted-foreground">RDKit ETKDGv3 · explicit hydrogens</div>
              </div>
            </div>
          </div>
        )}
        {viewMode === "3d" && (
          <>
            <div className="pointer-events-none absolute bottom-3 left-3 flex gap-3 rounded-md bg-panel/75 px-2.5 py-1.5 text-[9px] text-muted-foreground backdrop-blur-sm">
              <span><b className="font-medium text-foreground">Left drag</b> rotate</span>
              <span><b className="font-medium text-foreground">Wheel / + −</b> zoom</span>
              <span><b className="font-medium text-foreground">Right drag</b> pan</span>
              <span><b className="font-medium text-foreground">Click atom</b> select</span>
            </div>
            <div className="pointer-events-none absolute bottom-3 right-3 font-mono text-[9px] text-muted-foreground">Coordinates / Å</div>
          </>
        )}
      </div>
    </main>
  );
}
