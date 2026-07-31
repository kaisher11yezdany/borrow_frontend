import { createPortal } from "react-dom";

export default function Modal({ onClose, wide, children }) {
  return createPortal(
    <div
      className="modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className={`modal${wide ? " wide" : ""}`}>{children}</div>
    </div>,
    document.body
  );
}
