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

  console.log("[SOCKET] Allowed origins:", allowed);

  const io = new Server(httpServer, {
    cors: {
      origin: (origin, cb) => {
        if (!origin || allowed.includes(origin)) {
          console.log("[SOCKET] Origin OK:", origin);
          return cb(null, true);
        }
        console.log("[SOCKET] Origin blocked:", origin);
        return cb(new Error("Not allowed by CORS"));
      },
      credentials: true
    }
  });

  io.use(async (socket, next) => {
    try {
      console.log("[SOCKET] Connection attempt.");

      const cookies = cookie.parse(socket.handshake.headers?.cookie || "");
      console.log("[SOCKET] Cookies:", cookies);

      if (!cookies.token) {
        console.log("[SOCKET] ⛔ No token found");
        return next(new Error("No token found"));
      }

      const decoded = jwt.verify(cookies.token, process.env.JWT_SECRET);
      console.log("[SOCKET] JWT decoded:", decoded);

      const user = await userModel.findById(decoded.id);
      console.log("[SOCKET] Loaded user:", user?._id);

      if (!user) {
        console.log("[SOCKET] ⛔ User not found");
        return next(new Error("Invalid user"));
      }

      socket.user = user;
      console.log("[SOCKET] User attached:", user.fullName || user._id);

      next();

    } catch (err) {
      console.log("[SOCKET] ⛔ Auth error:", err.message);
      next(new Error("Invalid token"));
    }
  });

  io.on("connection", (socket) => {
    console.log("[SOCKET] Connected:", socket.user._id);

    socket.on("ai-message", async (payload) => {
      try {
        console.log("\n========== NEW AI MESSAGE ==========");
        console.log("[STEP] Incoming payload:", payload);

        // 1️⃣ VALIDATE CHAT ID
        if (!payload.chat || payload.chat.length < 20) {
          console.log("[STEP] ⛔ Invalid chat ID");
          return;
        }

        // 2️⃣ SAVE USER MESSAGE
        console.log("[STEP] Creating user message...");
        const userMessage = await messageModel.create({
          chat: payload.chat,
          user: socket.user._id,
          role: "user",
          content: payload.content
        });
        console.log("[STEP] User message saved:", userMessage._id);

        // 3️⃣ VECTORIZE USER MESSAGE
        console.log("[STEP] Generating user vector...");
        const userVector = await generateVector(payload.content);
        console.log("[STEP] Vector created");

        // 4️⃣ UPDATE CHAT ACTIVITY
        console.log("[STEP] Updating chat timestamp...");
        await chatModel.findByIdAndUpdate(payload.chat, {
          lastActivity: Date.now()
        });
        console.log("[STEP] Chat updated");

        // 5️⃣ LOAD MEMORY & HISTORY
        console.log("[STEP] Loading memory + history...");
        const memory = await queryMemory({
          queryVector: userVector,
          limit: 5,
          metadata: { user: socket.user._id }
        });
        console.log("[STEP] Memory loaded, count:", memory.length);

        const chatHistory = await messageModel
          .find({ chat: payload.chat })
          .sort({ createdAt: 1 })
          .lean();
        console.log("[STEP] Chat history length:", chatHistory.length);

        const stm = chatHistory.map(m => ({
          role: m.role,
          parts: [{ text: m.content }]
        }));

        const ltm = [
          {
            role: "user",
            parts: [{
              text: `Relevant past messages:\n\n${memory.map(
                m => m.metadata.text
              ).join("\n")}`
            }]
          }
        ];

        // 6️⃣ GENERATE AI RESPONSE
        console.log("[STEP] Generating AI response...");
        const aiResponse = await generateResponse([...ltm, ...stm], socket.user);
        console.log("[STEP] AI response:", aiResponse.slice(0, 50), "...");

        // 7️⃣ SEND TO CLIENT
        console.log("[STEP] Sending to client...");
        socket.emit("ai-response", {
          chat: payload.chat,
          content: aiResponse
        });

        // 8️⃣ SAVE AI MESSAGE
        console.log("[STEP] Saving AI message...");
        const aiMessage = await messageModel.create({
          chat: payload.chat,
          user: socket.user._id,
          role: "model",
          content: aiResponse
        });
        console.log("[STEP] AI message saved:", aiMessage._id);

        // 9️⃣ VECTORIZE AI RESPONSE
        console.log("[STEP] Generating AI vector...");
        const aiVector = await generateVector(aiResponse);
        console.log("[STEP] AI vector generated");

        // 🔟 SAVE BOTH MEMORY
        console.log("[STEP] Saving memory chunks...");
        await createMemory({
          vectors: userVector,
          metadata: {
            chat: payload.chat,
            user: socket.user._id,
            text: payload.content
          },
          messageId: userMessage.id
        });

        await createMemory({
          vectors: aiVector,
          metadata: {
            chat: payload.chat,
            user: socket.user._id,
            text: aiResponse
          },
          messageId: aiMessage.id
        });

        console.log("[STEP] Memory saved\n");

      } catch (err) {
        console.log("[ERROR] AI MESSAGE HANDLER:", err);
      }
    });
  });

  return io;
}

module.exports = initSocketServer;
