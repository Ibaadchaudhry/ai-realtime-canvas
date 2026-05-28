import {
  CanvasNode,
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  MAX_LABEL_LENGTH,
  MAX_NODES,
  ShapeType,
} from "../../../shared/types/canvas";

const ALLOWED_TYPES: ShapeType[] = ["circle", "rectangle"];

export interface ValidationResult<T> {
  ok: boolean;
  value?: T;
  error?: string;
}

function isFiniteNumber(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

/**
 * Validate a single node shape coming in over the wire. The frontend is trusted
 * to send well-formed data, but we still defend against malformed payloads —
 * a single bad node should never crash the canvas for everyone.
 */
export function validateNode(input: unknown): ValidationResult<CanvasNode> {
  if (!input || typeof input !== "object") {
    return { ok: false, error: "Node must be an object" };
  }
  const n = input as Record<string, unknown>;

  if (typeof n.id !== "string" || !n.id) {
    return { ok: false, error: "Node.id must be a non-empty string" };
  }

  if (typeof n.type !== "string" || !ALLOWED_TYPES.includes(n.type as ShapeType)) {
    return { ok: false, error: `Node.type must be one of ${ALLOWED_TYPES.join(", ")}` };
  }

  if (!isFiniteNumber(n.x) || !isFiniteNumber(n.y)) {
    return { ok: false, error: "Node.x and Node.y must be finite numbers" };
  }

  if (n.x < 0 || n.x > CANVAS_WIDTH || n.y < 0 || n.y > CANVAS_HEIGHT) {
    return { ok: false, error: "Node position is outside canvas bounds" };
  }

  const label =
    typeof n.label === "string" ? n.label.slice(0, MAX_LABEL_LENGTH) : "";

  if (n.type === "circle") {
    if (!isFiniteNumber(n.radius) || n.radius <= 0) {
      return { ok: false, error: "Circle.radius must be a positive number" };
    }
    return {
      ok: true,
      value: {
        id: n.id,
        type: "circle",
        x: n.x,
        y: n.y,
        radius: n.radius,
        label,
        fill: typeof n.fill === "string" ? n.fill : undefined,
      },
    };
  }

  // rectangle
  if (
    !isFiniteNumber(n.width) ||
    !isFiniteNumber(n.height) ||
    n.width <= 0 ||
    n.height <= 0
  ) {
    return { ok: false, error: "Rectangle width/height must be positive numbers" };
  }

  return {
    ok: true,
    value: {
      id: n.id,
      type: "rectangle",
      x: n.x,
      y: n.y,
      width: n.width,
      height: n.height,
      label,
      fill: typeof n.fill === "string" ? n.fill : undefined,
    },
  };
}

export function validateNodes(
  input: unknown
): ValidationResult<CanvasNode[]> {
  if (!Array.isArray(input)) {
    return { ok: false, error: "Expected an array of nodes" };
  }
  if (input.length > MAX_NODES) {
    return { ok: false, error: `Maximum ${MAX_NODES} nodes allowed` };
  }
  const out: CanvasNode[] = [];
  for (let i = 0; i < input.length; i++) {
    const r = validateNode(input[i]);
    if (!r.ok || !r.value) {
      return { ok: false, error: `Node[${i}]: ${r.error}` };
    }
    out.push(r.value);
  }
  return { ok: true, value: out };
}

export interface MoveInput {
  id: string;
  x: number;
  y: number;
}

export function validateMove(input: unknown): ValidationResult<MoveInput> {
  if (!input || typeof input !== "object") {
    return { ok: false, error: "Move payload must be an object" };
  }
  const m = input as Record<string, unknown>;
  if (typeof m.id !== "string" || !m.id) {
    return { ok: false, error: "id is required" };
  }
  if (!isFiniteNumber(m.x) || !isFiniteNumber(m.y)) {
    return { ok: false, error: "x and y must be finite numbers" };
  }
  return { ok: true, value: { id: m.id, x: m.x, y: m.y } };
}

export function validatePrompt(input: unknown): ValidationResult<string> {
  if (typeof input !== "string") {
    return { ok: false, error: "Prompt must be a string" };
  }
  const trimmed = input.trim();
  if (!trimmed) {
    return { ok: false, error: "Prompt cannot be empty" };
  }
  if (trimmed.length > 500) {
    return { ok: false, error: "Prompt is too long (max 500 chars)" };
  }
  return { ok: true, value: trimmed };
}
