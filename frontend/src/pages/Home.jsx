import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import ChatArea from "../components/ChatArea";
import { socket } from "../socket";
import api from "../api/axiosClient";
import "../styles/home.css";

export default function Home() {
  const navigate = useNavigate();
  const [chatId, setChatId] = useState(null);

  useEffect(() => {
    async function init() {
      const user = localStorage.getItem("user");
      if (!user) {
        navigate("/login");
        return;
      }

      socket.connect();

      // LOAD CHATS
      const res = await api.get("/chat");

      if (res.data.chats?.length > 0) {
        // show first chat
        setChatId(res.data.chats[0]._id);
      } else {
        // create first chat
        const created = await api.post("/chat", { title: "Default Chat" });
        setChatId(created.data.chat._id);
      }
    }

    init();
  }, []);

  if (!chatId) {
    return (
      <div className="home-layout">
        <Sidebar />
        <div style={{ color: "white", padding: 20 }}>
          Loading chat...
        </div>
      </div>
    );
  }

  return (
    <div className="home-layout">
      <Sidebar
        activeChat={chatId}
        onChatSelect={(id) => setChatId(id)}
      />
      <ChatArea chatId={chatId} />
    </div>
  );
}
