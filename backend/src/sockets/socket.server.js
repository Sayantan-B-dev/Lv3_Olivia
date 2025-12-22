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
  console.log("🔌 Initializing Socket.IO server...");

  const io = new Server(httpServer, {
    pingInterval: 25000,
    pingTimeout: 60000,
    path: "/socket.io/",
    cors: {
      origin: [
        process.env.FRONTEND_URL,
        "http://localhost:5173",
        "https://olivia-chatbot.onrender.com"
      ],
      credentials: true
    }
  });

  // Middleware: Authenticate socket user
  io.use(async (socket, next) => {
    try {
      console.log("\n🔍 SOCKET AUTH CHECK");
      const cookies = cookie.parse(socket.handshake.headers?.cookie || "");
      console.log("🍪 Extracted cookie:", cookies.token ? "FOUND" : "MISSING");

      if (!cookies.token) {
        console.log("❌ No token — rejecting socket connection.");
        return next(new Error("NO_TOKEN"));
      }

      const decoded = jwt.verify(cookies.token, process.env.JWT_SECRET);
      console.log("🔑 JWT decoded:", decoded.id);

      const user = await userModel.findById(decoded.id);
      if (!user) {
        console.log("❌ No user found — rejecting connection.");
        return next(new Error("INVALID_USER"));
      }

      console.log("✅ Socket user authenticated:", user.fullName.firstName);
      socket.user = user;
      next();

    } catch (err) {
      console.log("❌ AUTH ERROR:", err.message);
      next(new Error("AUTH_FAILED"));
    }
  });

  // Connected
  io.on("connection", (socket) => {
    console.log(`\n⚡ USER CONNECTED → ${socket.user.fullName.firstName} (${socket.id})`);

    socket.on("disconnect", () => {
      console.log(`⚠️ USER DISCONNECTED → ${socket.id}`);
    });

    socket.on("ai-message", async (payload) => {
      try {
        console.log("\n💬 Incoming user message event...");
        console.log("🟢 Chat ID:", payload.chat);
        console.log("🟢 Text:", payload.content);

        if (!payload.chat || payload.chat.length < 20) {
          console.log("❌ BAD CHAT ID — rejected");
          return;
        }

        // console.log("📥 Saving user message...");
        // const [{ userMessage, userVector }] = await Promise.all([(
        //   async () => {
        //     const userMessage = await messageModel.create({
        //       chat: payload.chat,
        //       user: socket.user._id,
        //       role: "user",
        //       content: payload.content
        //     });

        //     const userVector = await generateVector(payload.content);
        //     return { userMessage, userVector };
        //   }
        // )()]);
        console.log("📌 Writing to DB...");
        const userMessage = await messageModel.create({
          chat: payload.chat,
          user: socket.user._id,
          role: "user",
          content: payload.content
        });
        console.log("✔️ Saved user message:", userMessage._id);

        console.log("🧠 Calling generateVector()...");
        const userVector = await generateVector(payload.content);
        console.log("✔️ Vector created.");


        console.log("📌 Updating chat activity timestamp...");
        await chatModel.findByIdAndUpdate(payload.chat, {
          lastActivity: Date.now()
        });

        console.log("📂 Loading memory + chat history...");
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

        console.log("🧠 Memory items found:", memory.length);
        console.log("📝 History length:", chatHistory.length);

        const stm = chatHistory.map(m => ({
          role: m.role,
          parts: [{ text: m.content }]
        }));

        const ltm = [
          {
            role: "user",
            parts: [{
              text: `Relevant past messages:\n\n${memory.map(m => m.metadata.text).join("\n")}`
            }]
          }
        ];

        console.log("🤖 Generating AI response...");
        const aiResponse = await generateResponse([...ltm, ...stm], socket.user);

        console.log("📤 Sending AI response back to client...");
        socket.emit("ai-response", {
          chat: payload.chat,
          content: aiResponse
        });

        console.log("🧵 Background jobs running...");
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

        console.log("🏁 Message cycle complete.");

      } catch (err) {
        console.log("❌ SOCKET PROCESS ERROR:", err.message);
      }
    });
  });

  return io;
}

module.exports = initSocketServer;
