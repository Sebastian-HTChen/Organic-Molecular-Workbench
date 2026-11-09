import {
  Atom,
  Eraser,
  Link2,
  MousePointer2,
  Pencil,
  Scan,
  Trash2,
} from "lucide-react";

import { cn } from "@/lib/utils";

const futureTools = [
  { label: "Draw structure · Phase 2", icon: Pencil },
  { label: "Edit bonds · Phase 2", icon: Link2 },
  { label: "Atom tools · Phase 2", icon: Atom },
  { label: "Erase atom or bond · Phase 2", icon: Eraser },
  { label: "Delete selection · Phase 2", icon: Trash2 },
];

export function ToolRail() {
  return (
    <nav aria-label="Molecule tools" className="flex w-11 shrink-0 flex-col items-center gap-1 border-r border-border bg-panel py-2">
      <button
        type="button"
        aria-label="Select atoms"
        aria-pressed="true"
        title="Select atoms · click up to four atoms"
        className="flex h-8 w-8 items-center justify-center rounded-md border border-primary/35 bg-primary/15 text-primary"
      >
        <MousePointer2 size={16} />
      </button>
      {futureTools.map(({ label, icon: Icon }) => (
        <button
          key={label}
          type="button"
          disabled
          title={label}
          aria-label={label}
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground",
            "disabled:cursor-not-allowed disabled:opacity-30",
          )}
        >
          <Icon size={16} />
        </button>
      ))}
      <div className="my-1 h-px w-5 bg-border" />
      <div className="flex h-8 w-8 items-center justify-center text-muted-foreground/40" title="Selection measurements are active">
        <Scan size={16} />
      </div>
      <div className="mt-auto px-1 text-center font-mono text-[8px] uppercase leading-3 tracking-wider text-muted-foreground/50">
        Select
      </div>
    </nav>
  );
}
