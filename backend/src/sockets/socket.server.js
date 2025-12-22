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

    // save user message
    const userMessage = await messageModel.create({
      chat: payload.chat,
      user: socket.user._id,
      role: "user",
      content: payload.content
    });

    // update chat last active
    await chatModel.findByIdAndUpdate(payload.chat, {
      lastActivity: Date.now()
    });

    // ===== MEMORY DISABLED =====
    // const memory = await queryMemory({
    //   query: payload.content,
    //   limit: 5,
    //   filter: { user: socket.user._id }
    // });

    // ===== LTM DISABLED =====
    // const ltm = memory.length > 0 ? [
    //   {
    //     role: "user",
    //     parts: [{
    //       text: `Relevant past memory:\n\n${memory
    //         .map(m => m.fields?.text)
    //         .join("\n")}`
    //     }]
    //   }
    // ] : [];

    // ===== STM ONLY (last 10 messages) =====
    const chatHistory = await messageModel
      .find({ chat: payload.chat })
      .sort({ createdAt: -1 }) 
      .limit(10)
      .lean();

    const stm = chatHistory.reverse().map(m => ({
      role: m.role,
      parts: [{ text: m.content }]
    }));

    // AI reply using STM only
    const aiResponse = await generateResponse(stm, socket.user);

    // send reply
    socket.emit("ai-response", {
      chat: payload.chat,
      content: aiResponse
    });

    // save ai message
    const aiMessage = await messageModel.create({
      chat: payload.chat,
      user: socket.user._id,
      role: "model",
      content: aiResponse
    });

    // ===== MEMORY WRITE DISABLED =====
    // await createMemory({
    //   metadata: { chat: payload.chat, user: socket.user._id },
    //   text: payload.content,
    //   messageId: userMessage.id
    // });

    // await createMemory({
    //   metadata: { chat: payload.chat, user: socket.user._id },
    //   text: aiResponse,
    //   messageId: aiMessage.id
    // });

  } catch (err) {
    console.log("[SOCKET ERROR]:", err.message);
  }
});



  });

  return io;
}

module.exports = initSocketServer;
