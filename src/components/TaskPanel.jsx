import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { TaskAPI } from "../api/endpoints";
import { fmtDate, fmtDateTime } from "../constants";

const STATUS_OPTIONS = [
  { value: "Not Started", label: "Not Started", color: "gray" },
  { value: "Pending", label: "Pending", color: "amber" },
  { value: "Progress", label: "Progress", color: "blue" },
  { value: "Completed", label: "Completed", color: "green" },
];

const PRIORITY_OPTIONS = [
  { value: "Low", label: "Low" },
  { value: "Medium", label: "Medium" },
  { value: "High", label: "High" },
];

export default function TaskPanel({ lead }) {
  const qc = useQueryClient();
  const [isCreating, setIsCreating] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [newTask, setNewTask] = useState({ title: "", description: "", status: "Not Started", priority: "Medium", dueDate: "" });
  const [commentText, setCommentText] = useState({});
  const [error, setError] = useState("");

  const { data: tasks = [] } = useQuery({
    queryKey: ["tasks", lead._id],
    queryFn: () => TaskAPI.listForLead(lead._id),
  });

  async function handleCreateTask(e) {
    e.preventDefault();
    if (!newTask.title.trim()) {
      setError("Task title is required");
      return;
    }
    try {
      setError("");
      await TaskAPI.create(lead._id, newTask);
      qc.invalidateQueries({ queryKey: ["tasks"] });
      setNewTask({ title: "", description: "", status: "Not Started", priority: "Medium", dueDate: "" });
      setIsCreating(false);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to create task");
    }
  }

  async function handleUpdateTask(taskId, updates) {
    try {
      setError("");
      await TaskAPI.update(taskId, updates);
      qc.invalidateQueries({ queryKey: ["tasks"] });
      setEditingTaskId(null);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to update task");
    }
  }

  async function handleDeleteTask(taskId) {
    if (!window.confirm("Delete this task?")) return;
    try {
      setError("");
      await TaskAPI.delete(taskId);
      qc.invalidateQueries({ queryKey: ["tasks"] });
    } catch (err) {
      setError(err.response?.data?.error || "Failed to delete task");
    }
  }

  async function handleAddComment(taskId) {
    if (!commentText[taskId]?.trim()) return;
    try {
      setError("");
      await TaskAPI.addComment(taskId, commentText[taskId]);
      qc.invalidateQueries({ queryKey: ["tasks"] });
      setCommentText({ ...commentText, [taskId]: "" });
    } catch (err) {
      setError(err.response?.data?.error || "Failed to add comment");
    }
  }

  async function handleDeleteComment(taskId, commentId) {
    if (!window.confirm("Delete this comment?")) return;
    try {
      setError("");
      await TaskAPI.deleteComment(taskId, commentId);
      qc.invalidateQueries({ queryKey: ["tasks"] });
    } catch (err) {
      setError(err.response?.data?.error || "Failed to delete comment");
    }
  }

  return (
    <div style={{ marginTop: 20 }}>
      <h3>Tasks</h3>
      {error && (
        <div style={{ color: "var(--red)", marginBottom: 12, padding: "10px", backgroundColor: "var(--red-soft)", borderRadius: "4px" }}>
          {error}
        </div>
      )}

      {/* Create Task Form */}
      {isCreating ? (
        <form onSubmit={handleCreateTask} style={{ marginBottom: 20, padding: 12, backgroundColor: "var(--bg)", borderRadius: 4, border: "1px solid var(--border)" }}>
          <div className="field">
            <label>Task Title *</label>
            <input
              value={newTask.title}
              onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
              placeholder="Enter task title"
              required
            />
          </div>
          <div className="field">
            <label>Description</label>
            <textarea
              value={newTask.description}
              onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
              placeholder="Enter task description"
              rows={2}
            />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div className="field">
              <label>Status</label>
              <select value={newTask.status} onChange={(e) => setNewTask({ ...newTask, status: e.target.value })}>
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Priority</label>
              <select value={newTask.priority} onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })}>
                {PRIORITY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Due Date</label>
              <input
                type="date"
                value={newTask.dueDate}
                onChange={(e) => setNewTask({ ...newTask, dueDate: e.target.value })}
              />
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <button type="button" className="btn-sm" onClick={() => setIsCreating(false)}>
              Cancel
            </button>
            <button type="submit" className="btn-sm btn-primary">
              Create Task
            </button>
          </div>
        </form>
      ) : (
        <button className="btn-sm" onClick={() => setIsCreating(true)} style={{ marginBottom: 16 }}>
          + Add Task
        </button>
      )}

      {/* Tasks List */}
      <div style={{ display: "grid", gap: 12 }}>
        {tasks.length === 0 ? (
          <p className="subtle">No tasks yet</p>
        ) : (
          tasks.map((task) => {
            const statusOption = STATUS_OPTIONS.find((s) => s.value === task.status);
            return (
              <div key={task._id} style={{ padding: 12, border: "1px solid var(--border)", borderRadius: 4, backgroundColor: "var(--bg)" }}>
                {editingTaskId === task._id ? (
                  <div style={{ display: "grid", gap: 12 }}>
                    <input
                      type="text"
                      value={task.title}
                      onChange={(e) => setEditingTaskId(task._id)}
                      disabled
                      style={{ fontWeight: "600" }}
                    />
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                      <select value={task.status} onChange={(e) => handleUpdateTask(task._id, { status: e.target.value })}>
                        {STATUS_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                      <select value={task.priority} onChange={(e) => handleUpdateTask(task._id, { priority: e.target.value })}>
                        {PRIORITY_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <button className="btn-sm" onClick={() => setEditingTaskId(null)}>
                      Done Editing
                    </button>
                  </div>
                ) : (
                  <>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: 8 }}>
                      <div>
                        <strong style={{ fontSize: 14 }}>{task.title}</strong>
                        {task.description && <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--text-muted)" }}>{task.description}</p>}
                      </div>
                      <button className="btn-sm btn-ghost" style={{ color: "var(--red)" }} onClick={() => handleDeleteTask(task._id)}>
                        Delete
                      </button>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "auto auto auto auto", gap: 12, marginBottom: 12, fontSize: 12 }}>
                      <div>
                        <select
                          value={task.status}
                          onChange={(e) => handleUpdateTask(task._id, { status: e.target.value })}
                          style={{ padding: "4px 8px", borderRadius: "4px", border: "1px solid var(--border)", backgroundColor: "transparent", cursor: "pointer" }}
                        >
                          {STATUS_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <select
                          value={task.priority}
                          onChange={(e) => handleUpdateTask(task._id, { priority: e.target.value })}
                          style={{ padding: "4px 8px", borderRadius: "4px", border: "1px solid var(--border)", backgroundColor: "transparent", cursor: "pointer" }}
                        >
                          {PRIORITY_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      {task.dueDate && (
                        <div className="subtle">
                          Due: {fmtDate(task.dueDate)}
                        </div>
                      )}
                      {task.createdBy && (
                        <div className="subtle">
                          Created by: {task.createdBy.name}
                        </div>
                      )}
                    </div>

                    <div className="subtle" style={{ fontSize: 11, marginBottom: 12 }}>
                      Created: {fmtDateTime(task.createdAt)}
                    </div>

                    {/* Comments Section */}
                    <div style={{ borderTop: "1px solid var(--border)", paddingTop: 12 }}>
                      <p style={{ margin: "0 0 8px", fontSize: 12, fontWeight: 600 }}>Comments ({task.comments.length})</p>

                      {/* Existing Comments */}
                      {task.comments.length > 0 && (
                        <div style={{ marginBottom: 12, maxHeight: 200, overflowY: "auto" }}>
                          {task.comments.map((comment) => (
                            <div key={comment._id} style={{ padding: 8, marginBottom: 8, backgroundColor: "rgba(0,0,0,0.02)", borderRadius: 4, fontSize: 12 }}>
                              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                                <strong>{comment.by.name}</strong>
                                <button
                                  className="btn-sm btn-ghost"
                                  style={{ color: "var(--red)", fontSize: 11, padding: "0 4px" }}
                                  onClick={() => handleDeleteComment(task._id, comment._id)}
                                >
                                  Delete
                                </button>
                              </div>
                              <p style={{ margin: 0, lineHeight: 1.4 }}>{comment.text}</p>
                              <div className="subtle" style={{ fontSize: 11, marginTop: 4 }}>
                                {fmtDateTime(comment.at)}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Add Comment */}
                      <div style={{ display: "flex", gap: 8 }}>
                        <input
                          type="text"
                          value={commentText[task._id] || ""}
                          onChange={(e) => setCommentText({ ...commentText, [task._id]: e.target.value })}
                          placeholder="Add a comment..."
                          style={{ flex: 1, fontSize: 12 }}
                        />
                        <button
                          className="btn-sm btn-primary"
                          onClick={() => handleAddComment(task._id)}
                          disabled={!commentText[task._id]?.trim()}
                        >
                          Add
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
