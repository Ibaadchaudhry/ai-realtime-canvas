import { FormEvent, useState } from "react";
import { useCanvasStore } from "../store/canvasStore";
import { emitClear, emitGenerate } from "../services/canvasApi";

const EXAMPLES = [
  "Create a star layout with 1 center node and 6 surrounding nodes",
  "Create a 3x4 grid of circles labeled A–L",
  "Create 4 rectangles in a row and 1 circle above center",
  "Create 5 circles in a star layout",
];

/**
 * Prompt entry + quick-pick examples. Generation feedback (loading / errors)
 * comes from the canvas store so reviewers can see the realtime cycle clearly.
 */
export function PromptBar() {
  const isConnected = useCanvasStore((s) => s.isConnected);
  const isGenerating = useCanvasStore((s) => s.isGenerating);
  const error = useCanvasStore((s) => s.error);
  const setGenerating = useCanvasStore((s) => s.setGenerating);
  const setLastPrompt = useCanvasStore((s) => s.setLastPrompt);
  const setError = useCanvasStore((s) => s.setError);
  const lastPrompt = useCanvasStore((s) => s.lastPrompt);

  const [value, setValue] = useState(lastPrompt);

  const submit = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) {
      setError("Enter a prompt to generate shapes.");
      return;
    }
    setError(null);
    setGenerating(true);
    setLastPrompt(trimmed);
    emitGenerate(trimmed);
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    submit(value);
  };

  return (
    <div className="prompt-bar">
      <form onSubmit={onSubmit} className="prompt-row">
        <input
          className="prompt-input"
          placeholder='e.g. "Create a 3x4 grid of circles"'
          value={value}
          onChange={(e) => setValue(e.target.value)}
          disabled={!isConnected || isGenerating}
          aria-label="Canvas prompt"
        />
        <button
          type="submit"
          className="primary"
          disabled={!isConnected || isGenerating}
        >
          {isGenerating ? (
            <>
              <span className="spinner" aria-hidden="true" />
              Generating…
            </>
          ) : (
            "Generate"
          )}
        </button>
        <button
          type="button"
          className="secondary"
          onClick={() => {
            setValue("");
            emitClear();
          }}
          disabled={!isConnected}
        >
          Clear
        </button>
      </form>

      <div className="examples">
        <span className="examples-label">Try:</span>
        {EXAMPLES.map((ex) => (
          <button
            key={ex}
            type="button"
            className="example-chip"
            onClick={() => {
              setValue(ex);
              submit(ex);
            }}
            disabled={!isConnected || isGenerating}
          >
            {ex}
          </button>
        ))}
      </div>

      {error && <div className="error">{error}</div>}
    </div>
  );
}
