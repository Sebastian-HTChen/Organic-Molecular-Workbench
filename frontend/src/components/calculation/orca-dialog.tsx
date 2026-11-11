import { AlertCircle, Check, Clipboard, Download, FileCode2, Loader2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { generateOrcaInput } from "@/features/calculation/api";
import { orcaRecommendations } from "@/features/calculation/recommendations";
import type { OrcaConfig, OrcaInput, OrcaTask } from "@/features/calculation/types";
import type { Molecule } from "@/features/molecule/types";

interface OrcaDialogProps {
  open: boolean;
  molecule: Molecule | null;
  onClose: () => void;
}

const functionals = ["B3LYP", "PBE0", "PBE", "TPSS", "M06-2X", "wB97X-D3"];
const basisSets = ["def2-SVP", "def2-TZVP", "def2-TZVPP", "def2-QZVP", "6-31G(d)", "6-311+G(d,p)"];
const tasks: { value: OrcaTask; label: string; detail: string }[] = [
  { value: "single_point", label: "Single-point energy", detail: "SP · current coordinates only" },
  { value: "optimization", label: "Geometry optimization", detail: "Opt · relax the structure" },
  { value: "frequency", label: "Frequency calculation", detail: "Freq · current coordinates" },
  { value: "opt_freq", label: "Optimization + frequency", detail: "Opt Freq · sequential steps" },
];

export function OrcaDialog({ open, molecule, onClose }: OrcaDialogProps) {
  const [config, setConfig] = useState<OrcaConfig>({
    functional: "B3LYP", basis_set: "def2-SVP", task: "optimization",
    charge: 0, multiplicity: 1, nprocs: 4, maxcore_mb: 2000,
  });
  const [result, setResult] = useState<OrcaInput | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const requestId = useRef(0);

  useEffect(() => {
    if (!open || !molecule) return;
    setConfig((current) => ({
      ...current,
      charge: molecule.atoms.reduce((sum, atom) => sum + atom.formal_charge, 0),
    }));
  }, [open, molecule]);

  useEffect(() => {
    if (!open || !molecule) return;
    const currentRequest = ++requestId.current;
    setLoading(true);
    setError(null);
    const timer = window.setTimeout(() => {
      generateOrcaInput(molecule.mol_block, molecule.name, config)
        .then((input) => {
          if (currentRequest === requestId.current) setResult(input);
        })
        .catch((caught: Error) => {
          if (currentRequest === requestId.current) setError(caught.message);
        })
        .finally(() => {
          if (currentRequest === requestId.current) setLoading(false);
        });
    }, 250);
    return () => window.clearTimeout(timer);
  }, [open, molecule, config]);

  useEffect(() => {
    if (!open) return;
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  if (!open || !molecule) return null;

  function update<K extends keyof OrcaConfig>(key: K, value: OrcaConfig[K]) {
    setConfig((current) => ({ ...current, [key]: value }));
  }

  function download() {
    if (!result) return;
    const url = URL.createObjectURL(new Blob([result.input_text], { type: "text/plain;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = result.filename;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-5" role="presentation" onMouseDown={onClose}>
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="orca-title"
        className="animate-fade-in flex h-[min(820px,94vh)] w-[min(960px,96vw)] flex-col rounded-xl border border-border bg-panel shadow-2xl"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border px-5">
          <FileCode2 size={19} className="text-primary" />
          <div className="flex-1">
            <h2 id="orca-title" className="text-sm font-semibold">ORCA input generator</h2>
            <p className="mt-0.5 text-[10px] text-muted-foreground">{molecule.name} · {molecule.formula} · coordinates in Ångström</p>
          </div>
          <span className="rounded border border-border px-2 py-1 font-mono text-[9px] text-muted-foreground">INPUT ONLY · NOT SUBMITTED</span>
          <Button variant="ghost" size="icon-sm" aria-label="Close ORCA input generator" onClick={onClose}><X size={16} /></Button>
        </header>

        <div className="grid min-h-0 flex-1 grid-cols-[360px_1fr]">
          <div className="min-h-0 overflow-y-auto border-r border-border p-4">
            <h3 className="mb-2.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Calculation type</h3>
            <div className="space-y-1.5">
              {tasks.map((task) => (
                <button
                  type="button"
                  key={task.value}
                  aria-pressed={config.task === task.value}
                  onClick={() => update("task", task.value)}
                  className={`w-full rounded-md border px-3 py-2 text-left ${config.task === task.value ? "border-primary bg-primary/10" : "border-border hover:bg-muted"}`}
                >
                  <span className="block text-[11px] font-medium">{task.label}</span>
                  <span className="mt-0.5 block font-mono text-[9px] text-muted-foreground">{task.detail}</span>
                </button>
              ))}
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <label className="text-[10px] text-muted-foreground">Functional
                <select aria-label="DFT functional" className="text-input mt-1.5 h-8" value={config.functional} onChange={(event) => update("functional", event.target.value)}>
                  {functionals.map((value) => <option key={value}>{value}</option>)}
                </select>
              </label>
              <label className="text-[10px] text-muted-foreground">Basis set
                <select aria-label="Basis set" className="text-input mt-1.5 h-8" value={config.basis_set} onChange={(event) => update("basis_set", event.target.value)}>
                  {basisSets.map((value) => <option key={value}>{value}</option>)}
                </select>
              </label>
              <label className="text-[10px] text-muted-foreground">Total charge
                <input aria-label="Total charge" type="number" min={-20} max={20} className="text-input mt-1.5 h-8" value={config.charge} onChange={(event) => update("charge", Number(event.target.value))} />
              </label>
              <label className="text-[10px] text-muted-foreground">Multiplicity 2S+1
                <input aria-label="Spin multiplicity" type="number" min={1} max={10} className="text-input mt-1.5 h-8" value={config.multiplicity} onChange={(event) => update("multiplicity", Number(event.target.value))} />
              </label>
              <label className="text-[10px] text-muted-foreground">CPU cores
                <input aria-label="CPU cores" type="number" min={1} max={64} className="text-input mt-1.5 h-8" value={config.nprocs} onChange={(event) => update("nprocs", Number(event.target.value))} />
              </label>
              <label className="text-[10px] text-muted-foreground">Memory / core (MB)
                <input aria-label="Memory per core" type="number" min={256} max={65536} step={256} className="text-input mt-1.5 h-8" value={config.maxcore_mb} onChange={(event) => update("maxcore_mb", Number(event.target.value))} />
              </label>
            </div>
            <p className="mt-3 rounded-md bg-muted p-2.5 text-[10px] leading-4 text-muted-foreground">
              Charge defaults to the structure's total formal charge. Verify spin multiplicity, especially for metals and radicals. `%maxcore` is per CPU core, not total memory.
            </p>
          </div>

          <div className="flex min-h-0 flex-col p-4">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Input preview</h3>
              {loading && <span className="flex items-center gap-1 text-[10px] text-muted-foreground"><Loader2 size={11} className="animate-spin" /> Updating</span>}
            </div>
            <pre className="min-h-0 flex-1 overflow-auto rounded-lg border border-border bg-background p-4 font-mono text-[11px] leading-5 text-foreground">{result?.input_text ?? "Configure the calculation to generate a preview."}</pre>
            {error && <div role="alert" className="mt-2 flex gap-2 text-[11px] text-red-400"><AlertCircle size={14} />{error}</div>}
            <div className="mt-3 flex items-center gap-2">
              <Button size="sm" disabled={!result || loading || Boolean(error)} onClick={download}><Download size={13} /> Download .inp</Button>
              <Button size="sm" variant="outline" disabled={!result || loading || Boolean(error)} onClick={async () => {
                if (!result) return;
                await navigator.clipboard.writeText(result.input_text);
                setCopied(true);
                window.setTimeout(() => setCopied(false), 1500);
              }}>{copied ? <Check size={13} /> : <Clipboard size={13} />}{copied ? "Copied" : "Copy"}</Button>
              <span className="ml-auto text-[9px] text-muted-foreground">No energy or job status is reported.</span>
            </div>
          </div>
        </div>

        <footer className="max-h-[220px] shrink-0 overflow-y-auto border-t border-border p-4">
          <h3 className="mb-2.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Suggested starting configurations</h3>
          <div className="grid grid-cols-2 gap-2">
            {orcaRecommendations.map((recommendation) => (
              <button
                type="button"
                key={recommendation.name}
                onClick={() => setConfig((current) => ({ ...current, ...recommendation.config }))}
                className="rounded-md border border-border p-2.5 text-left hover:border-primary/50 hover:bg-primary/5"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-medium">{recommendation.name}</span>
                  <code className="shrink-0 text-[9px] text-primary">{recommendation.config.functional}/{recommendation.config.basis_set}</code>
                </div>
                <p className="mt-1 text-[9px] leading-4 text-muted-foreground">{recommendation.description}</p>
              </button>
            ))}
          </div>
        </footer>
      </section>
    </div>
  );
}
