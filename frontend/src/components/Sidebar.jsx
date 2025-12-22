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

  // track which chat menu is currently open (detail is the chat._id or null)
  const [menuOpenId, setMenuOpenId] = useState(null);

  // Show/hide chat list with persistent preference
  const [chatListOpen, setChatListOpen] = useState(() => {
    try {
      const v = localStorage.getItem('chatListOpen');
      return v === null ? true : v === '1';
    } catch (e) {
      return true;
    }
  });

  // Persist preference when it changes
  useEffect(() => {
    try { localStorage.setItem('chatListOpen', chatListOpen ? '1' : '0'); } catch (e) {}
  }, [chatListOpen]);

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
    function handleKey(e) {
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

  // Track chat-menu-open events so the sidebar can expand/allow overflow when a popup menu opens
  useEffect(() => {
    function handleMenuOpen(e) {
      setMenuOpenId(e?.detail || null);
    }

    function handleWindowClick(e) {
      // If click is outside sidebar, clear menu open state so sidebar can collapse
      if (sidebarRef.current && !sidebarRef.current.contains(e.target)) {
        setMenuOpenId(null);
      }
    }

    window.addEventListener('chat-menu-open', handleMenuOpen);
    window.addEventListener('click', handleWindowClick);

    return () => {
      window.removeEventListener('chat-menu-open', handleMenuOpen);
      window.removeEventListener('click', handleWindowClick);
    };
  }, []);

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
        className={`sidebar ${mobileOpen ? 'is-open' : ''} ${menuOpenId ? 'has-open-menu' : ''}`}
        style={isMobile ? {} : { width: `${width}px` }}
      >
        <div className="sidebar-body">
          <div className="nav-top">
            <div className="sidebar-title">Olivia</div>
            <button className="nav-logout" onClick={logout} aria-label="Logout">Logout</button>
          </div>
          <hr />
          <br />
          <span className="username">
            {cap(user?.fullName?.firstName)} {cap(user?.fullName?.lastName)}
            <p className="email">{user?.email}</p>
          </span>

          <button className="new-chat-button" onClick={createChat}>
            ＋New Chat
          </button>

          {/* Chat list header with count and collapse toggle */}
          <div className="chat-list-header">
            <div className="chat-list-title">All Chats <span className="chat-count">({chats.length})</span></div>
            <button
              className="chat-list-toggle"
              onClick={() => setChatListOpen(s => { const v = !s; try { localStorage.setItem('chatListOpen', v ? '1' : '0'); } catch(e) {} return v; })}
              aria-expanded={chatListOpen}
              aria-label={chatListOpen ? 'Collapse chat list' : 'Expand chat list'}
            >
              {chatListOpen ? '▾' : '▸'}
            </button>
          </div>

          <div className={`chat-list ${chatListOpen ? '' : 'collapsed'}`}>
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
          Logout
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
    </div >

      {/* RESIZE HANDLE */ }
      < div
  className = "sidebar-resizer"
  onMouseDown = { startResize }
    />
    </>
  );
}
