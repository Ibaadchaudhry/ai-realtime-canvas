import { io, Socket } from "socket.io-client";

/**
 * Singleton socket instance. We connect lazily so SSR or tests that import this
 * module don't accidentally open a socket. `autoConnect: false` keeps that
 * promise explicit — the store calls `socket.connect()` when ready.
 */
const URL = import.meta.env.VITE_SOCKET_URL ?? "http://localhost:4000";

let instance: Socket | null = null;

export function getSocket(): Socket {
  if (!instance) {
    instance = io(URL, {
      autoConnect: false,
      transports: ["websocket"],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 500,
    });
  }
  return instance;
}
