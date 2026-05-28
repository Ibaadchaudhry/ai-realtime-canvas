import { getSocket } from "./socket";
import {
  CanvasGeneratePayload,
  NodeMovePayload,
  SOCKET_EVENTS,
} from "../types/canvas";

/**
 * Thin functional wrapper around the socket so components never touch the
 * raw socket instance. Easier to mock, easier to refactor transport later.
 */

export function emitGenerate(prompt: string): void {
  const payload: CanvasGeneratePayload = { prompt };
  getSocket().emit(SOCKET_EVENTS.CANVAS_GENERATE, payload);
}

export function emitMove(id: string, x: number, y: number): void {
  const payload: NodeMovePayload = { id, x, y };
  getSocket().emit(SOCKET_EVENTS.NODE_MOVE, payload);
}

export function emitClear(): void {
  getSocket().emit(SOCKET_EVENTS.CANVAS_CLEAR);
}
