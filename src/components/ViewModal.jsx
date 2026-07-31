import Modal from "./Modal";

export function ImageModal({ title, src, onClose }) {
  return (
    <Modal onClose={onClose}>
      <h2>{title}</h2>
      {src ? (
        <img src={src} alt={title} style={{ width: "100%", borderRadius: 6, border: "1px solid var(--border)" }} />
      ) : (
        <p className="subtle">No image attached.</p>
      )}
      <div className="modal-actions">
        <button type="button" onClick={onClose}>Close</button>
      </div>
    </Modal>
  );
}
