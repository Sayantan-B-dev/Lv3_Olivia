import "../styles/modal.css";

export default function ChatActionsModal({
  mode,
  chatTitle,
  value,
  onChange,
  onConfirm,
  onCancel
}) {
  return (
    <div className="modal-overlay">
      <div className="modal-box">

        {mode === "rename" && (
          <>
            <h3>Rename Chat</h3>
            <input
              autoFocus
              placeholder="New chat name"
              value={value}
              onChange={e => onChange(e.target.value)}
            />
          </>
        )}

        {mode === "delete" && (
          <>
            <h3>Delete Chat?</h3>
            <p>Chat "<b>{chatTitle}</b>" and all messages will be removed.</p>
          </>
        )}

        <div className="modal-actions">
          <button className="cancel-btn" onClick={onCancel}>
            Cancel
          </button>
          <button className="confirm-btn" onClick={onConfirm}>
            Confirm
          </button>
        </div>

      </div>
    </div>
  );
}
