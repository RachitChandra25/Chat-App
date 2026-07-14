// ======================
// IMPORTS
// ======================
import express from "express";
import "dotenv/config";
import http from "http";
import { Server } from "socket.io";
import path from "path";
import { fileURLToPath } from "url";

import { connectDB } from "./lib/db.js";
import userRouter from "./routes/userRoutes.js";
import messageRouter from "./routes/messageRoutes.js";

// ======================
// APP + SERVER
// ======================
const app = express();
const server = http.createServer(app);

// ======================
// CORS
// ======================
const allowedOrigins = [
  // Production Render
  "https://chat-app-d5m6.onrender.com",
  // Production Vercel frontend
  process.env.FRONTEND_URL || "https://chat-app-gilt-delta-67.vercel.app",
  // Local development
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:3000",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:5174",
  "http://127.0.0.1:3000",
].filter(Boolean);

app.use((req, res, next) => {
  const origin = req.headers.origin;

  // Check if origin is in allowed list
  if (allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Credentials", "true");
  }

  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET,POST,PUT,DELETE,OPTIONS,PATCH",
  );
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, X-Requested-With, token",
  );

  // Handle preflight requests
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }

  next();
});

// ======================
// MIDDLEWARES
// ======================
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));

// ======================
// SOCKET.IO
// ======================
export const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    credentials: true,
  },
  transports: ["polling", "websocket"],
  allowUpgrades: true,
  maxHttpBufferSize: 1e7,
  perMessageDeflate: {
    maxRecoveryAttempts: 1,
  },
});

// Online users map
export const userSocketMap = {}; // { userId: [socketId] }

io.on("connection", (socket) => {
  const userId = socket.handshake.query.userId;
  console.log("User Connected:", userId);

  if (userId && userId !== "undefined") {
    if (!userSocketMap[userId]) {
      userSocketMap[userId] = [];
    }
    userSocketMap[userId].push(socket.id);
    io.emit("getOnlineUsers", Object.keys(userSocketMap));
  }

  socket.on("disconnect", () => {
    console.log("User Disconnected:", userId);
    if (userId && userSocketMap[userId]) {
      userSocketMap[userId] = userSocketMap[userId].filter(id => id !== socket.id);
      if (userSocketMap[userId].length === 0) {
        delete userSocketMap[userId];
      }
      io.emit("getOnlineUsers", Object.keys(userSocketMap));
    }
  });
});

// ======================
// ROUTES
// ======================
app.get("/api/status", (req, res) => {
  res.json({ status: "ok", message: "Server is live 🚀" });
});

app.get("/api/health", (req, res) => {
  res.json({ status: "healthy", timestamp: new Date().toISOString() });
});

app.use("/api/auth", userRouter);
app.use("/api/messages", messageRouter);

// ======================
// STATIC FILES + SPA FALLBACK (Production only)
// ======================
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicPath = path.join(__dirname, "dist/public");

if (process.env.NODE_ENV === "production") {
  app.use(express.static(publicPath));

  // Serve React app for all non-API routes (SPA fallback)
  app.get(/.*/, (req, res) => {
    const indexPath = path.join(publicPath, "index.html");
    res.sendFile(indexPath, (err) => {
      if (err) {
        console.error("Error sending index.html:", err);
        res.status(500).send("Error loading application");
      }
    });
  });
}

// ======================
// DATABASE
// ======================
await connectDB();

// ======================
// START SERVER
// ======================
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on PORT ${PORT}`));

// ======================
// EXPORT FOR VERCEL
// ======================
export default server;
