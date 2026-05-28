/**
 * Tiny ID generator. Avoids pulling in `uuid` for a single-purpose use.
 * Collisions are not a concern: canvas state is capped at 12 nodes per session.
 */
let counter = 0;

export function makeNodeId(): string {
  counter = (counter + 1) % Number.MAX_SAFE_INTEGER;
  return `n_${Date.now().toString(36)}_${counter.toString(36)}`;
}
