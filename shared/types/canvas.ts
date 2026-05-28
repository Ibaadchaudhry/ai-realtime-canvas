/**
 * Shared type definitions used by both backend and frontend.
 * Keeping these in one place prevents schema drift across the socket boundary.
 */

export type ShapeType = "circle" | "rectangle";

export interface BaseNode {
  id: string;
  type: ShapeType;
  x: number;
  y: number;
  label: string;
  fill?: string;
}

export interface CircleNode extends BaseNode {
  type: "circle";
  radius: number;
}

export interface RectangleNode extends BaseNode {
  type: "rectangle";
  width: number;
  height: number;
}

export type CanvasNode = CircleNode | RectangleNode;

export interface CanvasState {
  nodes: CanvasNode[];
  updatedAt: number;
}

export const CANVAS_WIDTH = 900;
export const CANVAS_HEIGHT = 600;
export const MAX_NODES = 12;
export const MAX_LABEL_LENGTH = 2;

// ---------- Socket payload types ----------

export interface CanvasGeneratePayload {
  prompt: string;
}

export interface CanvasGeneratedPayload {
  nodes: CanvasNode[];
  prompt: string;
}

export interface NodeMovePayload {
  id: string;
  x: number;
  y: number;
}

export interface NodeMovedPayload extends NodeMovePayload {}

export interface CanvasErrorPayload {
  message: string;
}

export const SOCKET_EVENTS = {
  CANVAS_GENERATE: "canvas:generate",
  CANVAS_GENERATED: "canvas:generated",
  CANVAS_STATE: "canvas:state",
  CANVAS_ERROR: "canvas:error",
  NODE_MOVE: "node:move",
  NODE_MOVED: "node:moved",
  CANVAS_CLEAR: "canvas:clear",
} as const;
