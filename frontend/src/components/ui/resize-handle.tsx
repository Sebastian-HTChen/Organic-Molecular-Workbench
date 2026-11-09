import type { PointerEvent } from "react";

interface ResizeHandleProps {
  side: "left" | "right";
  onResize: (delta: number) => void;
}

export function ResizeHandle({ side, onResize }: ResizeHandleProps) {
  function startResize(event: PointerEvent<HTMLDivElement>) {
    event.preventDefault();
    const startX = event.clientX;
    const previousCursor = document.body.style.cursor;
    const previousUserSelect = document.body.style.userSelect;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    function handleMove(moveEvent: globalThis.PointerEvent) {
      const delta = moveEvent.clientX - startX;
      onResize(side === "left" ? delta : -delta);
    }
    function stopResize() {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", stopResize);
      document.body.style.cursor = previousCursor;
      document.body.style.userSelect = previousUserSelect;
    }
    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", stopResize, { once: true });
  }

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label={`Resize ${side} panel`}
      onPointerDown={startResize}
      className="group relative z-20 w-px shrink-0 cursor-col-resize bg-border transition-colors hover:bg-primary"
    >
      <div className="absolute inset-y-0 -left-1 w-2 group-hover:bg-primary/10" />
    </div>
  );
}
