import { AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { updateStructureSettings } from "@/features/imports/api";
import type { Molecule } from "@/features/molecule/types";

export function StructureSettings({ molecule, onUpdated }: { molecule: Molecule; onUpdated: (molecule: Molecule) => void }) {
  const [charge, setCharge] = useState(molecule.provenance.total_charge);
  const [multiplicity, setMultiplicity] = useState(molecule.provenance.multiplicity);
  const [confirmed, setConfirmed] = useState(molecule.provenance.topology_confirmed);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setCharge(molecule.provenance.total_charge);
    setMultiplicity(molecule.provenance.multiplicity);
    setConfirmed(molecule.provenance.topology_confirmed);
    setError(null);
  }, [molecule.id, molecule.provenance]);

  async function save() {
    setLoading(true);
    setError(null);
    try {
      onUpdated(await updateStructureSettings(molecule, charge, multiplicity, confirmed));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not update structure settings.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="border-b border-border p-3" data-testid="structure-settings" data-charge-source={molecule.provenance.charge_source} data-charge={molecule.provenance.total_charge} data-spin={molecule.provenance.multiplicity} data-topology={molecule.provenance.topology_source}>
      <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Structure provenance & settings</h3>
      <div className="mb-2 grid grid-cols-2 gap-2 font-mono text-[9px] text-muted-foreground">
        <span>Format: {molecule.provenance.source_format}</span>
        <span>Topology: {molecule.provenance.topology_source}</span>
      </div>
      {molecule.provenance.filename && <div className="mb-2 break-all font-mono text-[9px] text-muted-foreground">{molecule.provenance.filename}</div>}
      {molecule.provenance.input_sha256 && (
        <details className="mb-2 text-[9px] text-muted-foreground">
          <summary className="cursor-pointer">Input metadata & SHA-256</summary>
          <div className="mt-1 break-all font-mono">{molecule.provenance.input_sha256}</div>
          <dl className="mt-1 space-y-1">{Object.entries(molecule.provenance.metadata).map(([key, value]) => <div key={key} className="grid grid-cols-[auto_1fr] gap-2"><dt>{key}:</dt><dd className="break-all text-right">{value}</dd></div>)}</dl>
        </details>
      )}
      <div className="grid grid-cols-2 gap-2">
        <label className="text-[10px] text-muted-foreground">Total charge
          <input aria-label="Structure total charge" type="number" min={-20} max={20} value={charge} onChange={(event) => setCharge(Number(event.target.value))} className="text-input mt-1 h-7" />
        </label>
        <label className="text-[10px] text-muted-foreground">Multiplicity
          <input aria-label="Structure multiplicity" type="number" min={1} max={10} value={multiplicity} onChange={(event) => setMultiplicity(Number(event.target.value))} className="text-input mt-1 h-7" />
        </label>
      </div>
      <label className="mt-2.5 flex items-start gap-2 text-[10px] leading-4 text-muted-foreground">
        <input type="checkbox" checked={confirmed} disabled={molecule.provenance.topology_confirmed || (molecule.bond_count === 0 && molecule.atom_count > 1)} onChange={(event) => setConfirmed(event.target.checked)} className="mt-0.5" />
        <span>I have reviewed the atom connectivity and inferred bonds. File-provided topology remains distinguishable from user confirmation.</span>
      </label>
      <p className="mt-2 text-[9px] leading-4 text-muted-foreground">These settings annotate the structure for subsequent calculations; they do not rewrite atom formal charges or connectivity. For a metal complex, review coordination bonds manually instead of applying organic valence rules.</p>
      <Button type="button" size="sm" variant="outline" className="mt-2.5 w-full" disabled={loading} onClick={save}>
        {loading ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />} Save structure settings
      </Button>
      {error && <p role="alert" className="mt-2 text-[10px] text-red-400">{error}</p>}
      {molecule.provenance.warnings.length > 0 && (
        <div className="mt-3 rounded-md border border-amber-500/25 bg-amber-500/5 p-2.5">
          <div className="mb-1.5 flex items-center gap-1.5 text-[10px] font-medium text-amber-400"><AlertTriangle size={12} /> Parsing and chemistry warnings</div>
          <ul className="list-disc space-y-1 pl-4 text-[9px] leading-4 text-muted-foreground">
            {molecule.provenance.warnings.map((warning) => <li key={warning}>{warning}</li>)}
          </ul>
        </div>
      )}
    </section>
  );
}
