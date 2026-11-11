import type { Ketcher } from "ketcher-core";
import { Editor } from "ketcher-react";
import { StandaloneStructServiceProvider } from "ketcher-standalone";
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";

import "ketcher-react/dist/index.css";

const structServiceProvider = new StandaloneStructServiceProvider();

export interface KetcherEditorHandle {
  getMolfile: () => Promise<string>;
  setElement: (element: string) => void;
  clear: () => Promise<void>;
}

interface KetcherEditorProps {
  moleculeId?: string;
  initialMolBlock?: string;
  onReady: () => void;
}

export const KetcherEditor = forwardRef<KetcherEditorHandle, KetcherEditorProps>(
  function KetcherEditor({ moleculeId, initialMolBlock, onReady }, ref) {
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

    useImperativeHandle(ref, () => ({
      getMolfile: async () => {
        if (!ketcherRef.current) throw new Error("The 2D editor is still loading. Please try again.");
        return ketcherRef.current.getMolfile();
      },
      setElement: (element) => {
        const editor = ketcherRef.current?.editor as unknown as {
          tool: (name: string, options: { label: string }) => void;
        } | undefined;
        editor?.tool("atom", { label: element });
      },
      clear: async () => {
        await ketcherRef.current?.setMolecule("");
      },
    }), []);

    return (
      <div className="ketcher-workspace absolute inset-0 overflow-hidden bg-white">
        <Editor
          staticResourcesUrl=""
          structServiceProvider={structServiceProvider}
          disableMacromoleculesEditor
          errorHandler={(message) => setError(message)}
          onInit={(ketcher) => {
            ketcherRef.current = ketcher;
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
