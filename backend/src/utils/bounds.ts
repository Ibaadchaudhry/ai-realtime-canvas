import {
  CanvasNode,
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
} from "../../../shared/types/canvas";

/**
 * Compute the half-extents of a node so we can clamp its center inside the canvas.
 * Konva renders circles around (x, y) and rectangles from (x, y) as the top-left,
 * but for consistency our schema treats both as "center" positions and the
 * frontend offsets rectangles accordingly when rendering.
 */
function halfExtents(node: CanvasNode): { hx: number; hy: number } {
  if (node.type === "circle") {
    return { hx: node.radius, hy: node.radius };
  }
  return { hx: node.width / 2, hy: node.height / 2 };
}

export function clampNodeToCanvas(node: CanvasNode): CanvasNode {
  const { hx, hy } = halfExtents(node);
  const x = Math.min(Math.max(node.x, hx), CANVAS_WIDTH - hx);
  const y = Math.min(Math.max(node.y, hy), CANVAS_HEIGHT - hy);
  return { ...node, x, y };
}

export function clampPosition(
  x: number,
  y: number,
  hx: number,
  hy: number
): { x: number; y: number } {
  return {
    x: Math.min(Math.max(x, hx), CANVAS_WIDTH - hx),
    y: Math.min(Math.max(y, hy), CANVAS_HEIGHT - hy),
  };
}
