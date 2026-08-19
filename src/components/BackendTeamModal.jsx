import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Modal from "./Modal";
import { LeadsAPI, TeamAPI } from "../api/endpoints";
import { fmtDateTime } from "../constants";

export default function BackendTeamModal({ lead, onClose }) {
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [assigning, setAssigning] = useState(false);
  const qc = useQueryClient();

  const { data: backendTeam = [] } = useQuery({
    queryKey: ["backend-team-members"],
    queryFn: TeamAPI.getBackendTeamMembers,
  });

  // Get users not yet assigned
  const assignedUserIds = lead.backendTeamAssignments?.map((a) => a.userId._id) || [];
  const availableUsers = backendTeam.filter((u) => !assignedUserIds.includes(u._id));

  async function handleAssign() {
    if (selectedUsers.length === 0) return;

    setAssigning(true);
    try {
      let updatedLead = lead;
      for (const userId of selectedUsers) {
        updatedLead = await LeadsAPI.assignBackendTeam(lead._id, userId);
      }
      qc.invalidateQueries({ queryKey: ["leads"] });
      qc.invalidateQueries({ queryKey: ["lead", lead._id] });
      setSelectedUsers([]);
      onClose();
    } catch (err) {
      alert(err.response?.data?.error || "Failed to assign backend team");
    } finally {
      setAssigning(false);
    }
  }

  async function handleUnassign(userId) {
    if (!confirm("Remove this backend team member?")) return;

    try {
      await LeadsAPI.unassignBackendTeam(lead._id, userId);
      qc.invalidateQueries({ queryKey: ["leads"] });
      qc.invalidateQueries({ queryKey: ["lead", lead._id] });
    } catch (err) {
      alert(err.response?.data?.error || "Failed to unassign backend team");
    }
  }

  return (
    <Modal onClose={onClose}>
      <h2 style={{ marginBottom: 16 }}>Assign Backend Team</h2>
      <p className="subtle" style={{ marginBottom: 16 }}>
        {lead.customerName} · {lead.product}
      </p>

      {/* Currently Assigned */}
      <div style={{ marginBottom: 20 }}>
        <h3 style={{ marginBottom: 12 }}>Currently Assigned</h3>
        {lead.backendTeamAssignments && lead.backendTeamAssignments.length > 0 ? (
          <div style={{ display: "grid", gap: 8 }}>
            {lead.backendTeamAssignments.map((assignment) => (
              <div
                key={assignment._id}
                style={{
                  padding: 12,
                  border: "1px solid var(--border)",
                  borderRadius: 4,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, color: "var(--ink)" }}>
                    {assignment.userId?.name || "User (loading...)"}
                  </div>
                  <div className="subtle" style={{ fontSize: 12, margin: "4px 0 0" }}>
                    {assignment.userId?.email || "—"}
                  </div>
                  <div className="subtle" style={{ fontSize: 11, margin: "4px 0 0" }}>
                    Assigned by {assignment.assignedBy?.name || "Admin"} on{" "}
                    {fmtDateTime(assignment.assignedAt)}
                  </div>
                </div>
                <button
                  className="btn-sm btn-ghost"
                  onClick={() => handleUnassign(assignment.userId._id)}
                  style={{ color: "var(--red)" }}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="subtle" style={{ fontSize: 12 }}>No backend team assigned yet</p>
        )}
      </div>

      {/* Add More */}
      <div>
        <h3 style={{ marginBottom: 12 }}>Add More Team Members</h3>
        {availableUsers.length > 0 ? (
          <>
            <div style={{ marginBottom: 12 }}>
              {availableUsers.map((user) => (
                <label
                  key={user._id}
                  style={{
                    display: "block",
                    padding: 8,
                    border: "1px solid var(--border)",
                    borderRadius: 4,
                    marginBottom: 8,
                    cursor: "pointer",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={selectedUsers.includes(user._id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedUsers([...selectedUsers, user._id]);
                      } else {
                        setSelectedUsers(selectedUsers.filter((id) => id !== user._id));
                      }
                    }}
                    style={{ marginRight: 8 }}
                  />
                  <span style={{ fontWeight: 500 }}>{user.name}</span>
                  <div className="subtle" style={{ fontSize: 12, margin: "2px 0 0" }}>
                    {user.email}
                  </div>
                </label>
              ))}
            </div>

            <div style={{ display: "flex", gap: 8 }}>
              <button
                className="btn-primary"
                onClick={handleAssign}
                disabled={selectedUsers.length === 0 || assigning}
              >
                {assigning ? "Assigning..." : "Assign Selected"}
              </button>
              <button className="btn-ghost" onClick={onClose}>
                Cancel
              </button>
            </div>
          </>
        ) : (
          <p className="subtle" style={{ fontSize: 12 }}>
            All backend team members already assigned
          </p>
        )}
      </div>
    </Modal>
  );
}
