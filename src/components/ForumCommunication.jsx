import { useState, useEffect } from "react";
import { ForumAPI } from "../api/endpoints";
import { fmtDateTime } from "../constants";

export default function ForumCommunication({ lead, user }) {
  const [forum, setForum] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [shareEmail, setShareEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showShareForm, setShowShareForm] = useState(false);

  useEffect(() => {
    loadForum();
  }, [lead._id]);

  async function loadForum() {
    try {
      setLoading(true);
      const data = await ForumAPI.get(lead._id);
      setForum(data);
    } catch (err) {
      console.error("Failed to load forum:", err);
      setError("Failed to load forum");
    } finally {
      setLoading(false);
    }
  }

  async function sendMessage() {
    if (!message.trim()) {
      setError("Message cannot be empty");
      return;
    }

    try {
      setError("");
      const updated = await ForumAPI.addMessage(lead._id, { message });
      setForum(updated);
      setMessage("");
      setSuccess("Message sent");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to send message");
    }
  }

  async function handleShare() {
    if (!shareEmail.trim()) {
      setError("Email is required");
      return;
    }

    try {
      setError("");
      const result = await ForumAPI.share(lead._id, [shareEmail]);
      setForum((prev) => ({ ...prev, isShared: true, sharedWith: [...(prev.sharedWith || []), { email: shareEmail }] }));
      setShareEmail("");
      setShowShareForm(false);
      setSuccess(`Forum shared with ${shareEmail}`);
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to share forum");
    }
  }

  async function handleUnshare(email) {
    try {
      setError("");
      const updated = await ForumAPI.unshare(lead._id, email);
      setForum(updated);
      setSuccess(`Access revoked for ${email}`);
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to revoke access");
    }
  }

  async function handleRevokeAll() {
    if (!window.confirm("Revoke access for all external users? This cannot be undone.")) return;

    try {
      setError("");
      const result = await ForumAPI.revokeAll(lead._id);
      setForum((prev) => ({ ...prev, isShared: false, sharedWith: [] }));
      setSuccess("All external access revoked");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to revoke access");
    }
  }

  if (loading) return <p className="subtle">Loading forum...</p>;
  if (!forum) return <p className="subtle">Forum not available</p>;

  const shareLink = `${window.location.origin}/forum/${forum.uniqueToken}`;

  return (
    <div style={{ maxWidth: "900px" }}>
      {error && (
        <div style={{ color: "var(--red)", marginBottom: 12, padding: "10px", backgroundColor: "var(--red-soft)", borderRadius: "4px" }}>
          {error}
        </div>
      )}
      {success && (
        <div style={{ color: "var(--green)", marginBottom: 12, padding: "10px", backgroundColor: "var(--green-soft)", borderRadius: "4px" }}>
          {success}
        </div>
      )}

      {/* Forum Link Section */}
      <div style={{ backgroundColor: "var(--bg)", padding: 16, borderRadius: 4, marginBottom: 16 }}>
        <h3>Private Forum Link</h3>
        <p className="subtle" style={{ marginBottom: 12 }}>
          Share this link with external parties for communication. Link is {forum.isShared ? "currently shared" : "not shared"}.
        </p>

        {/* Share Status */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
          <div>
            <strong>Forum Status</strong>
            <p style={{ margin: "4px 0 0", fontSize: 14 }}>
              <span className={`badge ${forum.isShared ? "green" : "gray"}`}>{forum.isShared ? "Shared" : "Not Shared"}</span>
            </p>
          </div>
          <div>
            <strong>Shared With</strong>
            <p style={{ margin: "4px 0 0", fontSize: 14 }}>
              {forum.sharedWith?.length || 0} {forum.sharedWith?.length === 1 ? "person" : "people"}
            </p>
          </div>
        </div>

        {/* Forum Link */}
        <div style={{ backgroundColor: "white", padding: 12, borderRadius: 4, marginBottom: 12, border: "1px solid var(--border)" }}>
          <p style={{ margin: "0 0 8px", fontSize: 12, fontWeight: 600 }}>Forum Link</p>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input type="text" value={shareLink} readOnly style={{ flex: 1, padding: "8px", borderRadius: 4, border: "1px solid var(--border)" }} />
            <button
              className="btn-sm"
              onClick={() => {
                navigator.clipboard.writeText(shareLink);
                setSuccess("Link copied to clipboard");
                setTimeout(() => setSuccess(""), 3000);
              }}
            >
              Copy
            </button>
          </div>
        </div>

        {/* Share Management */}
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn-sm btn-primary" onClick={() => setShowShareForm(!showShareForm)}>
            {showShareForm ? "Cancel" : "Share with Email"}
          </button>
          {forum.sharedWith?.length > 0 && (
            <button className="btn-sm btn-ghost" style={{ color: "var(--red)" }} onClick={handleRevokeAll}>
              Revoke All Access
            </button>
          )}
        </div>

        {showShareForm && (
          <div style={{ marginTop: 12, padding: 12, backgroundColor: "var(--blue-soft)", borderRadius: 4 }}>
            <div className="field" style={{ marginBottom: 8 }}>
              <label>Email Address</label>
              <input
                type="email"
                value={shareEmail}
                onChange={(e) => setShareEmail(e.target.value)}
                placeholder="user@example.com"
              />
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn-sm btn-primary" onClick={handleShare}>
                Share
              </button>
              <button className="btn-sm" onClick={() => setShowShareForm(false)}>
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Shared With List */}
        {forum.sharedWith?.length > 0 && (
          <div style={{ marginTop: 12 }}>
            <p style={{ fontSize: 12, fontWeight: 600, marginBottom: 8 }}>Shared With</p>
            {forum.sharedWith.map((share) => (
              <div
                key={share.email}
                style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px", borderBottom: "1px solid var(--border)" }}
              >
                <div>
                  <p style={{ margin: 0, fontSize: 14 }}>{share.email}</p>
                  <p style={{ margin: "4px 0 0", fontSize: 11, color: "var(--text-muted)" }}>
                    Shared {new Date(share.accessGrantedAt).toLocaleDateString()}
                  </p>
                </div>
                <button className="btn-sm btn-ghost" style={{ color: "var(--red)" }} onClick={() => handleUnshare(share.email)}>
                  Revoke
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Messages Section */}
      <div>
        <h3>Communication Messages</h3>

        {/* Messages List */}
        <div
          style={{
            height: "400px",
            overflow: "auto",
            backgroundColor: "var(--bg)",
            padding: 12,
            borderRadius: 4,
            marginBottom: 12,
            border: "1px solid var(--border)",
          }}
        >
          {(!forum.messages || forum.messages.length === 0) ? (
            <p className="subtle">No messages yet. Start the conversation!</p>
          ) : (
            forum.messages.map((msg, idx) => (
              <div key={idx} style={{ marginBottom: 12, paddingBottom: 12, borderBottom: "1px solid var(--border)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: 4 }}>
                  <strong style={{ fontSize: 14 }}>
                    {msg.senderName}
                    {msg.senderRole && <span style={{ fontSize: 12, fontWeight: "normal", color: "var(--text-muted)" }}> · {msg.senderRole}</span>}
                  </strong>
                  <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{fmtDateTime(msg.createdAt)}</span>
                </div>
                <p style={{ margin: "4px 0 0", fontSize: 14, lineHeight: 1.4 }}>{msg.message}</p>
                {msg.attachmentUrl && (
                  <a href={msg.attachmentUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, marginTop: 4, display: "block" }}>
                    📎 View Attachment
                  </a>
                )}
              </div>
            ))
          )}
        </div>

        {/* Message Input */}
        <div style={{ backgroundColor: "var(--bg)", padding: 12, borderRadius: 4 }}>
          <div className="field">
            <label>Send Message</label>
            <textarea
              rows="3"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type your message..."
              onKeyDown={(e) => {
                if (e.key === "Enter" && e.ctrlKey) {
                  sendMessage();
                }
              }}
            />
            <p style={{ fontSize: 11, color: "var(--text-muted)", margin: "4px 0 0" }}>Ctrl+Enter to send</p>
          </div>
          <button className="btn-primary" onClick={sendMessage} style={{ marginTop: 8 }}>
            Send Message
          </button>
        </div>
      </div>
    </div>
  );
}
