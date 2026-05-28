import { CanvasNode, CanvasState } from "../../../shared/types/canvas";

/**
 * In-memory canvas state. Single global canvas — the assignment is about
 * cross-tab realtime sync, not multi-room collaboration, so a singleton is
 * the right level of complexity here.
 *
 * Kept behind a small API so it can be swapped for Redis / DB later without
 * touching socket handlers.
 */
class CanvasStore {
  private state: CanvasState = { nodes: [], updatedAt: Date.now() };

  getState(): CanvasState {
    return this.state;
  }

  setNodes(nodes: CanvasNode[]): CanvasState {
    this.state = { nodes, updatedAt: Date.now() };
    return this.state;
  }

  updateNodePosition(id: string, x: number, y: number): CanvasNode | null {
    const idx = this.state.nodes.findIndex((n) => n.id === id);
    if (idx === -1) return null;
    const updated = { ...this.state.nodes[idx], x, y };
    this.state = {
      nodes: [
        ...this.state.nodes.slice(0, idx),
        updated,
        ...this.state.nodes.slice(idx + 1),
      ],
      updatedAt: Date.now(),
    };
    return updated;
  }

  clear(): CanvasState {
    this.state = { nodes: [], updatedAt: Date.now() };
    return this.state;
  }
}

export const canvasStore = new CanvasStore();
