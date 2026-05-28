import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { CanvasNode } from "../types/canvas";

/**
 * Canvas store — owns all client state related to the canvas.
 *
 * Persisted to localStorage so a refresh restores the last-seen state
 * (assignment bonus). The server is still the source of truth; on connect
 * the server's CANVAS_STATE event will overwrite this.
 */
interface CanvasStoreState {
  nodes: CanvasNode[];
  isConnected: boolean;
  isGenerating: boolean;
  lastPrompt: string;
  error: string | null;

  setNodes: (nodes: CanvasNode[]) => void;
  updateNodePosition: (id: string, x: number, y: number) => void;
  setConnected: (v: boolean) => void;
  setGenerating: (v: boolean) => void;
  setLastPrompt: (p: string) => void;
  setError: (msg: string | null) => void;
  clear: () => void;
}

export const useCanvasStore = create<CanvasStoreState>()(
  persist(
    (set) => ({
      nodes: [],
      isConnected: false,
      isGenerating: false,
      lastPrompt: "",
      error: null,

      setNodes: (nodes) => set({ nodes, error: null }),
      updateNodePosition: (id, x, y) =>
        set((state) => ({
          nodes: state.nodes.map((n) => (n.id === id ? { ...n, x, y } : n)),
        })),
      setConnected: (isConnected) => set({ isConnected }),
      setGenerating: (isGenerating) => set({ isGenerating }),
      setLastPrompt: (lastPrompt) => set({ lastPrompt }),
      setError: (error) => set({ error }),
      clear: () => set({ nodes: [], error: null, lastPrompt: "" }),
    }),
    {
      name: "ai-canvas-state",
      storage: createJSONStorage(() => localStorage),
      // Only persist the canvas itself — transient flags shouldn't survive refresh.
      partialize: (s) => ({ nodes: s.nodes, lastPrompt: s.lastPrompt }),
    }
  )
);
