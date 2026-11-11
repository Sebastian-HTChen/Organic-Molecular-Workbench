import { AlertCircle, CheckCircle2, Loader2, X } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { optimizeGeometry } from "@/features/molecule/api";
import type { Molecule } from "@/features/molecule/types";

interface OptimizationDialogProps {
  open: boolean;
  molecule: Molecule | null;
  onOptimized: (molecule: Molecule) => void;
  onClose: () => void;
}

export function OptimizationDialog({ open, molecule, onOptimized, onClose }: OptimizationDialogProps) {
  const [method, setMethod] = useState<"MMFF94" | "UFF">("MMFF94");
  const [maxIterations, setMaxIterations] = useState(500);
  const [optimizing, setOptimizing] = useState(false);
  const [result, setResult] = useState<Molecule | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!open || !molecule) return null;

  async function optimize() {
    if (!molecule) return;
    setOptimizing(true);
    setError(null);
    setResult(null);
    try {
      const optimized = await optimizeGeometry(molecule.mol_block, molecule.name, method, maxIterations);
      setResult(optimized);
      onOptimized(optimized);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Geometry optimization failed.");
    } finally {
      setOptimizing(false);
    }
  }

  const optimization = result?.optimization;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4" role="presentation" onMouseDown={() => !optimizing && onClose()}>
      <section role="dialog" aria-modal="true" aria-labelledby="optimization-title" className="w-[460px] rounded-xl border border-border bg-panel shadow-2xl" onMouseDown={(event) => event.stopPropagation()}>
        <header className="flex h-12 items-center border-b border-border px-4">
          <div className="flex-1">
            <h2 id="optimization-title" className="text-sm font-semibold">Force-field geometry optimization</h2>
            <p className="mt-0.5 text-[10px] text-muted-foreground">{molecule.name} · {molecule.formula}</p>
          </div>
          <Button variant="ghost" size="icon-sm" aria-label="Close optimization" disabled={optimizing} onClick={onClose}><X size={15} /></Button>
        </header>
        <div className="space-y-4 p-4">
          <div className="grid grid-cols-2 gap-3">
            <label className="text-[11px] text-muted-foreground">Force field
              <select aria-label="Force field" className="text-input mt-1.5 h-8" value={method} disabled={optimizing} onChange={(event) => setMethod(event.target.value as "MMFF94" | "UFF")}>
                <option>MMFF94</option><option>UFF</option>
              </select>
            </label>
            <label className="text-[11px] text-muted-foreground">Maximum iterations
              <input aria-label="Maximum iterations" type="number" min={1} max={2000} className="text-input mt-1.5 h-8" value={maxIterations} disabled={optimizing} onChange={(event) => setMaxIterations(Number(event.target.value))} />
            </label>
          </div>
          <p className="text-[10px] leading-4 text-muted-foreground">
            MMFF94 is generally preferred for supported organic molecules. UFF covers more element types but has different accuracy limitations. Atom types and formal charges must be supported by the selected force field.
          </p>
          {optimization && (
            <div className="rounded-lg border border-primary/25 bg-primary/5 p-3">
              <div className="flex items-center gap-2 text-[11px] font-medium text-primary">
                <CheckCircle2 size={14} />
                {optimization.converged ? "Converged" : "Maximum iterations reached — not converged"}
              </div>
              <dl className="mt-3 space-y-2 text-[11px]">
                <div className="flex justify-between"><dt className="text-muted-foreground">Force field</dt><dd className="font-mono">{optimization.method}</dd></div>
                <div className="flex justify-between"><dt className="text-muted-foreground">Initial potential energy</dt><dd className="font-mono">{optimization.energy_before.toFixed(6)} kcal/mol</dd></div>
                <div className="flex justify-between"><dt className="text-muted-foreground">Final potential energy</dt><dd className="font-mono text-primary">{optimization.energy_after.toFixed(6)} kcal/mol</dd></div>
                <div className="flex justify-between"><dt className="text-muted-foreground">Energy change</dt><dd className="font-mono">{(optimization.energy_after - optimization.energy_before).toFixed(6)} kcal/mol</dd></div>
                <div className="flex justify-between"><dt className="text-muted-foreground">Minimization steps</dt><dd className="font-mono">{optimization.steps}</dd></div>
              </dl>
            </div>
          )}
          {error && <div role="alert" className="flex gap-2 rounded-md border border-red-500/30 bg-red-500/10 p-2.5 text-[11px] text-red-400"><AlertCircle size={14} className="shrink-0" />{error}</div>}
          <div className="rounded-md bg-muted p-2.5 text-[10px] leading-4 text-muted-foreground">
            These are <b>classical force-field potential energies</b>, not DFT total energies, enthalpies, or Gibbs free energies. They are not directly comparable between different force fields.
          </div>
        </div>
        <footer className="flex justify-end gap-2 border-t border-border px-4 py-3">
          <Button variant="outline" size="sm" disabled={optimizing} onClick={onClose}>Close</Button>
          <Button size="sm" disabled={optimizing} onClick={optimize}>
            {optimizing ? <Loader2 size={13} className="animate-spin" /> : null}
            {optimizing ? "Optimizing…" : optimization ? `Optimize again with ${method}` : `Optimize with ${method}`}
          </Button>
        </footer>
      </section>
    </div>
  );
}
