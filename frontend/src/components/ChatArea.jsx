import { useEffect, useRef, useState } from "react";
import { socket } from "../socket";
import api from "../api/axiosClient";
import "../styles/chatarea.css";

export default function ChatArea({ chatId }) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const containerRef = useRef(null);

  // AUTO SCROLL
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [messages]);

  // LOAD CHAT HISTORY
  useEffect(() => {
    if (!chatId) return;
    let active = true;
    setMessages([]);

    async function loadHistory() {
      const res = await api.get(`/chat/${chatId}/messages`);
      if (active) setMessages(res.data.messages);
    }

    loadHistory();
    return () => { active = false };
  }, [chatId]);


  // SOCKET HANDLER
  useEffect(() => {
    function handleAI({ chat, content }) {
      if (chat !== chatId) return;

      setMessages(prev =>
        prev
          .filter(msg => msg.role !== "loading") // remove dots
          .concat({ role: "model", content })
      );
    }

    socket.on("ai-response", handleAI);
    return () => socket.off("ai-response", handleAI);
  }, [chatId]);


  // SEND MESSAGE
  function sendMessage() {
    if (!text.trim() || !chatId) return;

    const userMsg = text;
    setText("");

    // Show user bubble immediately
    setMessages(prev => [
      ...prev,
      { role: "user", content: userMsg }
    ]);

    // Show AI loading bubble immediately
    setMessages(prev => [
      ...prev,
      { role: "loading", content: "Thinking..." }
    ]);

    socket.emit("ai-message", {
      chat: chatId,
      content: userMsg
    });
  }


  return (
    <div className="chat-area">

      <div className="messages-window" ref={containerRef}>
        {messages.map((m, i) => (
          <div key={i} className={`msg ${m.role}`}>
            {m.role === "loading" ? (
              <span className="typing-dots">
                <span>.</span><span>.</span><span>.</span>
              </span>
            ) : (
              m.content
            )}
          </div>
        ))}
      </div>

      <div className="input-area">
        <input
          type="text"
          placeholder="Send a message..."
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => e.key === "Enter" && sendMessage()}
        />
        <button onClick={sendMessage}>Send</button>
      </div>
    </div>
  );
}
