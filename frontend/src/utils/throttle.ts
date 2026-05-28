/**
 * Lightweight trailing-edge throttle for drag events — caps the rate at which
 * we emit move messages without dropping the final position. Avoids flooding
 * the socket on fast drags.
 */
export function throttle<T extends (...args: any[]) => void>(
  fn: T,
  wait: number
): (...args: Parameters<T>) => void {
  let lastInvoke = 0;
  let pending: ReturnType<typeof setTimeout> | null = null;
  let pendingArgs: Parameters<T> | null = null;

  const invoke = () => {
    lastInvoke = Date.now();
    if (pendingArgs) fn(...pendingArgs);
    pendingArgs = null;
    pending = null;
  };

  return (...args: Parameters<T>) => {
    const now = Date.now();
    const remaining = wait - (now - lastInvoke);
    pendingArgs = args;

    if (remaining <= 0) {
      if (pending) {
        clearTimeout(pending);
        pending = null;
      }
      invoke();
    } else if (!pending) {
      pending = setTimeout(invoke, remaining);
    }
  };
}
