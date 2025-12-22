require('dotenv').config();

const app = require("./src/app");
const connectDB = require("./src/db/db");
const initPinecone = require("./src/db/pinecone");
const initSocketServer = require("./src/sockets/socket.server");

const httpServer = require("http").createServer(app);

const PORT = process.env.PORT || 3000;

(async () => {
  try {
    await connectDB();
    console.log("[SYSTEM] MongoDB ready");

    await initPinecone();
    console.log("[SYSTEM] Pinecone ready");

    initSocketServer(httpServer);
    console.log("[SYSTEM] Socket server ready");

    httpServer.listen(PORT, () => {
      console.log(`server listening on ${PORT}`);
    });

  } catch (err) {
    console.error("[SYSTEM] Startup error:", err.message);
    process.exit(1);
  }
})();
