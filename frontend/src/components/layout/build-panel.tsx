import { AlertCircle, Box, Loader2 } from "lucide-react";
import type { FormEvent } from "react";

import { Button } from "@/components/ui/button";
import type { Molecule } from "@/features/molecule/types";

interface BuildPanelProps {
  smiles: string;
  name: string;
  molecule: Molecule | null;
  generating: boolean;
  error: string | null;
  onSmilesChange: (value: string) => void;
  onNameChange: (value: string) => void;
  onGenerate: () => void;
}

const examples = [
  { name: "Ethanol", smiles: "CCO" },
  { name: "Benzene", smiles: "c1ccccc1" },
  { name: "Acetic acid", smiles: "CC(=O)O" },
];
const elements = ["H", "C", "N", "O", "F", "P", "S", "Cl", "Br", "I"];

export function BuildPanel({
  smiles,
  name,
  molecule,
  generating,
  error,
  onSmilesChange,
  onNameChange,
  onGenerate,
}: BuildPanelProps) {
  function submit(event: FormEvent) {
    event.preventDefault();
    onGenerate();
  }

  return (
    <aside className="flex min-h-0 flex-col bg-panel">
      <div className="panel-heading">
        <span>Structure builder</span>
        <span className="font-mono text-[9px] normal-case tracking-normal">RDKit</span>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <form onSubmit={submit} className="border-b border-border p-3">
          <label htmlFor="molecule-name" className="field-label">Molecule name</label>
          <input
            id="molecule-name"
            className="text-input mb-3 h-8"
            value={name}
            maxLength={120}
            placeholder="Untitled molecule"
            onChange={(event) => onNameChange(event.target.value)}
          />
          <div className="mb-1.5 flex items-center justify-between">
            <label htmlFor="smiles-input" className="text-[11px] font-medium text-muted-foreground">
              SMILES
            </label>
            <span className="text-[9px] text-muted-foreground">1–10,000 chars</span>
          </div>
          <textarea
            id="smiles-input"
            className="text-input h-20 resize-none py-2 font-mono leading-5"
            value={smiles}
            maxLength={10000}
            spellCheck={false}
            placeholder="e.g. CCO"
            onChange={(event) => onSmilesChange(event.target.value)}
          />
          <Button
            type="submit"
            className="mt-2.5 w-full"
            disabled={!smiles.trim() || generating}
          >
            {generating ? <Loader2 size={14} className="animate-spin" /> : <Box size={14} />}
            {generating ? "Generating conformer…" : "Generate 3D structure"}
          </Button>
          {error && (
            <div role="alert" className="mt-2.5 flex gap-2 rounded-md border border-red-500/30 bg-red-500/10 p-2.5 text-[11px] leading-4 text-red-400">
              <AlertCircle size={14} className="mt-px shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </form>

        <section className="border-b border-border p-3">
          <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Examples
          </h3>
          <div className="space-y-1">
            {examples.map((example) => (
              <button
                key={example.smiles}
                type="button"
                className="group flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left hover:bg-muted"
                onClick={() => {
                  onNameChange(example.name);
                  onSmilesChange(example.smiles);
                }}
              >
                <span className="text-[11px] text-foreground">{example.name}</span>
                <code className="text-[10px] text-muted-foreground group-hover:text-primary">
                  {example.smiles}
                </code>
              </button>
            ))}
          </div>
        </section>

        {molecule && (
          <section className="border-b border-border p-3">
            <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Current structure
            </h3>
            <div className="rounded-md border border-border bg-background p-2.5">
              <div className="mb-1 text-[11px] font-medium">{molecule.name}</div>
              <code className="block break-all text-[10px] leading-4 text-primary">
                {molecule.canonical_smiles}
              </code>
              <div className="mt-2 grid grid-cols-2 gap-1 text-[10px] text-muted-foreground">
                <span>{molecule.atom_count} atoms</span>
                <span>{molecule.bond_count} bonds</span>
              </div>
            </div>
          </section>
        )}

        <section className="p-3 opacity-55">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Atom palette
            </h3>
            <span className="rounded border border-border px-1 py-0.5 text-[8px] text-muted-foreground">
              PHASE 2
            </span>
          </div>
          <div className="grid grid-cols-5 gap-1.5">
            {elements.map((element) => (
              <button
                key={element}
                type="button"
                disabled
                title={`${element} atom drawing is planned for Phase 2`}
                className="h-7 rounded border border-border font-mono text-[11px] text-muted-foreground"
              >
                {element}
              </button>
            ))}
          </div>
          <p className="mt-2 text-[10px] leading-4 text-muted-foreground">
            Ketcher drawing, atom editing, and bond tools will operate on the same molecular model.
          </p>
        </section>
      </div>
    </aside>
  );
}
