import { Server, Socket } from "socket.io";
import {
  CanvasErrorPayload,
  CanvasGeneratedPayload,
  CanvasGeneratePayload,
  NodeMovePayload,
  NodeMovedPayload,
  SOCKET_EVENTS,
} from "../../../shared/types/canvas";
import { generateLayout } from "../services/layoutEngine";
import { canvasStore } from "../services/canvasStore";
import { clampPosition } from "../utils/bounds";
import { validateMove, validatePrompt } from "../validators/nodeValidator";

/**
 * Wire all canvas socket events for a single connection. Keep handlers small
 * and delegate work to services — sockets are I/O glue only.
 */
export function registerCanvasHandlers(io: Server, socket: Socket): void {
  // On connect, sync the new client with current state so multi-tab joins
  // pick up the existing canvas immediately.
  socket.emit(SOCKET_EVENTS.CANVAS_STATE, canvasStore.getState());

  socket.on(SOCKET_EVENTS.CANVAS_GENERATE, (raw: CanvasGeneratePayload) => {
    const parsed = validatePrompt(raw?.prompt);
    if (!parsed.ok || !parsed.value) {
      const err: CanvasErrorPayload = { message: parsed.error ?? "Invalid prompt" };
      socket.emit(SOCKET_EVENTS.CANVAS_ERROR, err);
      return;
    }

    try {
      const nodes = generateLayout(parsed.value);
      canvasStore.setNodes(nodes);
      const payload: CanvasGeneratedPayload = { nodes, prompt: parsed.value };
      // Broadcast to everyone (including sender) — generation replaces canvas.
      io.emit(SOCKET_EVENTS.CANVAS_GENERATED, payload);
    } catch (e) {
      const err: CanvasErrorPayload = {
        message: e instanceof Error ? e.message : "Layout generation failed",
      };
      socket.emit(SOCKET_EVENTS.CANVAS_ERROR, err);
    }
  });

  socket.on(SOCKET_EVENTS.NODE_MOVE, (raw: NodeMovePayload) => {
    const parsed = validateMove(raw);
    if (!parsed.ok || !parsed.value) return; // silently drop — drag events are high-frequency

    const existing = canvasStore.getState().nodes.find((n) => n.id === parsed.value!.id);
    if (!existing) return;

    // Clamp to canvas bounds server-side so the server is the source of truth.
    const hx = existing.type === "circle" ? existing.radius : existing.width / 2;
    const hy = existing.type === "circle" ? existing.radius : existing.height / 2;
    const { x, y } = clampPosition(parsed.value.x, parsed.value.y, hx, hy);

    const updated = canvasStore.updateNodePosition(parsed.value.id, x, y);
    if (!updated) return;

    const payload: NodeMovedPayload = { id: updated.id, x: updated.x, y: updated.y };
    // Broadcast to other clients only — sender already has the position locally,
    // echoing it back causes drag jitter.
    socket.broadcast.emit(SOCKET_EVENTS.NODE_MOVED, payload);
  });

  socket.on(SOCKET_EVENTS.CANVAS_CLEAR, () => {
    canvasStore.clear();
    io.emit(SOCKET_EVENTS.CANVAS_STATE, canvasStore.getState());
  });
}
