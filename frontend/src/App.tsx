import { CheckCircle2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { OptimizationDialog } from "@/components/calculation/optimization-dialog";
import { OrcaDialog } from "@/components/calculation/orca-dialog";
import { ImportDialog } from "@/components/imports/import-dialog";
import { BuildPanel } from "@/components/layout/build-panel";
import { PropertiesPanel } from "@/components/layout/properties-panel";
import { SettingsDialog } from "@/components/layout/settings-dialog";
import { StatusBar } from "@/components/layout/status-bar";
import { ToolRail } from "@/components/layout/tool-rail";
import { TopBar } from "@/components/layout/top-bar";
import { ResizeHandle } from "@/components/ui/resize-handle";
import type { KetcherEditorHandle, KetcherEditorTool } from "@/components/viewport/ketcher-editor";
import { MoleculeViewport } from "@/components/viewport/molecule-viewport";
import { ApiError, generateFromMolBlock, generateFromSmiles, getHealth } from "@/features/molecule/api";
import { downloadMolecule } from "@/features/molecule/export";
import { toggleSelection } from "@/features/molecule/molecule-utils";
import type { ExportFormat, Molecule } from "@/features/molecule/types";

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

export default function App() {
  const [molecule, setMolecule] = useState<Molecule | null>(null);
  const [smiles, setSmiles] = useState("CCO");
  const [name, setName] = useState("Ethanol");
  const [selection, setSelection] = useState<number[]>([]);
  const [generating, setGenerating] = useState(false);
  const [viewMode, setViewMode] = useState<"2d" | "3d">("3d");
  const [activeElement, setActiveElement] = useState("C");
  const [activeTool, setActiveTool] = useState<KetcherEditorTool>("select");
  const [editorReady, setEditorReady] = useState(false);
  const [editorHistory, setEditorHistory] = useState({ undo: 0, redo: 0 });
  const editorRef = useRef<KetcherEditorHandle>(null);
  const [error, setError] = useState<string | null>(null);
  const [backend, setBackend] = useState<"checking" | "online" | "offline">("checking");
  const [rdkitVersion, setRdkitVersion] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [orcaOpen, setOrcaOpen] = useState(false);
  const [optimizationOpen, setOptimizationOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [library, setLibrary] = useState<Molecule[]>([]);
  const [orcaPrompt, setOrcaPrompt] = useState(false);
  const [theme, setTheme] = useState<"dark" | "light">(() =>
    window.localStorage.getItem("omw-theme") === "light" ? "light" : "dark",
  );
  const [leftWidth, setLeftWidth] = useState(244);
  const [rightWidth, setRightWidth] = useState(310);
  const [toast, setToast] = useState<string | null>(null);
  const requestId = useRef(0);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    window.localStorage.setItem("omw-theme", theme);
  }, [theme]);

  useEffect(() => {
    let active = true;
    getHealth()
      .then((health) => {
        if (!active) return;
        setBackend("online");
        setRdkitVersion(health.rdkit_version);
      })
      .catch(() => {
        if (!active) return;
        setBackend("offline");
        setRdkitVersion(null);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => {
      setToast(null);
      setOrcaPrompt(false);
    }, orcaPrompt ? 8000 : 3500);
    return () => window.clearTimeout(timer);
  }, [toast, orcaPrompt]);

  async function handleGenerate() {
    if ((viewMode === "3d" && !smiles.trim()) || generating) return;
    const currentRequest = ++requestId.current;
    setGenerating(true);
    setError(null);
    try {
      const result = viewMode === "2d"
        ? await generateFromMolBlock(await editorRef.current!.getMolfile(), name)
        : await generateFromSmiles(smiles, name);
      if (currentRequest !== requestId.current) return;
      setMolecule(result);
      setSmiles(result.canonical_smiles);
      setViewMode("3d");
      setSelection([]);
      setBackend("online");
      setToast(`${result.name} · 3D conformer generated with RDKit`);
    } catch (caught) {
      if (currentRequest !== requestId.current) return;
      const message = caught instanceof ApiError
        ? caught.message
        : "Unexpected error while generating the molecule.";
      setError(message);
      if (caught instanceof ApiError && caught.code === "backend_unavailable") {
        setBackend("offline");
      }
    } finally {
      if (currentRequest === requestId.current) setGenerating(false);
    }
  }

  function handleNew() {
    requestId.current += 1;
    setMolecule(null);
    setSelection([]);
    setSmiles("");
    setName("Untitled molecule");
    void editorRef.current?.clear();
    setGenerating(false);
    setError(null);
    setToast("New empty molecule workspace");
  }

  function openMolecule(opened: Molecule) {
    setMolecule(opened);
    setName(opened.name);
    setSmiles(opened.canonical_smiles);
    setSelection([]);
    setViewMode("3d");
    setImportOpen(false);
    setError(null);
  }

  function updateMolecule(updated: Molecule) {
    setMolecule(updated);
    setLibrary((current) => current.map((item) => item.id === updated.id ? updated : item));
  }

  function handleExport(format: ExportFormat) {
    if (!molecule) return;
    if (format === "smiles" && !molecule.canonical_smiles.trim()) {
      setError("Canonical SMILES is unavailable for this topology. Export XYZ, MOL or SDF instead, or review the structure first.");
      setToast(null);
      return;
    }
    downloadMolecule(molecule, format);
    setOrcaPrompt(format === "xyz" || format === "smiles");
    setToast(
      format === "xyz"
        ? "XYZ exported · bond-order topology is not included"
        : `${format.toUpperCase()} exported successfully`,
    );
  }

  return (
    <div className="flex h-screen min-w-[960px] flex-col bg-background text-foreground">
      <TopBar
        molecule={molecule}
        canGenerate={viewMode === "2d" ? editorReady : Boolean(smiles.trim())}
        generating={generating}
        onNew={handleNew}
        onGenerate={handleGenerate}
        onExport={handleExport}
        onOptimize={() => setOptimizationOpen(true)}
        onOpenImport={() => setImportOpen(true)}
        onGenerateOrca={() => {
          setOrcaPrompt(false);
          setToast(null);
          setOrcaOpen(true);
        }}
        onOpenSettings={() => setSettingsOpen(true)}
        canUndo={editorHistory.undo > 0}
        canRedo={editorHistory.redo > 0}
        onUndo={() => {
          setViewMode("2d");
          editorRef.current?.undo();
        }}
        onRedo={() => {
          setViewMode("2d");
          editorRef.current?.redo();
        }}
      />
      <div className="flex min-h-0 flex-1">
        <ToolRail
          activeElement={activeElement}
          activeTool={activeTool}
          disabled={!editorReady}
          onToolSelect={(tool) => {
            setActiveTool(tool);
            setViewMode("2d");
            if (tool === "atom") editorRef.current?.setElement(activeElement);
            else editorRef.current?.setTool(tool);
          }}
        />
        <div style={{ width: leftWidth }} className="min-h-0 shrink-0">
          <BuildPanel
            library={library}
            onLibrarySelect={openMolecule}
            smiles={smiles}
            name={name}
            molecule={molecule}
            generating={generating}
            error={error}
            onSmilesChange={setSmiles}
            onNameChange={setName}
            activeElement={activeElement}
            paletteDisabled={!editorReady}
            onElementSelect={(element) => {
              setActiveElement(element);
              setActiveTool("atom");
              setViewMode("2d");
              editorRef.current?.setElement(element);
            }}
            onGenerate={handleGenerate}
          />
        </div>
        <ResizeHandle
          side="left"
          onResize={(delta) => setLeftWidth(clamp(leftWidth + delta, 210, 360))}
        />
        <MoleculeViewport
          molecule={molecule}
          generating={generating}
          selectedAtoms={selection}
          theme={theme}
          viewMode={viewMode}
          editorRef={editorRef}
          onViewModeChange={setViewMode}
          onEditorReady={() => setEditorReady(true)}
          onHistoryChange={setEditorHistory}
          onSelect={(atomIndex) => setSelection((current) => toggleSelection(current, atomIndex))}
        />
        <ResizeHandle
          side="right"
          onResize={(delta) => setRightWidth(clamp(rightWidth + delta, 280, 430))}
        />
        <div style={{ width: rightWidth }} className="min-h-0 shrink-0">
          <PropertiesPanel molecule={molecule} selection={selection} onSelectionChange={setSelection} onMoleculeUpdate={updateMolecule} />
        </div>
      </div>
      <StatusBar
        backend={backend}
        rdkitVersion={rdkitVersion}
        molecule={molecule}
        selectedCount={selection.length}
      />

      <ImportDialog
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImported={(result) => {
          setLibrary((current) => [...current, ...result.molecules]);
          if (result.molecules.length > 0) {
            openMolecule(result.molecules[0]);
            if (result.failures.length > 0) setImportOpen(true);
          } else setImportOpen(true);
        }}
        onOpenMolecule={openMolecule}
      />
      <OptimizationDialog
        open={optimizationOpen}
        molecule={molecule}
        onOptimized={(optimized) => {
          setMolecule(optimized);
          setViewMode("3d");
          const result = optimized.optimization;
          if (result) {
            setToast(`${result.method} · ${result.converged ? "converged" : "not converged"} · ${result.energy_after.toFixed(4)} kcal/mol`);
          }
        }}
        onClose={() => setOptimizationOpen(false)}
      />
      <OrcaDialog open={orcaOpen} molecule={molecule} onClose={() => setOrcaOpen(false)} />
      <SettingsDialog
        open={settingsOpen}
        theme={theme}
        onThemeChange={setTheme}
        onClose={() => setSettingsOpen(false)}
      />
      {toast && (
        <div role="status" className="animate-fade-in fixed bottom-9 right-4 z-40 flex max-w-md items-center gap-2 rounded-lg border border-border bg-panel px-3 py-2.5 text-[11px] shadow-xl">
          <CheckCircle2 size={14} className="shrink-0 text-primary" />
          <span>{toast}</span>
          {orcaPrompt && (
            <button
              type="button"
              className="shrink-0 rounded border border-primary/40 px-2 py-1 font-medium text-primary hover:bg-primary/10"
              onClick={() => {
                setOrcaOpen(true);
                setOrcaPrompt(false);
                setToast(null);
              }}
            >
              Generate ORCA .inp?
            </button>
          )}
        </div>
      )}
    </div>
  );
}
