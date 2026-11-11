import * as $3Dmol from "3dmol";
import type { AtomSpec, AtomStyleSpec, GLViewer } from "3dmol";
import { useEffect, useRef, useState } from "react";

import type { Molecule, Representation } from "@/features/molecule/types";

interface Viewer3DProps {
  molecule: Molecule;
  representation: Representation;
  showHydrogens: boolean;
  showLabels: boolean;
  selectedAtoms: number[];
  fitSignal: number;
  zoomCommand: { direction: 1 | -1; serial: number };
  theme: "dark" | "light";
  onSelect: (atomIndex: number) => void;
}

function getStyle(representation: Representation): AtomStyleSpec {
  if (representation === "space-filling") {
    return {
      sphere: { scale: 1, colorscheme: "Jmol" },
      stick: { hidden: true },
      clicksphere: { radius: 0.5 },
    };
  }
  if (representation === "stick") {
    return {
      sphere: { scale: 0.08, colorscheme: "Jmol" },
      stick: { radius: 0.13, colorscheme: "Jmol", showNonBonded: true },
      clicksphere: { radius: 0.45 },
    };
  }
  return {
    sphere: { scale: 0.3, colorscheme: "Jmol" },
    stick: { radius: 0.14, colorscheme: "Jmol", showNonBonded: true },
    clicksphere: { radius: 0.45 },
  };
}

export function Viewer3D({
  molecule,
  representation,
  showHydrogens,
  showLabels,
  selectedAtoms,
  fitSignal,
  zoomCommand,
  theme,
  onSelect,
}: Viewer3DProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<GLViewer | null>(null);
  const onSelectRef = useRef(onSelect);
  const [viewerError, setViewerError] = useState<string | null>(null);
  onSelectRef.current = onSelect;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    let viewer: GLViewer;
    try {
      viewer = $3Dmol.createViewer(container, { antialias: true, orthographic: false });
      viewer.setBackgroundColor(theme === "dark" ? "#0b1114" : "#f4f7f8", 1);
      viewerRef.current = viewer;
    } catch {
      setViewerError("WebGL could not be initialized. Enable hardware acceleration and reload.");
      return;
    }

    const observer = new ResizeObserver(() => {
      viewer.resize();
      viewer.render();
    });
    observer.observe(container);
    return () => {
      observer.disconnect();
      viewer.clear();
      viewerRef.current = null;
      container.replaceChildren();
    };
  }, []);

  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;
    viewer.clear();
    viewer.addModel(molecule.mol_block, "sdf", { keepH: true });
    viewer.setClickable({}, true, (atom: AtomSpec) => {
      if (atom.index !== undefined) onSelectRef.current(atom.index + 1);
    });
    viewer.zoomTo();
    viewer.render();
  }, [molecule.id, molecule.mol_block]);

  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;
    viewer.setBackgroundColor(theme === "dark" ? "#0b1114" : "#f4f7f8", 1);
    viewer.setStyle({}, getStyle(representation));
    if (!showHydrogens) {
      viewer.setStyle(
        { elem: "H" },
        { sphere: { hidden: true }, stick: { hidden: true }, clicksphere: { hidden: true } },
      );
    }

    if (selectedAtoms.length > 0) {
      viewer.addStyle(
        { index: selectedAtoms.map((index) => index - 1) },
        {
          sphere: {
            scale: representation === "space-filling" ? 1.08 : 0.43,
            color: "#22d3ee",
            opacity: 0.48,
          },
        },
      );
    }

    viewer.removeAllLabels();
    const labeledAtoms = molecule.atoms.filter(
      (atom) =>
        (showLabels || selectedAtoms.includes(atom.index)) &&
        (showHydrogens || atom.element !== "H"),
    );
    for (const atom of labeledAtoms) {
      viewer.addLabel(String(atom.index), {
        position: atom.position,
        fontSize: 11,
        fontColor: theme === "dark" ? "#e5f4f4" : "#172126",
        backgroundColor: selectedAtoms.includes(atom.index) ? "#0e7490" : "#334155",
        backgroundOpacity: 0.78,
        borderThickness: 0,
        inFront: true,
      });
    }
    viewer.render();
  }, [molecule, representation, showHydrogens, showLabels, selectedAtoms, theme]);

  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;
    viewer.zoomTo();
    viewer.render();
  }, [fitSignal]);

  useEffect(() => {
    if (zoomCommand.serial === 0) return;
    const viewer = viewerRef.current;
    if (!viewer) return;
    viewer.zoom(zoomCommand.direction === 1 ? 1.25 : 0.8, 150);
    viewer.render();
  }, [zoomCommand]);

  return (
    <div className="absolute inset-0">
      <div ref={containerRef} className="viewer-canvas" aria-label="Interactive 3D molecular viewer" />
      {viewerError && (
        <div role="alert" className="absolute inset-0 flex items-center justify-center p-8 text-center text-xs text-red-400">
          {viewerError}
        </div>
      )}
    </div>
  );
}
