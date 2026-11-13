import type { Ketcher } from "ketcher-core";
import { Bond } from "ketcher-core";
import { Editor } from "ketcher-react";
interface MoleculeEditor {
  tool: (name: string, options?: unknown) => unknown;
  subscribe: (event: string, handler: () => void) => unknown;
  historySize: () => EditorHistory;
  undo: () => void;
  redo: () => void;
}
import { StandaloneStructServiceProvider } from "ketcher-standalone";
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";

import "ketcher-react/dist/index.css";

const structServiceProvider = new StandaloneStructServiceProvider();

export type KetcherEditorTool = "select" | "atom" | "bond-single" | "bond-double" | "bond-triple" | "bond-aromatic" | "eraser";
export interface EditorHistory {
  undo: number;
  redo: number;
}

export interface KetcherEditorHandle {
  getMolfile: () => Promise<string>;
  setElement: (element: string) => void;
  setTool: (tool: KetcherEditorTool) => void;
  undo: () => void;
  redo: () => void;
  clear: () => Promise<void>;
}

interface KetcherEditorProps {
  moleculeId?: string;
  initialMolBlock?: string;
  onReady: () => void;
  onHistoryChange: (history: EditorHistory) => void;
}

export const KetcherEditor = forwardRef<KetcherEditorHandle, KetcherEditorProps>(
  function KetcherEditor({ moleculeId, initialMolBlock, onReady, onHistoryChange }, ref) {
    const ketcherRef = useRef<Ketcher | null>(null);
    const loadedMoleculeId = useRef<string | undefined>(undefined);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
      if (!ketcherRef.current || !initialMolBlock || loadedMoleculeId.current === moleculeId) return;
      loadedMoleculeId.current = moleculeId;
      void ketcherRef.current.setMolecule(initialMolBlock).catch(() => {
        setError("The current 2D structure could not be loaded.");
      });
    }, [moleculeId, initialMolBlock]);

    useImperativeHandle(ref, () => {
      function getEditor(): MoleculeEditor | undefined {
        return ketcherRef.current?.editor as unknown as MoleculeEditor | undefined;
      }

      return {
        getMolfile: async () => {
          if (!ketcherRef.current) throw new Error("The 2D editor is still loading. Please try again.");
          return ketcherRef.current.getMolfile();
        },
        setElement: (element) => {
          getEditor()?.tool("atom", { label: element });
        },
        setTool: (tool) => {
          const editor = getEditor();
          if (!editor) return;
          if (tool.startsWith("bond-")) {
            const bondType = tool.slice(5).toUpperCase() as "SINGLE" | "DOUBLE" | "TRIPLE" | "AROMATIC";
            editor.tool("bond", { type: Bond.PATTERN.TYPE[bondType], stereo: Bond.PATTERN.STEREO.NONE });
          } else {
            editor.tool(tool);
          }
        },
        undo: () => {
          getEditor()?.undo();
          onHistoryChange(getEditor()?.historySize() ?? { undo: 0, redo: 0 });
        },
        redo: () => {
          getEditor()?.redo();
          onHistoryChange(getEditor()?.historySize() ?? { undo: 0, redo: 0 });
        },
        clear: async () => {
          loadedMoleculeId.current = undefined;
          await ketcherRef.current?.setMolecule("");
          onHistoryChange(getEditor()?.historySize() ?? { undo: 0, redo: 0 });
        },
      };
    }, [onHistoryChange]);

    return (
      <div className="ketcher-workspace absolute inset-0 overflow-hidden bg-white">
        <Editor
          staticResourcesUrl=""
          structServiceProvider={structServiceProvider}
          disableMacromoleculesEditor
          errorHandler={(message) => setError(message)}
          onInit={(ketcher) => {
            ketcherRef.current = ketcher;
            const editor = ketcher.editor as unknown as MoleculeEditor;
            editor.subscribe("change", () => onHistoryChange(editor.historySize()));
            onHistoryChange(editor.historySize());
            if (initialMolBlock && loadedMoleculeId.current !== moleculeId) {
              loadedMoleculeId.current = moleculeId;
              void ketcher.setMolecule(initialMolBlock).catch(() => {
                setError("The current 2D structure could not be loaded.");
              });
            }
            onReady();
          }}
        />
        {error && (
          <div role="alert" className="absolute bottom-2 left-2 z-20 max-w-md rounded border border-red-300 bg-white p-2 text-xs text-red-700 shadow">
            {error}
            <button type="button" className="ml-2 underline" onClick={() => setError(null)}>Dismiss</button>
          </div>
        )}
      </div>
    );
  },
);
