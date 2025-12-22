const { Server } = require("socket.io");
const cookie = require("cookie");
const jwt = require("jsonwebtoken");

const userModel = require("../models/user.model");
const messageModel = require("../models/message.model");
const chatModel = require("../models/chat.model");

const { generateResponse } = require("../services/groq.service");
const { createMemory, queryMemory } = require("../services/vector.service");

function initSocketServer(httpServer) {

  const allowed = (process.env.FRONTEND_URLS || "http://localhost:5173")
    .split(",");

  const io = new Server(httpServer, {
    cors: {
      origin: (origin, cb) => {
        if (!origin || allowed.includes(origin)) return cb(null, true);
        return cb(new Error("Not allowed by CORS"));
      },
      credentials: true
    }
  });

  // auth check
  io.use(async (socket, next) => {
    try {
      const cookies = cookie.parse(socket.handshake.headers?.cookie || "");
      if (!cookies.token) return next(new Error("No auth token"));

      const decoded = jwt.verify(cookies.token, process.env.JWT_SECRET);
      const user = await userModel.findById(decoded.id);

      if (!user) return next(new Error("User not found"));
      socket.user = user;

      next();
    } catch (err) {
      next(new Error("Invalid auth token"));
    }
  });

  // socket handler
  io.on("connection", (socket) => {

    socket.on("ai-message", async (payload) => {
      try {
        if (!payload.chat || payload.chat.length < 20) return;

        const userMessage = await messageModel.create({
          chat: payload.chat,
          user: socket.user._id,
          role: "user",
          content: payload.content
        });

        await chatModel.findByIdAndUpdate(payload.chat, {
          lastActivity: Date.now()
        });

        const memory = await queryMemory({
          query: payload.content,
          limit: 5,
          filter: { user: socket.user._id }
        });

        const chatHistory = await messageModel
          .find({ chat: payload.chat })
          .sort({ createdAt: 1 })
          .lean();

        const stm = chatHistory.map(m => ({
          role: m.role,
          parts: [{ text: m.content }]
        }));

        const ltm = memory.length > 0 ? [
          {
            role: "user",
            parts: [{
              text: `Relevant past messages:\n\n${memory
                .map(m => m.fields?.text)
                .join("\n")}`
            }]
          }
        ] : [];

        const aiResponse = await generateResponse([...ltm, ...stm], socket.user);

        socket.emit("ai-response", {
          chat: payload.chat,
          content: aiResponse
        });

        const aiMessage = await messageModel.create({
          chat: payload.chat,
          user: socket.user._id,
          role: "model",
          content: aiResponse
        });

        await createMemory({
          metadata: { chat: payload.chat, user: socket.user._id },
          text: payload.content,
          messageId: userMessage.id
        });

        await createMemory({
          metadata: { chat: payload.chat, user: socket.user._id },
          text: aiResponse,
          messageId: aiMessage.id
        });

      } catch (err) {
        console.log("[SOCKET ERROR]:", err.message);
      }
    });
  });

  return io;
}

module.exports = initSocketServer;
