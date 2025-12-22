import { io } from "socket.io-client";

export const socket = io("https://olivia-chatbot.onrender.com", {
  transports: ["websocket"],
  withCredentials: true,
  autoConnect: false
});

// Debug logs
socket.on("connect", () => {
  console.log("✅ SOCKET CONNECTED:", socket.id);
});

socket.on("connect_error", (err) => {
  console.log("❌ SOCKET ERROR:", err.message);
});
