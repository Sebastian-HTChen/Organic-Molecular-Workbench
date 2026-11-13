import { Atom, Eraser, GitBranch, Link2, MousePointer2, Pencil, Spline } from "lucide-react";

import type { KetcherEditorTool } from "@/components/viewport/ketcher-editor";
import { cn } from "@/lib/utils";

interface ToolRailProps {
  activeElement: string;
  activeTool: KetcherEditorTool;
  disabled: boolean;
  onToolSelect: (tool: KetcherEditorTool) => void;
}

const tools = [
  { id: "select", label: "Select and edit a structure", icon: MousePointer2 },
  { id: "bond-single", label: "Draw a single bond", icon: Pencil },
  { id: "bond-double", label: "Draw a double bond", icon: Link2 },
  { id: "bond-triple", label: "Draw a triple bond", icon: GitBranch },
  { id: "bond-aromatic", label: "Draw an aromatic bond", icon: Spline },
  { id: "atom", label: "Place the active atom element", icon: Atom },
  { id: "eraser", label: "Erase an atom or bond", icon: Eraser },
] as const;

export function ToolRail({ activeElement, activeTool, disabled, onToolSelect }: ToolRailProps) {
  return (
    <nav aria-label="Molecule tools" className="flex w-11 shrink-0 flex-col items-center gap-1 border-r border-border bg-panel py-2">
      {tools.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          type="button"
          disabled={disabled}
          aria-label={id === "atom" ? `Draw ${activeElement} atom` : label}
          aria-pressed={activeTool === id}
          title={id === "atom" ? `Draw ${activeElement} atom · choose an element in Atom Palette` : label}
          onClick={() => onToolSelect(id)}
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-md border disabled:pointer-events-none disabled:opacity-40",
            activeTool === id ? "border-primary/35 bg-primary/15 text-primary" : "border-transparent text-muted-foreground hover:bg-muted hover:text-foreground",
          )}
        >
          <Icon size={16} />
        </button>
      ))}
      <div className="my-1 h-px w-5 bg-border" />
      <span className="font-mono text-[9px] text-primary">{activeTool === "atom" ? activeElement : activeTool === "select" ? "SEL" : activeTool.replace("bond-", "").slice(0, 3).toUpperCase()}</span>
      <div className="mt-auto px-1 text-center font-mono text-[8px] uppercase leading-3 tracking-wider text-muted-foreground/50">2D tools</div>
    </nav>
  );
}
