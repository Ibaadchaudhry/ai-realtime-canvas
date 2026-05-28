import {
  CanvasNode,
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  MAX_NODES,
  ShapeType,
} from "../../../shared/types/canvas";
import { clampNodeToCanvas } from "../utils/bounds";
import { makeNodeId } from "../utils/id";
import { labelForIndex } from "../utils/labels";
import { LayoutIntent, parsePrompt } from "./promptParser";

/**
 * Layout engine — deterministic coordinate generation for the supported
 * intents. Every generator returns nodes clamped inside the canvas with
 * unique ids and short labels.
 */

const CENTER_X = CANVAS_WIDTH / 2;
const CENTER_Y = CANVAS_HEIGHT / 2;
const DEFAULT_RADIUS = 30;
const CENTER_RADIUS = 38;
const RECT_W = 80;
const RECT_H = 60;

const PRIMARY_FILL = "#4f8cff"; // center / featured shape
const SECONDARY_FILL = "#3fb950"; // surrounding / regular shapes

function makeCircle(
  x: number,
  y: number,
  label: string,
  fill = SECONDARY_FILL,
  radius = DEFAULT_RADIUS
): CanvasNode {
  return { id: makeNodeId(), type: "circle", x, y, radius, label, fill };
}

function makeRect(
  x: number,
  y: number,
  label: string,
  fill = SECONDARY_FILL,
  width = RECT_W,
  height = RECT_H
): CanvasNode {
  return { id: makeNodeId(), type: "rectangle", x, y, width, height, label, fill };
}

function makeShape(
  shape: ShapeType,
  x: number,
  y: number,
  label: string,
  fill?: string
): CanvasNode {
  return shape === "circle"
    ? makeCircle(x, y, label, fill)
    : makeRect(x, y, label, fill);
}

// ---------- Generators ----------

function generateStar(count: number, shape: ShapeType): CanvasNode[] {
  const n = Math.min(count, MAX_NODES);
  const radius = Math.min(CANVAS_WIDTH, CANVAS_HEIGHT) * 0.32;
  const nodes: CanvasNode[] = [];
  // n points evenly distributed; first point at top.
  for (let i = 0; i < n; i++) {
    const angle = (i / n) * Math.PI * 2 - Math.PI / 2;
    const x = CENTER_X + radius * Math.cos(angle);
    const y = CENTER_Y + radius * Math.sin(angle);
    nodes.push(makeShape(shape, x, y, labelForIndex(i)));
  }
  return nodes;
}

function generateCenterSurround(
  surroundCount: number,
  shape: ShapeType
): CanvasNode[] {
  const surround = Math.min(surroundCount, MAX_NODES - 1);
  const ringRadius = Math.min(CANVAS_WIDTH, CANVAS_HEIGHT) * 0.3;
  const nodes: CanvasNode[] = [];

  // Center shape — bigger and primary-colored to match the example image.
  if (shape === "circle") {
    nodes.push({
      id: makeNodeId(),
      type: "circle",
      x: CENTER_X,
      y: CENTER_Y,
      radius: CENTER_RADIUS,
      label: "S",
      fill: PRIMARY_FILL,
    });
  } else {
    nodes.push(makeRect(CENTER_X, CENTER_Y, "S", PRIMARY_FILL, RECT_W + 10, RECT_H + 10));
  }

  for (let i = 0; i < surround; i++) {
    const angle = (i / surround) * Math.PI * 2 - Math.PI / 2;
    const x = CENTER_X + ringRadius * Math.cos(angle);
    const y = CENTER_Y + ringRadius * Math.sin(angle);
    nodes.push(makeShape(shape, x, y, labelForIndex(i)));
  }
  return nodes;
}

function generateGrid(
  rows: number,
  cols: number,
  shape: ShapeType
): CanvasNode[] {
  const total = Math.min(rows * cols, MAX_NODES);
  // Recompute cols/rows if total was clipped — keep visual integrity.
  const effectiveRows = total < rows * cols ? Math.ceil(total / cols) : rows;
  const padX = 100;
  const padY = 100;
  const usableW = CANVAS_WIDTH - padX * 2;
  const usableH = CANVAS_HEIGHT - padY * 2;
  const stepX = cols > 1 ? usableW / (cols - 1) : 0;
  const stepY = effectiveRows > 1 ? usableH / (effectiveRows - 1) : 0;
  const originX = cols > 1 ? padX : CENTER_X;
  const originY = effectiveRows > 1 ? padY : CENTER_Y;

  const nodes: CanvasNode[] = [];
  let i = 0;
  for (let r = 0; r < effectiveRows && i < total; r++) {
    for (let c = 0; c < cols && i < total; c++) {
      const x = originX + stepX * c;
      const y = originY + stepY * r;
      nodes.push(makeShape(shape, x, y, labelForIndex(i)));
      i++;
    }
  }
  return nodes;
}

function generateRow(
  count: number,
  shape: ShapeType,
  extras: LayoutIntent["extras"] = []
): CanvasNode[] {
  const n = Math.min(count, extras?.length ? MAX_NODES - extras.length : MAX_NODES);
  const padX = 100;
  const usableW = CANVAS_WIDTH - padX * 2;
  const stepX = n > 1 ? usableW / (n - 1) : 0;
  const baseY = CENTER_Y + 60; // shift the row down so an "above center" extra fits.

  const nodes: CanvasNode[] = [];
  for (let i = 0; i < n; i++) {
    const x = n > 1 ? padX + stepX * i : CENTER_X;
    nodes.push(makeShape(shape, x, baseY, labelForIndex(i)));
  }

  // Extras (e.g. "1 circle above center")
  for (const extra of extras ?? []) {
    if (nodes.length >= MAX_NODES) break;
    if (extra.position === "aboveCenter") {
      nodes.push(
        makeShape(extra.shape, CENTER_X, CENTER_Y - 100, labelForIndex(nodes.length), PRIMARY_FILL)
      );
    }
  }

  return nodes;
}

// ---------- Public API ----------

export function generateLayout(prompt: string): CanvasNode[] {
  const intent = parsePrompt(prompt);

  let nodes: CanvasNode[] = [];
  switch (intent.kind) {
    case "star":
      nodes = generateStar(intent.count, intent.shape);
      break;
    case "centerSurround":
      nodes = generateCenterSurround(intent.surround ?? 6, intent.shape);
      break;
    case "grid":
      nodes = generateGrid(intent.rows ?? 3, intent.cols ?? 4, intent.shape);
      break;
    case "row":
      nodes = generateRow(intent.count, intent.shape, intent.extras);
      break;
    case "fallback":
    default:
      nodes = generateRow(intent.count, intent.shape);
      break;
  }

  // Hard caps applied last, after every generator — single source of truth.
  return nodes.slice(0, MAX_NODES).map(clampNodeToCanvas);
}
