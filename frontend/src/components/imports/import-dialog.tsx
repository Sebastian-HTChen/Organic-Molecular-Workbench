import { AlertCircle, FileUp, Loader2, X } from "lucide-react";
import { useRef, useState } from "react";
import type { DragEvent } from "react";

import { Button } from "@/components/ui/button";
import { importMolecules } from "@/features/imports/api";
import type { ImportResult } from "@/features/imports/api";
import type { Molecule } from "@/features/molecule/types";

interface ImportDialogProps {
  open: boolean;
  onClose: () => void;
  onImported: (result: ImportResult) => void;
  onOpenMolecule: (molecule: Molecule) => void;
}

export function ImportDialog({ open, onClose, onImported, onOpenMolecule }: ImportDialogProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  if (!open) return null;

  async function upload(files: File[]) {
    if (!files.length) return;
    if (files.length > 50) {
      setError("Select no more than 50 files per batch. No files were imported.");
      return;
    }
    if (files.some((file) => file.size === 0)) {
      setError("Empty files cannot be parsed. Remove them and retry.");
      return;
    }
    if (files.some((file) => file.size > 5_000_000)) {
      setError("Each text structure file must be no larger than 5 MB.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const imported = await importMolecules(files.slice(0, 50));
      setResult(imported);
      onImported(imported);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "File import failed.");
    } finally {
      setLoading(false);
    }
  }

  function drop(event: DragEvent) {
    event.preventDefault();
    setDragging(false);
    void upload(Array.from(event.dataTransfer.files));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4" role="presentation" onMouseDown={onClose}>
      <section role="dialog" aria-modal="true" aria-labelledby="import-title" className="flex max-h-[85vh] w-[650px] flex-col rounded-xl border border-border bg-panel shadow-2xl" onMouseDown={(event) => event.stopPropagation()}>
        <header className="flex h-12 shrink-0 items-center border-b border-border px-4">
          <FileUp size={17} className="mr-2 text-primary" />
          <h2 id="import-title" className="flex-1 text-sm font-semibold">Import molecular structures</h2>
          <Button variant="ghost" size="icon-sm" aria-label="Close import" onClick={onClose}><X size={15} /></Button>
        </header>
        <div className="min-h-0 overflow-y-auto p-4">
          <input ref={inputRef} type="file" multiple accept=".xyz,.extxyz,.sdf,.mol,.mol2,.pdb" className="hidden" onChange={(event) => {
            void upload(Array.from(event.target.files ?? []));
            event.target.value = "";
          }} />
          <button
            type="button"
            disabled={loading}
            onClick={() => inputRef.current?.click()}
            onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={drop}
            className={`flex h-36 w-full flex-col items-center justify-center rounded-lg border-2 border-dashed transition-colors ${dragging ? "border-primary bg-primary/10" : "border-border bg-background hover:border-primary/60"}`}
          >
            {loading ? <Loader2 size={25} className="mb-3 animate-spin text-primary" /> : <FileUp size={25} className="mb-3 text-primary" />}
            <span className="text-xs font-medium">{loading ? "Parsing structures with RDKit…" : "Drop structure files here, or click to browse"}</span>
            <span className="mt-2 font-mono text-[10px] text-muted-foreground">XYZ / Extended XYZ · SDF / MOL · MOL2 · PDB · up to 50 files</span>
          </button>
          {error && <div role="alert" className="mt-3 flex gap-2 text-[11px] text-red-400"><AlertCircle size={14} />{error}</div>}
          {result && (
            <div className="mt-4 space-y-2">
              {result.molecules.map((molecule) => (
                <button key={molecule.id} type="button" onClick={() => onOpenMolecule(molecule)} className="flex w-full items-center gap-3 rounded-md border border-border p-3 text-left hover:border-primary/50 hover:bg-primary/5">
                  <div className="flex-1">
                    <div className="text-xs font-medium">{molecule.name}</div>
                    <div className="mt-1 font-mono text-[10px] text-muted-foreground">{molecule.provenance.filename} · {molecule.formula} · {molecule.atom_count} atoms · {molecule.bond_count} bonds</div>
                    <div className={`mt-1.5 text-[10px] ${molecule.provenance.topology_confirmed ? "text-primary" : "text-amber-400"}`}>
                      {molecule.provenance.topology_source.toUpperCase()} topology · {molecule.provenance.topology_confirmed ? "file connectivity" : "review required"}
                    </div>
                  </div>
                  <span className="text-[10px] text-primary">Open →</span>
                </button>
              ))}
              {result.failures.map((failure, index) => (
                <div key={`${failure.filename}-${index}`} role="alert" className="rounded-md border border-red-500/30 bg-red-500/10 p-3 text-[11px] text-red-400">
                  <b>{failure.filename}</b><p className="mt-1">{failure.message}</p>
                </div>
              ))}
              {result.molecules.length > 0 && <p className="text-[10px] leading-4 text-muted-foreground">All successfully parsed structures are also available in the Molecule Library below the Structure Builder.</p>}
            </div>
          )}
          <div className="mt-4 rounded-md bg-muted p-3 text-[10px] leading-4 text-muted-foreground">
            MOL/SDF/MOL2 and PDB CONECT records preserve file connectivity. XYZ bond connectivity and bond orders are inferred, never file-supplied facts. MOL2 partial charges remain distinct from formal charges. Confirm metal coordination, total charge, and spin multiplicity before using structures in calculations.
          </div>
        </div>
      </section>
    </div>
  );
}
