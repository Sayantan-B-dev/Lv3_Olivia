import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axiosClient";
import ChatItem from "./ChatItem";
import ChatActionsModal from "./ChatActionsModal";
import "../styles/sidebar.css";

export default function Sidebar({ onChatSelect, activeChat }) {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user"));

  const [width, setWidth] = useState(260);
  const sidebarRef = useRef(null);

  // Mobile toggle state: controls collapsed/expanded sidebar on small screens
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' ? window.innerWidth <= 800 : false);

  const [chats, setChats] = useState([]);
  const [modalMode, setModalMode] = useState(null);
  const [targetChatId, setTargetChatId] = useState(null);
  const [targetChatTitle, setTargetChatTitle] = useState("");
  const [tempName, setTempName] = useState("");

  const cap = str =>
    str ? str.charAt(0).toUpperCase() + str.slice(1).toLowerCase() : "";

  function logout() {
    localStorage.removeItem("user");
    navigate("/login");
    if (isMobile) setMobileOpen(false);
  }

  async function loadChats() {
    const res = await api.get("/chat");
    setChats(res.data.chats);
  }

  async function createChat() {
    const res = await api.post("/chat", { title: "New Chat" });
    await loadChats();
    // close the sidebar first on mobile so the UI updates before selection/navigation
    if (isMobile) setMobileOpen(false);
    onChatSelect(res.data.chat._id);
  }

  /** SIDEBAR RESIZE HANDLER **/
  function startResize(e) {
    const startX = e.clientX;
    const startWidth = width;

    function resize(e) {
      const newWidth = Math.max(200, Math.min(450, startWidth + (e.clientX - startX)));
      setWidth(newWidth);
    }

    function stop() {
      window.removeEventListener("mousemove", resize);
      window.removeEventListener("mouseup", stop);
    }

    window.addEventListener("mousemove", resize);
    window.addEventListener("mouseup", stop);
  }

  // Close/open behavior and mobile detection
  useEffect(() => {
    function onResize() {
      const mobile = window.innerWidth <= 800;
      setIsMobile(mobile);
      if (!mobile) setMobileOpen(false);
    }

    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Close sidebar when clicking outside on mobile
  useEffect(() => {
    function handleOutside(e) {
      if (!mobileOpen) return;
      if (sidebarRef.current && !sidebarRef.current.contains(e.target)) {
        setMobileOpen(false);
      }
    }
    function handleKey(e){
      if (!mobileOpen) return;
      if (e.key === 'Escape') setMobileOpen(false);
    }

    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("touchstart", handleOutside);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("touchstart", handleOutside);
      document.removeEventListener('keydown', handleKey);
    };
  }, [mobileOpen]);

  // Helper to close sidebar when a chat is selected on mobile
  function handleSelect(id) {
    // close the sidebar first on mobile to ensure the panel collapses before switching chat
    if (isMobile) setMobileOpen(false);
    // give the close a tick to ensure CSS transition starts, then select
    setTimeout(() => onChatSelect(id), 40);
  }

  /** CHAT ACTIONS **/
  function requestRename(id, title) {
    setModalMode("rename");
    setTargetChatId(id);
    setTempName(title);
  }

  async function confirmRename() {
    await api.put(`/chat/${targetChatId}/rename`, { title: tempName.trim() });
    closeModal();
    loadChats();
  }

  function requestDelete(id, title) {
    setModalMode("delete");
    setTargetChatId(id);
    setTargetChatTitle(title);
  }

  async function confirmDelete() {
    await api.delete(`/chat/${targetChatId}`);
    closeModal();
    loadChats();
    onChatSelect(null);
  }

  function closeModal() {
    setModalMode(null);
    setTargetChatId(null);
    setTempName("");
    setTargetChatTitle("");
  }

  useEffect(() => {
    loadChats();
  }, []);

  return (
    <>
      {/* SIDEBAR MAIN */}
      <div
        ref={sidebarRef}
        className={`sidebar ${mobileOpen ? 'is-open' : ''}`}
        style={isMobile ? {} : { width: `${width}px` }}
      >
        <h2 className="sidebar-title">Oliver</h2> 
        <hr />
        <br />
        <div style={{ flexGrow: 1, display: "flex", flexDirection: "column" }}>
          <span className="username">
            {cap(user?.fullName?.firstName)} {cap(user?.fullName?.lastName)}
            <p className="email">{user?.email}</p>
          </span>

            <button className="new-chat-button" onClick={createChat}>
              ＋New Chat
            </button>

            {/* Mobile toggle placed under New Chat - full-width on small screens (render only on mobile) */}
            {isMobile && (
              <button type="button" className="sidebar-toggle" aria-expanded={mobileOpen} onClick={() => setMobileOpen(s => !s)}>
                {mobileOpen ? '✕ Close' : '▾ Chats'}
              </button>
            )}

          <div className="chat-list">
            {chats.map(chat => (
              <ChatItem
                key={chat._id}
                chat={chat}
                active={activeChat === chat._id}
                onSelect={handleSelect}
                onRename={requestRename}
                onDelete={requestDelete}
              />
            ))}


          </div> 

        </div>

        <div className="logout" onClick={logout}>
          🚪 Logout
        </div>

        {modalMode && (
          <ChatActionsModal
            mode={modalMode}
            chatTitle={targetChatTitle}
            value={tempName}
            onChange={setTempName}
            onConfirm={modalMode === "rename" ? confirmRename : confirmDelete}
            onCancel={closeModal}
          />
        )}
      </div>

      {/* RESIZE HANDLE */}
      <div
        className="sidebar-resizer"
        onMouseDown={startResize}
      />
    </>
  );
}
