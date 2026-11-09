import { Info, X } from "lucide-react";

import { bondAngle, dihedralAngle, distance } from "@/features/molecule/geometry";
import { getBondBetween, getNeighbors } from "@/features/molecule/molecule-utils";
import type { AtomData, Molecule } from "@/features/molecule/types";

interface PropertiesPanelProps {
  molecule: Molecule | null;
  selection: number[];
  onSelectionChange: (selection: number[]) => void;
}

function DataRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1">
      <dt className="text-[11px] text-muted-foreground">{label}</dt>
      <dd className="data-value text-right">{value}</dd>
    </div>
  );
}

function AtomDetails({ molecule, atom }: { molecule: Molecule; atom: AtomData }) {
  const neighbors = getNeighbors(molecule, atom.index);
  return (
    <>
      <section className="border-b border-border p-3">
        <div className="mb-2 flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md border border-primary/35 bg-primary/10 font-mono text-sm font-semibold text-primary">
            {atom.element}
          </div>
          <div>
            <div className="text-xs font-medium">Atom {atom.index}</div>
            <div className="text-[10px] text-muted-foreground">Atomic number {atom.atomic_number}</div>
          </div>
        </div>
        <dl>
          <DataRow label="Element" value={atom.element} />
          <DataRow label="Formal charge" value={atom.formal_charge > 0 ? `+${atom.formal_charge}` : String(atom.formal_charge)} />
          <DataRow label="Aromatic" value={atom.is_aromatic ? "Yes" : "No"} />
          {atom.isotope > 0 && <DataRow label="Isotope" value={String(atom.isotope)} />}
        </dl>
      </section>
      <section className="border-b border-border p-3">
        <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Cartesian coordinates</h3>
        <div className="grid grid-cols-[20px_1fr_30px] items-center gap-y-1.5 rounded-md bg-background p-2.5">
          {(["x", "y", "z"] as const).map((axis) => (
            <div key={axis} className="col-span-3 grid grid-cols-subgrid items-center">
              <span className="font-mono text-[10px] uppercase text-primary">{axis}</span>
              <span className="data-value text-right">{atom.position[axis].toFixed(6)}</span>
              <span className="text-right text-[9px] text-muted-foreground">Å</span>
            </div>
          ))}
        </div>
      </section>
      <section className="border-b border-border p-3">
        <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Neighbors · {neighbors.length}
        </h3>
        {neighbors.length > 0 ? (
          <div className="space-y-1">
            {neighbors.map(({ atom: neighbor, bond }) => (
              <div key={bond.index} className="flex items-center justify-between rounded bg-background px-2 py-1.5 text-[10px]">
                <span className="font-mono">{neighbor.element}{neighbor.index}</span>
                <span className="text-muted-foreground">{bond.bond_type.toLowerCase()} · {bond.order}</span>
              </div>
            ))}
          </div>
        ) : <p className="text-[10px] text-muted-foreground">No bonded neighbors.</p>}
      </section>
    </>
  );
}

export function PropertiesPanel({ molecule, selection, onSelectionChange }: PropertiesPanelProps) {
  const atoms = molecule
    ? selection.map((index) => molecule.atoms[index - 1]).filter((atom): atom is AtomData => Boolean(atom))
    : [];
  let measurement: { label: string; value: number | null; unit: string; detail: string } | null = null;
  if (atoms.length === 2) {
    measurement = {
      label: "Interatomic distance",
      value: distance(atoms[0].position, atoms[1].position),
      unit: "Å",
      detail: `${atoms[0].index} → ${atoms[1].index}`,
    };
  } else if (atoms.length === 3) {
    measurement = {
      label: "Bond angle",
      value: bondAngle(atoms[0].position, atoms[1].position, atoms[2].position),
      unit: "°",
      detail: `${atoms[0].index}–${atoms[1].index}–${atoms[2].index} · vertex ${atoms[1].index}`,
    };
  } else if (atoms.length === 4) {
    measurement = {
      label: "Dihedral angle",
      value: dihedralAngle(atoms[0].position, atoms[1].position, atoms[2].position, atoms[3].position),
      unit: "°",
      detail: atoms.map((atom) => atom.index).join("–"),
    };
  }
  const selectedBond = molecule && atoms.length === 2
    ? getBondBetween(molecule, atoms[0].index, atoms[1].index)
    : undefined;

  return (
    <aside className="flex min-h-0 flex-col bg-panel">
      <div className="panel-heading">
        <span>Properties</span>
        {selection.length > 0 && <span className="font-mono text-[9px] normal-case tracking-normal">{selection.length} selected</span>}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {!molecule ? (
          <div className="p-5 text-center text-[11px] leading-5 text-muted-foreground">
            No molecular structure loaded. Atom properties and geometric measurements will appear here.
          </div>
        ) : (
          <>
            <section className="border-b border-border p-3">
              <div className="mb-1 text-xs font-medium">{molecule.name}</div>
              <dl>
                <DataRow label="Molecular formula" value={molecule.formula} />
                <DataRow label="Molecular weight" value={`${molecule.molecular_weight.toFixed(3)} g/mol`} />
                <DataRow label="Atoms / bonds" value={`${molecule.atom_count} / ${molecule.bond_count}`} />
                <DataRow label="Conformer" value={`${molecule.conformer.method} · seed ${molecule.conformer.seed}`} />
              </dl>
            </section>

            <section className="border-b border-border p-3">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Ordered selection</h3>
                {selection.length > 0 && (
                  <button type="button" className="text-[10px] text-primary hover:underline" onClick={() => onSelectionChange([])}>Clear</button>
                )}
              </div>
              {selection.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {atoms.map((atom, order) => (
                    <button
                      key={atom.index}
                      type="button"
                      title={`Remove atom ${atom.index} from selection`}
                      className="flex items-center gap-1 rounded-md border border-primary/35 bg-primary/10 px-1.5 py-1 font-mono text-[10px] text-primary"
                      onClick={() => onSelectionChange(selection.filter((index) => index !== atom.index))}
                    >
                      <span className="text-[8px] opacity-60">{order + 1}:</span>{atom.element}{atom.index}<X size={9} />
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-[10px] leading-4 text-muted-foreground">Click 1–4 atoms in the viewer. Selection order defines the measured geometry.</p>
              )}
            </section>

            {atoms.length === 1 && <AtomDetails molecule={molecule} atom={atoms[0]} />}

            {measurement && (
              <section className="border-b border-border p-3">
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Live measurement</h3>
                  <span className="rounded border border-border px-1 py-0.5 text-[8px] text-muted-foreground">READ ONLY</span>
                </div>
                <div className="rounded-lg border border-primary/25 bg-primary/5 p-3">
                  <div className="text-[10px] text-muted-foreground">{measurement.label}</div>
                  <div className="mt-1 font-mono text-2xl font-light tabular-nums text-primary">
                    {measurement.value === null ? "Undefined" : measurement.value.toFixed(3)}
                    <span className="ml-1 text-xs">{measurement.unit}</span>
                  </div>
                  <div className="mt-1 font-mono text-[9px] text-muted-foreground">{measurement.detail}</div>
                </div>
                {selectedBond && (
                  <dl className="mt-2"><DataRow label="Bond type" value={`${selectedBond.bond_type.toLowerCase()} · ${selectedBond.order}`} /><DataRow label="In ring" value={selectedBond.is_in_ring ? "Yes" : "No"} /></dl>
                )}
                <p className="mt-2 text-[10px] leading-4 text-muted-foreground">Geometry editing and rotatable-bond checks are planned for Phase 3.</p>
              </section>
            )}

            <div className="flex gap-2 p-3 text-[9px] leading-4 text-muted-foreground">
              <Info size={12} className="mt-0.5 shrink-0" />
              <p>Values are calculated from the active RDKit conformer. No force-field or quantum-chemical energy is reported in Phase 1.</p>
            </div>
          </>
        )}
      </div>
    </aside>
  );
}
