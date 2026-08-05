import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ForumAPI } from "../api/endpoints";
import { fmtDateTime } from "../constants";

export default function PublicForumPage() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [forum, setForum] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [visitorName, setVisitorName] = useState(localStorage.getItem("forumVisitorName") || "");
  const [hasEntered, setHasEntered] = useState(localStorage.getItem(`forum-${token}`) === "true");

  useEffect(() => {
    loadForum();
  }, [token]);

  async function loadForum() {
    try {
      setLoading(true);
      const data = await ForumAPI.getByToken(token);
      setForum(data);
    } catch (err) {
      setError(err.response?.data?.error || "This forum link is not accessible or has been revoked");
    } finally {
      setLoading(false);
    }
  }

  function handleEnter() {
    if (!visitorName.trim()) {
      setError("Please enter your name to proceed");
      return;
    }
    localStorage.setItem("forumVisitorName", visitorName);
    localStorage.setItem(`forum-${token}`, "true");
    setHasEntered(true);
    setError("");
  }

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
        <p className="subtle">Loading forum...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: 20, maxWidth: 600, margin: "0 auto" }}>
        <h1>Forum Not Available</h1>
        <p style={{ color: "var(--red)", marginBottom: 16 }}>{error}</p>
        <button className="btn-primary" onClick={() => navigate("/")}>
          Go Back
        </button>
      </div>
    );
  }

  if (!hasEntered) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh", padding: 20 }}>
        <div style={{ maxWidth: 400, textAlign: "center" }}>
          <h1>Welcome to {forum?.leadName}'s Forum</h1>
          <p className="subtle" style={{ marginBottom: 20 }}>
            This is a private communication forum. Please enter your name to continue.
          </p>

          {error && (
            <div style={{ color: "var(--red)", marginBottom: 12, padding: "10px", backgroundColor: "var(--red-soft)", borderRadius: "4px" }}>
              {error}
            </div>
          )}

          <div className="field" style={{ marginBottom: 12 }}>
            <label>Your Name</label>
            <input
              type="text"
              value={visitorName}
              onChange={(e) => setVisitorName(e.target.value)}
              placeholder="Enter your full name"
              onKeyDown={(e) => {
                if (e.key === "Enter") handleEnter();
              }}
            />
          </div>

          <button className="btn-primary" onClick={handleEnter} style={{ width: "100%" }}>
            Enter Forum
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: 20, maxWidth: 900, margin: "0 auto" }}>
      <div style={{ marginBottom: 20 }}>
        <h1>{forum?.leadName}'s Communication Forum</h1>
        <p className="subtle">Private communication channel for discussion</p>
      </div>

      {/* Messages Section */}
      <div
        style={{
          height: "500px",
          overflow: "auto",
          backgroundColor: "var(--bg)",
          padding: 16,
          borderRadius: 4,
          marginBottom: 16,
          border: "1px solid var(--border)",
        }}
      >
        {(!forum?.messages || forum.messages.length === 0) ? (
          <p className="subtle">No messages yet. Start the conversation!</p>
        ) : (
          forum.messages.map((msg, idx) => (
            <div key={idx} style={{ marginBottom: 16, paddingBottom: 16, borderBottom: "1px solid var(--border)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: 4 }}>
                <strong style={{ fontSize: 14 }}>
                  {msg.senderName}
                  {msg.senderRole && <span style={{ fontSize: 12, fontWeight: "normal", color: "var(--text-muted)" }}> · {msg.senderRole}</span>}
                </strong>
                <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{fmtDateTime(msg.createdAt)}</span>
              </div>
              <p style={{ margin: "4px 0 0", fontSize: 14, lineHeight: 1.5 }}>{msg.message}</p>
              {msg.attachmentUrl && (
                <a href={msg.attachmentUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, marginTop: 8, display: "block" }}>
                  📎 View Attachment
                </a>
              )}
            </div>
          ))
        )}
      </div>

      {/* Info Footer */}
      <div style={{ backgroundColor: "var(--blue-soft)", padding: 12, borderRadius: 4, fontSize: 12 }}>
        <p style={{ margin: 0 }}>
          You are viewing this forum as: <strong>{visitorName}</strong>
        </p>
        <p style={{ margin: "4px 0 0" }}>This is a read-only view. To send messages, please contact the lead owner.</p>
      </div>
    </div>
  );
}
