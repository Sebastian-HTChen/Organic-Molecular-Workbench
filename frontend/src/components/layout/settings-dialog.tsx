import { Moon, Sun, X } from "lucide-react";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SettingsDialogProps {
  open: boolean;
  theme: "dark" | "light";
  onThemeChange: (theme: "dark" | "light") => void;
  onClose: () => void;
}

export function SettingsDialog({ open, theme, onThemeChange, onClose }: SettingsDialogProps) {
  useEffect(() => {
    if (!open) return;
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4" role="presentation" onMouseDown={onClose}>
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
        className="animate-fade-in w-[400px] rounded-xl border border-border bg-panel shadow-2xl"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex h-11 items-center justify-between border-b border-border px-4">
          <h2 id="settings-title" className="text-sm font-semibold">Workspace settings</h2>
          <Button variant="ghost" size="icon-sm" aria-label="Close settings" onClick={onClose}>
            <X size={15} />
          </Button>
        </div>
        <div className="space-y-5 p-4">
          <div>
            <h3 className="mb-2 text-[11px] font-medium">Appearance</h3>
            <div className="grid grid-cols-2 gap-2">
              {(["dark", "light"] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  className={cn(
                    "flex h-16 items-center justify-center gap-2 rounded-lg border text-xs capitalize",
                    theme === option
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-background text-muted-foreground hover:text-foreground",
                  )}
                  onClick={() => onThemeChange(option)}
                >
                  {option === "dark" ? <Moon size={15} /> : <Sun size={15} />}
                  {option}
                </button>
              ))}
            </div>
          </div>
          <dl className="space-y-2 border-t border-border pt-4 text-[11px]">
            <div className="flex justify-between"><dt className="text-muted-foreground">Coordinate unit</dt><dd className="font-mono">Ångström (Å)</dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">3D engine</dt><dd className="font-mono">3Dmol.js 2.5.5</dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">API endpoint</dt><dd className="font-mono">/api/v1</dd></div>
          </dl>
          <p className="rounded-md bg-muted p-2.5 text-[10px] leading-4 text-muted-foreground">
            Phase 1 generates one deterministic ETKDGv3 conformer. It does not perform a conformer search, DFT calculation, or thermochemical analysis.
          </p>
        </div>
      </section>
    </div>
  );
}
