import { useCanvasStore } from "../store/canvasStore";
import { MAX_NODES } from "../types/canvas";

export function StatusBar() {
  const isConnected = useCanvasStore((s) => s.isConnected);
  const nodeCount = useCanvasStore((s) => s.nodes.length);

  return (
    <div className="status-bar">
      <span className={`status-dot ${isConnected ? "online" : "offline"}`} />
      <span>{isConnected ? "Connected" : "Disconnected"}</span>
      <span className="status-sep">•</span>
      <span>
        {nodeCount} / {MAX_NODES} nodes
      </span>
    </div>
  );
}
