import { useMemo, useState } from "react";
import { useCanvasStore } from "../store/canvasStore";

/**
 * Collapsible inspector for the current canvas JSON.
 *
 * Reviewers can open this to verify the AI/layout engine is producing
 * well-formed, schema-correct JSON without leaving the app. Defaults to
 * collapsed so it doesn't dominate the layout.
 */
export function JsonPanel() {
  const nodes = useCanvasStore((s) => s.nodes);
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const text = useMemo(() => JSON.stringify({ nodes }, null, 2), [nodes]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard API can fail on insecure origins — silently ignore.
    }
  };

  return (
    <div className={`json-panel ${open ? "open" : ""}`}>
      <button
        type="button"
        className="json-panel-toggle"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span>{open ? "▾" : "▸"} Canvas JSON</span>
        <span className="json-panel-meta">{nodes.length} nodes</span>
      </button>

      {open && (
        <div className="json-panel-body">
          <div className="json-panel-actions">
            <button type="button" className="secondary small" onClick={handleCopy}>
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
          <pre className="json-panel-pre">{text}</pre>
        </div>
      )}
    </div>
  );
}
