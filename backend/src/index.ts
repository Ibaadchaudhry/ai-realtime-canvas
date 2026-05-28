import http from "http";
import express from "express";
import cors from "cors";
import { Server } from "socket.io";
import { registerCanvasHandlers } from "./sockets/canvasSocket";
import { canvasStore } from "./services/canvasStore";

const PORT = Number(process.env.PORT ?? 4000);
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN ?? "*";

const app = express();
app.use(cors({ origin: CLIENT_ORIGIN }));
app.use(express.json({ limit: "32kb" }));

// Simple health + state inspection endpoints — useful in production for
// uptime checks and debugging. No auth needed for this assignment scope.
app.get("/health", (_req, res) => {
  res.json({ ok: true, uptime: process.uptime() });
});

app.get("/state", (_req, res) => {
  res.json(canvasStore.getState());
});

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: CLIENT_ORIGIN, methods: ["GET", "POST"] },
});

io.on("connection", (socket) => {
  registerCanvasHandlers(io, socket);
});

server.listen(PORT, () => {
  console.log(`[backend] listening on http://localhost:${PORT}`);
});

// Defensive logging — never crash the process on a stray async error.
process.on("unhandledRejection", (reason) => {
  console.error("[backend] unhandledRejection:", reason);
});
process.on("uncaughtException", (err) => {
  console.error("[backend] uncaughtException:", err);
});
