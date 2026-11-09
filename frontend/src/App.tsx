import { CheckCircle2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { BuildPanel } from "@/components/layout/build-panel";
import { PropertiesPanel } from "@/components/layout/properties-panel";
import { SettingsDialog } from "@/components/layout/settings-dialog";
import { StatusBar } from "@/components/layout/status-bar";
import { ToolRail } from "@/components/layout/tool-rail";
import { TopBar } from "@/components/layout/top-bar";
import { ResizeHandle } from "@/components/ui/resize-handle";
import { MoleculeViewport } from "@/components/viewport/molecule-viewport";
import { ApiError, generateFromSmiles, getHealth } from "@/features/molecule/api";
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
  const [error, setError] = useState<string | null>(null);
  const [backend, setBackend] = useState<"checking" | "online" | "offline">("checking");
  const [rdkitVersion, setRdkitVersion] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
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
    const timer = window.setTimeout(() => setToast(null), 3500);
    return () => window.clearTimeout(timer);
  }, [toast]);

  async function handleGenerate() {
    if (!smiles.trim() || generating) return;
    const currentRequest = ++requestId.current;
    setGenerating(true);
    setError(null);
    try {
      const result = await generateFromSmiles(smiles, name);
      if (currentRequest !== requestId.current) return;
      setMolecule(result);
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
    setGenerating(false);
    setError(null);
    setToast("New empty molecule workspace");
  }

  function handleExport(format: ExportFormat) {
    if (!molecule) return;
    downloadMolecule(molecule, format);
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
        canGenerate={Boolean(smiles.trim())}
        generating={generating}
        onNew={handleNew}
        onGenerate={handleGenerate}
        onExport={handleExport}
        onOpenSettings={() => setSettingsOpen(true)}
      />
      <div className="flex min-h-0 flex-1">
        <ToolRail />
        <div style={{ width: leftWidth }} className="min-h-0 shrink-0">
          <BuildPanel
            smiles={smiles}
            name={name}
            molecule={molecule}
            generating={generating}
            error={error}
            onSmilesChange={setSmiles}
            onNameChange={setName}
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
          onSelect={(atomIndex) => setSelection((current) => toggleSelection(current, atomIndex))}
        />
        <ResizeHandle
          side="right"
          onResize={(delta) => setRightWidth(clamp(rightWidth + delta, 280, 430))}
        />
        <div style={{ width: rightWidth }} className="min-h-0 shrink-0">
          <PropertiesPanel molecule={molecule} selection={selection} onSelectionChange={setSelection} />
        </div>
      </div>
      <StatusBar
        backend={backend}
        rdkitVersion={rdkitVersion}
        molecule={molecule}
        selectedCount={selection.length}
      />

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
        </div>
      )}
    </div>
  );
}
