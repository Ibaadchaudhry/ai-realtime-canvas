import { MAX_LABEL_LENGTH } from "../../../shared/types/canvas";

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

/**
 * Produce alphabetic labels (A..Z, then AA, AB, ...) capped at MAX_LABEL_LENGTH chars.
 * Matches the assignment example "circles labeled A–L".
 */
export function labelForIndex(index: number): string {
  if (index < 0) return "?";
  if (index < ALPHABET.length) return ALPHABET[index];

  // 26..701 -> two-letter labels
  const first = Math.floor(index / ALPHABET.length) - 1;
  const second = index % ALPHABET.length;
  const label = ALPHABET[first] + ALPHABET[second];
  return label.slice(0, MAX_LABEL_LENGTH);
}

export function sanitizeLabel(raw: unknown): string {
  if (typeof raw !== "string") return "";
  return raw.trim().slice(0, MAX_LABEL_LENGTH);
}
