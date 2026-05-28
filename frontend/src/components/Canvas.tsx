import { useCallback, useMemo } from "react";
import { Layer, Stage } from "react-konva";
import {
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  CanvasNode,
} from "../types/canvas";
import { useCanvasStore } from "../store/canvasStore";
import { emitMove } from "../services/canvasApi";
import { ShapeNode } from "./ShapeNode";
import { throttle } from "../utils/throttle";

const DRAG_EMIT_MS = 30; // ~33 events/sec — feels live without flooding the socket.

/**
 * Top-level canvas. Renders a fixed-size Konva stage with all shapes.
 *
 * On drag:
 *   - update local store immediately (optimistic, snappy)
 *   - emit throttled `node:move` to the server
 *   - on drag end, emit a final, un-throttled message so the last position
 *     is always synced even if the throttle window swallowed it.
 */
export function Canvas() {
  const nodes = useCanvasStore((s) => s.nodes);
  const updateNodePosition = useCanvasStore((s) => s.updateNodePosition);
  const isGenerating = useCanvasStore((s) => s.isGenerating);
  const isEmpty = nodes.length === 0;

  const throttledEmit = useMemo(
    () => throttle((id: string, x: number, y: number) => emitMove(id, x, y), DRAG_EMIT_MS),
    []
  );

  const handleDragMove = useCallback(
    (id: string, x: number, y: number) => {
      updateNodePosition(id, x, y);
      throttledEmit(id, x, y);
    },
    [throttledEmit, updateNodePosition]
  );

  const handleDragEnd = useCallback(
    (id: string, x: number, y: number) => {
      updateNodePosition(id, x, y);
      emitMove(id, x, y);
    },
    [updateNodePosition]
  );

  // Clamp drag inside canvas — Konva calls this for every pointer event.
  const dragBoundFunc = useCallback(
    (node: CanvasNode, pos: { x: number; y: number }) => {
      const hx = node.type === "circle" ? node.radius : node.width / 2;
      const hy = node.type === "circle" ? node.radius : node.height / 2;
      const x = Math.min(Math.max(pos.x, hx), CANVAS_WIDTH - hx);
      const y = Math.min(Math.max(pos.y, hy), CANVAS_HEIGHT - hy);
      return { x, y };
    },
    []
  );

  return (
    <div className={`canvas-wrapper ${isGenerating ? "is-generating" : ""}`}>
      <Stage width={CANVAS_WIDTH} height={CANVAS_HEIGHT} className="konva-stage">
        <Layer>
          {nodes.map((node) => (
            <ShapeNode
              key={node.id}
              node={node}
              onDragMove={handleDragMove}
              onDragEnd={handleDragEnd}
              dragBoundFunc={dragBoundFunc}
            />
          ))}
        </Layer>
      </Stage>

      {isEmpty && (
        <div className="canvas-empty">
          <div className="canvas-empty-glyph">＋</div>
          <div className="canvas-empty-title">Canvas is empty</div>
          <div className="canvas-empty-hint">
            Type a prompt above (or pick an example) to generate shapes. Open this
            URL in a second tab to watch updates sync live.
          </div>
        </div>
      )}
    </div>
  );
}
