# AI Realtime Canvas

A real-time canvas app where a user types a prompt, the backend converts it into **structured JSON (shapes + positions)**, the frontend renders the shapes with **React Konva**, and any drag is **synced across tabs in real time over WebSockets**.

The intent generator is **deterministic** (the assignment explicitly allows "structured logic"), which makes the output reliable, fast, and predictable — and keeps coordinates fully under application control rather than at the mercy of an LLM.

---

## Features

- Prompt input — free-form text like *"Create a 3x4 grid of circles labeled A–L"*
- Deterministic layout engine that produces **strict JSON** for shapes + positions
- React Konva canvas rendering with smooth dragging
- Bidirectional **WebSocket sync** — drag a shape in one tab, all other tabs update instantly
- **Hard constraints enforced server-side**: max 12 nodes, only `circle` / `rectangle`, labels ≤ 2 chars, every shape clamped inside canvas bounds
- Connection status, generation feedback, and error display in the UI
- localStorage persistence of last canvas (bonus)
- New tabs receive current canvas state on connect

---

## Tech Stack

**Frontend**
- React 18 + TypeScript
- Vite
- React Konva
- Zustand (with `persist` middleware for the bonus)
- socket.io-client

**Backend**
- Node.js + Express
- Socket.io
- TypeScript
- Deterministic layout engine (no LLM call — keeps generation reliable and free)

**Shared**
- A single `shared/types/canvas.ts` module imported by both apps so socket payloads can never drift.

---

## Architecture

```
ai-realtime-canvas/
├── shared/
│   └── types/canvas.ts          # Source of truth for socket payloads + constants
│
├── backend/
│   ├── src/
│   │   ├── index.ts             # Express + Socket.io bootstrap
│   │   ├── sockets/
│   │   │   └── canvasSocket.ts  # All canvas:* and node:* handlers
│   │   ├── services/
│   │   │   ├── promptParser.ts  # prompt -> LayoutIntent
│   │   │   ├── layoutEngine.ts  # LayoutIntent -> CanvasNode[]
│   │   │   └── canvasStore.ts   # In-memory canvas state (singleton)
│   │   ├── validators/
│   │   │   └── nodeValidator.ts # Defensive validation for all wire input
│   │   └── utils/
│   │       ├── bounds.ts        # Canvas-bound clamping
│   │       ├── id.ts            # Node ID generator
│   │       └── labels.ts        # A, B, ..., AA-style 2-char labels
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/
│   ├── src/
│   │   ├── main.tsx
│   │   ├── App.tsx
│   │   ├── components/
│   │   │   ├── Canvas.tsx       # Konva Stage + drag handling
│   │   │   ├── ShapeNode.tsx    # Renders one circle or rectangle
│   │   │   ├── PromptBar.tsx    # Prompt input + example chips
│   │   │   └── StatusBar.tsx    # Connection + node count
│   │   ├── hooks/
│   │   │   └── useCanvasSocket.ts # Wires socket events <-> store
│   │   ├── services/
│   │   │   ├── socket.ts        # Singleton socket.io client
│   │   │   └── canvasApi.ts     # Typed emit helpers
│   │   ├── store/
│   │   │   └── canvasStore.ts   # Zustand store (with persist)
│   │   ├── types/canvas.ts      # Re-export of shared types
│   │   ├── utils/throttle.ts    # Trailing-edge throttle for drag emits
│   │   └── styles.css
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts
│
├── .gitignore
└── README.md
```

### Why this layout

- **Layered backend**: socket handlers contain *no business logic*. They validate, then delegate to `services/*`. This makes the engine independently testable and lets you swap transports (e.g. HTTP, queue) without touching the engine.
- **Shared types**: the same `CanvasNode` shape and `SOCKET_EVENTS` constants are imported on both sides, so the socket contract is enforced by the compiler.
- **Server-authoritative state**: `canvasStore` on the server holds the canonical canvas. Clients emit moves; the server clamps, applies, and broadcasts. New tabs receive `canvas:state` on connect — so opening a third tab mid-session restores the full canvas immediately.
- **Zustand**: chosen over Context for fine-grained subscriptions (drag updates re-render *only* the affected shape).

---

## Socket Event Flow

| Event | Direction | Payload | Notes |
|---|---|---|---|
| `canvas:state` | server → client (on connect) | `{ nodes, updatedAt }` | Initial sync for new tabs |
| `canvas:generate` | client → server | `{ prompt }` | User submits a prompt |
| `canvas:generated` | server → all clients | `{ nodes, prompt }` | Replaces the canvas everywhere |
| `node:move` | client → server | `{ id, x, y }` | Throttled (~30ms) during drag |
| `node:moved` | server → other clients | `{ id, x, y }` | Server clamps then broadcasts (skips sender to avoid jitter) |
| `canvas:clear` | client → server → all | — | Clears canvas for everyone |
| `canvas:error` | server → sender | `{ message }` | Invalid prompt or validation failure |

---

## Installation & Setup

Requires Node.js **18+**.

```bash
git clone https://github.com/Ibaadchaudhry/ai-realtime-canvas.git
cd ai-realtime-canvas
```

### Backend

```bash
cd backend
cp .env.example .env       # optional; defaults are fine
npm install
npm run dev                # http://localhost:4000
```

### Frontend

In a **second terminal**:

```bash
cd frontend
cp .env.example .env       # optional
npm install
npm run dev                # http://localhost:5173
```

Open `http://localhost:5173` in **two tabs** to see realtime sync.

---

## Example Prompts

The deterministic parser recognizes these intents (all inside the 12-shape limit):

- `Create a star layout with 1 center node and 6 surrounding nodes` → center + ring
- `Create a 3x4 grid of circles labeled A–L` → 3×4 grid
- `Create 4 rectangles in a row and 1 circle above center` → row + featured circle
- `Create 5 circles in a star layout` → 5-point star
- `Create 8 rectangles in a grid` → grid (auto sized to fit ≤12)

Anything else falls back to a sensible row layout — the engine never crashes on unknown prompts.

---

## Sample JSON Output

A single circle node, matching the assignment's contract:

```json
{
  "nodes": [
    {
      "id": "n_abc_1",
      "type": "circle",
      "x": 400,
      "y": 200,
      "radius": 30,
      "label": "A",
      "fill": "#3fb950"
    }
  ]
}
```

---

## Constraints (enforced)

| Constraint | Where |
|---|---|
| Only `circle` / `rectangle` | `validateNode` |
| Max 12 shapes | `layoutEngine` (slice) + `validateNodes` |
| Label ≤ 2 chars | `validateNode` + `sanitizeLabel` |
| Every shape stays inside the canvas | `bounds.ts` (server + Konva `dragBoundFunc` client-side) |
| Empty / malformed prompts | `validatePrompt` → `canvas:error` |
| Empty / malformed move payloads | `validateMove` → silently dropped (drag events are high-frequency) |

---

## Assumptions

- Single global canvas (no rooms). Two browsers connected to the same server share the same canvas — exactly what "multiple tabs stay synced" needs.
- Canvas is fixed at 900×600. This is the safest way to guarantee bounds correctness; could be made responsive later.
- Server state is in-memory. A restart clears the canvas. Bonus persistence is on the client side (`localStorage`).
- No auth, no users, no rate limiting — out of scope for this assignment.

---

## Future Improvements

- Multi-room support: hash the URL → room ID so each link is its own canvas.
- Replace in-memory store with Redis so the server can scale horizontally without losing canvas state.
- Add an `LLM` layer in front of `promptParser`: extract intent with a strict function-call schema, then feed it into the existing deterministic engine. The engine stays the source of truth for coordinates; the LLM only widens vocabulary.
- Add shape resize handles + per-shape colors picked by the prompt ("blue circles in a row").
- Optimistic conflict handling: when two tabs drag the same node simultaneously, "last write wins" is fine for this scope but a CRDT (e.g. Yjs) would handle it cleanly at scale.
- Unit tests for `promptParser` (table-driven) and `layoutEngine` (snapshot the JSON output).
- WebSocket auth / signed tokens for multi-tenant deployments.

---

## Short Submission Note

**AI tool(s) used**: Claude (Anthropic) — used as a coding pair throughout the build.

**Why**: A deterministic structured-generation approach was chosen over wiring an LLM directly into the canvas. The assignment explicitly allows "structured logic", and the predictability, zero-cost generation, zero latency, and no-key setup are large wins. The architecture leaves a clean seam (`promptParser`) where an LLM could be slotted in later — it would emit the same `LayoutIntent`, and the rest of the engine wouldn't change.

**What I'd improve with more time**:
- LLM-backed intent extraction with a strict function-call schema (still keeping coordinates in app logic).
- Multi-room support keyed off URL hash.
- Replace in-memory canvas store with Redis for horizontal scaling.
- Unit tests for `promptParser`/`layoutEngine`.
- A small E2E test using Playwright that opens two browsers and verifies drag-sync.
