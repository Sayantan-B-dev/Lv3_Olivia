import { useState, useRef, useEffect } from "react";

export default function ChatItem({
  chat,
  active,
  onSelect,
  onRename,
  onDelete
}) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);
  const btnRef = useRef(null);
  const [menuStyle, setMenuStyle] = useState(null);

  function toggleMenu(e) {
    e.stopPropagation();
    const willOpen = !open;
    // when about to open, notify other items to close
    if (willOpen) {
      window.dispatchEvent(new CustomEvent('chat-menu-open', { detail: chat._id }));

      // compute positioning to place the popup near the clicked control on mobile only
      try {
        if (window.innerWidth <= 800) {
          const rect = btnRef.current.getBoundingClientRect();
          const vw = window.innerWidth;
          const rectWidth = rect.width || 140;
          const desiredWidth = Math.min(Math.max(rectWidth, 140), vw * 0.92);
          const left = rect.left + rect.width / 2;
          const availableBelow = window.innerHeight - rect.bottom;
          let top = rect.bottom + 8;
          // if not enough space below, place above the button
          if (availableBelow < 140) {
            top = Math.max(12, rect.top - 120);
          }

          setMenuStyle({
            position: 'fixed',
            left: left,
            top: top,
            width: desiredWidth,
            transform: 'translateX(-50%)'
          });
        } else {
          setMenuStyle(null);
        }
      } catch (err) {
        setMenuStyle(null);
      }
    } else {
      setMenuStyle(null);
    }

    setOpen(prev => !prev);
  }

  // close menu when clicked outside, and when other menus open
  useEffect(() => {
    function close(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpen(false);
        setMenuStyle(null);
      }
    }
    function handleMenuOpen(e) {
      if (e && e.detail && e.detail !== chat._id) {
        setOpen(false);
        setMenuStyle(null);
      }
    }

    window.addEventListener("click", close);
    window.addEventListener("chat-menu-open", handleMenuOpen);
    return () => {
      window.removeEventListener("click", close);
      window.removeEventListener("chat-menu-open", handleMenuOpen);
    };
  }, [chat._id]);

  return (
<div className={`chat-item ${active ? "active" : ""}`}>

  <div className="chat-left" onClick={() => onSelect(chat._id)}>
    <p className="chat-title">{chat.title}</p>
  </div>

  <div className="chat-right menu-wrapper" ref={menuRef}>
    <div className="menu-btn" onClick={toggleMenu} ref={btnRef}>⋮</div>

    {open && (
      <div className="menu-dropdown" style={menuStyle ? menuStyle : undefined}>
        <div onClick={() => { setOpen(false); setMenuStyle(null); onRename(chat._id, chat.title); }}>✏️ Rename</div>
        <div onClick={() => { setOpen(false); setMenuStyle(null); onDelete(chat._id, chat.title); }}>🗑️ Delete</div>
      </div>
    )}
  </div>

</div>

  );
}
