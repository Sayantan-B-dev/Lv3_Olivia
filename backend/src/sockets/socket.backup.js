const { Server } = require("socket.io");
const cookie = require("cookie");
const jwt = require("jsonwebtoken");
const userModel = require("../models/user.model");
const messageModel = require("../models/message.model");
const chatModel = require("../models/chat.model");
const { generateResponse } = require("../services/groq.service");
const { generateVector } = require("../services/embedding.service");
const { createMemory, queryMemory } = require("../services/vector.service");

function initSocketServer(httpServer) {
  const allowed = (process.env.FRONTEND_URLS || "http://localhost:5173").split(",");
  const io = new Server(httpServer, {
    cors: {
      origin: (origin, cb) => {
        if (!origin || allowed.includes(origin)) return cb(null, true);
        return cb(new Error("Not allowed by CORS"));
      },
      credentials: true
    }
  });

  io.use(async (socket, next) => {
    const cookies = cookie.parse(socket.handshake.headers?.cookie || "");
    if (!cookies.token) return next(new Error("No token found"));

    try {
      const decoded = jwt.verify(cookies.token, process.env.JWT_SECRET);
      socket.user = await userModel.findById(decoded.id);
      next();
    } catch (err) {
      next(new Error("Invalid token"));
    }
  });

  io.on("connection", (socket) => {
    //console.log("SOCKET USER:", socket.user.fullName.firstName);

    socket.on("ai-message", async (payload) => {

      // ===== prevent bad chat IDs =====
      if (!payload.chat || payload.chat.length < 20) return;

      // ===== save user message =====
      const [{ userMessage, userVector }] = await Promise.all([(
        async () => {
          const userMessage = await messageModel.create({
            chat: payload.chat,
            user: socket.user._id,
            role: "user",
            content: payload.content
          });

          const userVector = await generateVector(payload.content);
          return { userMessage, userVector };
        }
      )()]);

      // ===== update chat last used =====
      await chatModel.findByIdAndUpdate(payload.chat, {
        lastActivity: Date.now()
      });

      // ===== load memory + full history =====
      const [memory, chatHistory] = await Promise.all([
        queryMemory({
          queryVector: userVector,
          limit: 5,
          metadata: { user: socket.user._id }
        }),
        messageModel.find({ chat: payload.chat })
          .sort({ createdAt: 1 })
          .lean()
      ]);

      // ===== short-term context =====
      const stm = chatHistory.map(m => ({
        role: m.role,
        parts: [{ text: m.content }]
      }));

      // ===== long-term memory =====
      const ltm = [
        {
          role: "user",
          parts: [{
            text:
`Relevant past messages:\n\n${memory.map(
  m => m.metadata.text
).join("\n")}`
          }]
        }
      ];

      // ===== AI RESPONSE =====
      const aiResponse = await generateResponse([...ltm, ...stm], socket.user);

      // ===== SEND IMMEDIATELY =====
      socket.emit("ai-response", {
        chat: payload.chat,
        content: aiResponse
      });

      // ===== background processing =====
      (async () => {

        createMemory({
          vectors: userVector,
          metadata: {
            chat: payload.chat,
            user: socket.user._id,
            text: payload.content
          },
          messageId: userMessage.id
        });

        const aiMessage = await messageModel.create({
          chat: payload.chat,
          user: socket.user._id,
          role: "model",
          content: aiResponse
        });

        const aiVector = await generateVector(aiResponse);

        createMemory({
          vectors: aiVector,
          metadata: {
            chat: payload.chat,
            user: socket.user._id,
            text: aiResponse
          },
          messageId: aiMessage.id
        });

      })();
    });
  });
}

module.exports = initSocketServer; 
