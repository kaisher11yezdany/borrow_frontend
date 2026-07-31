import Modal from "./Modal";
import AttachmentsPanel from "./AttachmentsPanel";

export default function AttachmentsModal({ lead, onClose }) {
  return (
    <Modal wide onClose={onClose}>
      <h2>Attachments — {lead.customerName}</h2>
      <p className="subtle">Any file type — KYC scans, agreements, salary slips, photos. Images show a preview; other files download on click.</p>
      <AttachmentsPanel lead={lead} showLabel={false} />
      <div className="modal-actions">
        <button type="button" onClick={onClose}>Close</button>
      </div>
    </Modal>
  );
}
