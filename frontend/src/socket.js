import { io } from "socket.io-client";

const socketBase = import.meta.env.VITE_API_URL
export const socket = io(socketBase, {
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
