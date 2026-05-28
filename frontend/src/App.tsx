import { Canvas } from "./components/Canvas";
import { JsonPanel } from "./components/JsonPanel";
import { PromptBar } from "./components/PromptBar";
import { StatusBar } from "./components/StatusBar";
import { useCanvasSocket } from "./hooks/useCanvasSocket";
import { useCanvasStore } from "./store/canvasStore";

export default function App() {
  useCanvasSocket();
  const lastPrompt = useCanvasStore((s) => s.lastPrompt);
  const hasNodes = useCanvasStore((s) => s.nodes.length > 0);

  return (
    <div className="app">
      <header className="app-header">
        <div>
          <h1>AI Realtime Canvas</h1>
          <p className="subtitle">
            Type a prompt → shapes are generated as structured JSON, rendered with
            Konva, and synced across tabs over WebSockets.
          </p>
          {hasNodes && lastPrompt && (
            <p className="active-prompt">
              <span>Current prompt:</span>
              <code>{lastPrompt}</code>
            </p>
          )}
        </div>
        <StatusBar />
      </header>

      <PromptBar />
      <Canvas />
      <JsonPanel />

      <footer className="app-footer">
        Open this URL in a second tab to see realtime sync.
      </footer>
    </div>
  );
}
