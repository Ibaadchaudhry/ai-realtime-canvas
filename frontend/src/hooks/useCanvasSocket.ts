import { useEffect } from "react";
import { getSocket } from "../services/socket";
import { useCanvasStore } from "../store/canvasStore";
import {
  CanvasErrorPayload,
  CanvasGeneratedPayload,
  CanvasState,
  NodeMovedPayload,
  SOCKET_EVENTS,
} from "../types/canvas";

/**
 * Wires the singleton socket to the Zustand store. Mount once at the app root.
 *
 * Server is the source of truth for state changes from other clients. Local
 * drags update the store optimistically inside the canvas component, and a
 * matching event from the server for other clients keeps them in sync.
 */
export function useCanvasSocket(): void {
  const setNodes = useCanvasStore((s) => s.setNodes);
  const updateNodePosition = useCanvasStore((s) => s.updateNodePosition);
  const setConnected = useCanvasStore((s) => s.setConnected);
  const setGenerating = useCanvasStore((s) => s.setGenerating);
  const setError = useCanvasStore((s) => s.setError);

  useEffect(() => {
    const socket = getSocket();

    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);

    const onCanvasState = (state: CanvasState) => {
      if (state?.nodes) setNodes(state.nodes);
    };

    const onGenerated = (payload: CanvasGeneratedPayload) => {
      setGenerating(false);
      setNodes(payload.nodes);
    };

    const onMoved = (payload: NodeMovedPayload) => {
      updateNodePosition(payload.id, payload.x, payload.y);
    };

    const onError = (payload: CanvasErrorPayload) => {
      setGenerating(false);
      setError(payload?.message ?? "Unknown error");
    };

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on(SOCKET_EVENTS.CANVAS_STATE, onCanvasState);
    socket.on(SOCKET_EVENTS.CANVAS_GENERATED, onGenerated);
    socket.on(SOCKET_EVENTS.NODE_MOVED, onMoved);
    socket.on(SOCKET_EVENTS.CANVAS_ERROR, onError);

    if (!socket.connected) socket.connect();

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off(SOCKET_EVENTS.CANVAS_STATE, onCanvasState);
      socket.off(SOCKET_EVENTS.CANVAS_GENERATED, onGenerated);
      socket.off(SOCKET_EVENTS.NODE_MOVED, onMoved);
      socket.off(SOCKET_EVENTS.CANVAS_ERROR, onError);
    };
  }, [setConnected, setError, setGenerating, setNodes, updateNodePosition]);
}
