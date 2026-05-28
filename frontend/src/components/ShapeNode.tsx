import { Circle, Group, Rect, Text } from "react-konva";
import type { KonvaEventObject } from "konva/lib/Node";
import type { CanvasNode } from "../types/canvas";

interface Props {
  node: CanvasNode;
  onDragMove: (id: string, x: number, y: number) => void;
  onDragEnd: (id: string, x: number, y: number) => void;
  dragBoundFunc: (
    node: CanvasNode,
    pos: { x: number; y: number }
  ) => { x: number; y: number };
}

function setCursor(e: KonvaEventObject<MouseEvent | DragEvent>, cursor: string) {
  const container = e.target.getStage()?.container();
  if (container) container.style.cursor = cursor;
}

/**
 * One renderable shape on the canvas. We render circles around (x,y) but
 * rectangles use (x,y) as the *center*, applying offset so drag math and
 * server-side bounds checks line up across both shape types.
 *
 * Label sits inside the shape, centered. Konva handles transforms, drag, and
 * hit detection — we just pass coordinates through.
 */
export function ShapeNode({ node, onDragMove, onDragEnd, dragBoundFunc }: Props) {
  const handleDragMove = (e: KonvaEventObject<DragEvent>) => {
    onDragMove(node.id, e.target.x(), e.target.y());
  };
  const handleDragEnd = (e: KonvaEventObject<DragEvent>) => {
    setCursor(e, "grab");
    onDragEnd(node.id, e.target.x(), e.target.y());
  };
  const onMouseEnter = (e: KonvaEventObject<MouseEvent>) => setCursor(e, "grab");
  const onMouseLeave = (e: KonvaEventObject<MouseEvent>) => setCursor(e, "default");
  const onDragStart = (e: KonvaEventObject<DragEvent>) => setCursor(e, "grabbing");

  if (node.type === "circle") {
    return (
      <Group
        x={node.x}
        y={node.y}
        draggable
        dragBoundFunc={(pos) => dragBoundFunc(node, pos)}
        onDragStart={onDragStart}
        onDragMove={handleDragMove}
        onDragEnd={handleDragEnd}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
      >
        <Circle
          radius={node.radius}
          fill={node.fill ?? "#3fb950"}
          stroke="#1f2933"
          strokeWidth={2}
          shadowColor="rgba(0,0,0,0.25)"
          shadowBlur={6}
          shadowOffsetY={2}
        />
        <Text
          text={node.label}
          fontSize={Math.max(14, node.radius * 0.9)}
          fontStyle="bold"
          fill="#ffffff"
          width={node.radius * 2}
          height={node.radius * 2}
          offsetX={node.radius}
          offsetY={node.radius}
          align="center"
          verticalAlign="middle"
          listening={false}
        />
      </Group>
    );
  }

  // rectangle — treat (x, y) as center via offset.
  return (
    <Group
      x={node.x}
      y={node.y}
      draggable
      dragBoundFunc={(pos) => dragBoundFunc(node, pos)}
      onDragMove={handleDragMove}
      onDragEnd={handleDragEnd}
    >
      <Rect
        x={-node.width / 2}
        y={-node.height / 2}
        width={node.width}
        height={node.height}
        fill={node.fill ?? "#3fb950"}
        stroke="#1f2933"
        strokeWidth={2}
        cornerRadius={6}
        shadowColor="rgba(0,0,0,0.25)"
        shadowBlur={6}
        shadowOffsetY={2}
      />
      <Text
        text={node.label}
        fontSize={Math.max(14, Math.min(node.width, node.height) * 0.45)}
        fontStyle="bold"
        fill="#ffffff"
        width={node.width}
        height={node.height}
        offsetX={node.width / 2}
        offsetY={node.height / 2}
        align="center"
        verticalAlign="middle"
        listening={false}
      />
    </Group>
  );
}
