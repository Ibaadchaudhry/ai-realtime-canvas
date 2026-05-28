import { ShapeType } from "../../../shared/types/canvas";

/**
 * Parse a free-form prompt into a structured Intent that the layout engine
 * can consume. This is deliberately deterministic — no LLM — because the
 * assignment explicitly accepts "structured logic" and reliability matters
 * more than vocabulary breadth for a 2-hour build.
 *
 * The parser favors precision: when no specific pattern matches, it falls
 * back to a sensible default (row of circles).
 */

export type LayoutKind = "star" | "grid" | "row" | "centerSurround" | "fallback";

export interface LayoutIntent {
  kind: LayoutKind;
  shape: ShapeType;
  count: number;
  /** Grid only */
  rows?: number;
  cols?: number;
  /** centerSurround only */
  surround?: number;
  /** row + centerSurround can mix in an "above center" shape */
  extras?: Array<{ shape: ShapeType; position: "aboveCenter" }>;
}

const NUMBER_WORDS: Record<string, number> = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6,
  seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12,
};

function firstNumber(text: string, fallback: number): number {
  const digit = text.match(/\b(\d{1,2})\b/);
  if (digit) return clampCount(parseInt(digit[1], 10));
  for (const [word, value] of Object.entries(NUMBER_WORDS)) {
    if (new RegExp(`\\b${word}\\b`).test(text)) return clampCount(value);
  }
  return fallback;
}

/**
 * Look for a number adjacent to a keyword — handles prompts like
 * "1 center node and 6 surrounding nodes" where the *surround* count
 * is what we actually need, not the first number in the string.
 */
function numberNear(text: string, keyword: string, fallback: number): number {
  const re = new RegExp(
    `(?:(\\d{1,2})\\s+\\w*\\s*${keyword})|(?:${keyword}\\w*\\s+(?:by\\s+)?(\\d{1,2}))`,
    "i"
  );
  const m = text.match(re);
  if (m) {
    const raw = m[1] ?? m[2];
    if (raw) return clampCount(parseInt(raw, 10));
  }
  return fallback;
}

function clampCount(n: number): number {
  if (!Number.isFinite(n) || n < 1) return 1;
  if (n > 12) return 12;
  return Math.floor(n);
}

function detectShape(text: string): ShapeType {
  if (/rect|square|box/.test(text)) return "rectangle";
  return "circle";
}

function parseGrid(text: string): { rows: number; cols: number } | null {
  // matches "3x4", "3 x 4", "3 by 4"
  const m = text.match(/(\d{1,2})\s*(?:x|by|\*)\s*(\d{1,2})/i);
  if (!m) return null;
  const rows = clampCount(parseInt(m[1], 10));
  const cols = clampCount(parseInt(m[2], 10));
  if (rows * cols > 12) {
    // Scale down to fit the constraint. Prefer keeping aspect ratio.
    const ratio = Math.sqrt(12 / (rows * cols));
    return {
      rows: Math.max(1, Math.floor(rows * ratio)),
      cols: Math.max(1, Math.floor(cols * ratio)),
    };
  }
  return { rows, cols };
}

export function parsePrompt(rawPrompt: string): LayoutIntent {
  const prompt = rawPrompt.toLowerCase();
  const shape = detectShape(prompt);

  // 1. Grid: "3x4", "3 by 4 grid", "grid of circles"
  const grid = parseGrid(prompt);
  if (grid || /\bgrid\b/.test(prompt)) {
    const g = grid ?? { rows: 3, cols: 4 };
    return {
      kind: "grid",
      shape,
      count: g.rows * g.cols,
      rows: g.rows,
      cols: g.cols,
    };
  }

  // 2. Star layout: "star layout"
  if (/\bstar\b/.test(prompt)) {
    // "1 center + N surrounding" style phrasing uses centerSurround;
    // plain "star layout with N nodes" uses the star generator.
    if (/\bcenter\b/.test(prompt) || /surround/.test(prompt)) {
      const surround = numberNear(prompt, "surround", firstNumber(prompt, 6));
      return {
        kind: "centerSurround",
        shape,
        count: surround + 1,
        surround,
      };
    }
    const count = firstNumber(prompt, 5);
    return { kind: "star", shape, count };
  }

  // 3. Explicit "1 center + surrounding" / "surrounded by"
  if (/\bcenter\b/.test(prompt) && /surround/.test(prompt)) {
    const surround = numberNear(prompt, "surround", firstNumber(prompt, 6));
    return {
      kind: "centerSurround",
      shape,
      count: surround + 1,
      surround,
    };
  }

  // 4. "row" / "in a row" — possibly with an "above center" extra shape
  if (/\brow\b/.test(prompt) || /\bin a line\b/.test(prompt)) {
    const count = firstNumber(prompt, 4);
    const extras: LayoutIntent["extras"] = [];
    if (/above center/.test(prompt) || /above the center/.test(prompt)) {
      const extraShape: ShapeType = /\bcircle\b/.test(prompt.split(/above/)[1] ?? "")
        ? "circle"
        : detectShape((prompt.split(/and/)[1] ?? ""));
      extras.push({ shape: extraShape, position: "aboveCenter" });
    }
    return { kind: "row", shape, count, extras };
  }

  // 5. Fallback: take the number we find and lay it out in a row.
  return {
    kind: "fallback",
    shape,
    count: firstNumber(prompt, 5),
  };
}
