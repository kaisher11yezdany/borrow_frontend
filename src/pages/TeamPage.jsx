import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../auth/AuthContext";
import { TeamAPI } from "../api/endpoints";
import { ROLES, canManageTeam } from "../constants";

function buildReportsToOptions(users, excludeId) {
  if (!excludeId) return users.slice().sort((a, b) => ROLES.indexOf(a.role) - ROLES.indexOf(b.role) || a.name.localeCompare(b.name));
  const excludeSet = new Set([excludeId]);
  let changed = true;
  while (changed) {
    changed = false;
    users.forEach((u) => {
      if (u.reportsTo && excludeSet.has(u.reportsTo) && !excludeSet.has(u._id)) {
        excludeSet.add(u._id);
        changed = true;
      }
    });
  }
  return users.filter((u) => !excludeSet.has(u._id)).sort((a, b) => ROLES.indexOf(a.role) - ROLES.indexOf(b.role) || a.name.localeCompare(b.name));
}

function canDragUser(draggedUser, targetUser, users) {
  if (draggedUser._id === targetUser._id) return false;
  const descendants = new Set();
  function collectDescendants(userId) {
    users.forEach((u) => {
      if (u.reportsTo === userId && !descendants.has(u._id)) {
        descendants.add(u._id);
        collectDescendants(u._id);
      }
    });
  }
  collectDescendants(draggedUser._id);
  return !descendants.has(targetUser._id);
}

function EditUserForm({ user, users, onSave, onCancel }) {
  const [name, setName] = useState(user.name);
  const [phone, setPhone] = useState(user.phone || "");
  const [email, setEmail] = useState(user.email || "");
  const [role, setRole] = useState(user.role);
  const [reportsTo, setReportsTo] = useState(user.reportsTo || "");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const options = buildReportsToOptions(users, user._id);

  async function submit(e) {
    e.preventDefault();
    setError("");
    try {
      const body = { name, phone, email, role, reportsTo };
      if (password) body.password = password;
      await onSave(body);
    } catch (err) {
      setError(err.response?.data?.error || "Could not save");
    }
  }

  return (
    <div className="tree-node" style={{ alignItems: "flex-start" }}>
      <form onSubmit={submit} style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", width: "100%" }}>
        <input value={name} onChange={(e) => setName(e.target.value)} style={{ width: 130 }} />
        <input value={phone} onChange={(e) => setPhone(e.target.value)} style={{ width: 110 }} />
        <input value={email} onChange={(e) => setEmail(e.target.value)} style={{ width: 170 }} />
        <select value={role} onChange={(e) => setRole(e.target.value)} style={{ width: 130 }}>
          {ROLES.filter((r) => r !== "Admin").map((r) => <option key={r}>{r}</option>)}
        </select>
        <select value={reportsTo} onChange={(e) => setReportsTo(e.target.value)} style={{ width: 180 }}>
          {options.map((u) => <option key={u._id} value={u._id}>{u.name} ({u.role})</option>)}
        </select>
        <input type="password" placeholder="New password (optional)" value={password} onChange={(e) => setPassword(e.target.value)} style={{ width: 170 }} />
        <button type="submit" className="btn-sm btn-primary">Save</button>
        <button type="button" className="btn-sm" onClick={onCancel}>Cancel</button>
        {error && <span className="error-text" style={{ margin: 0 }}>{error}</span>}
      </form>
    </div>
  );
}

function TreeNode({ user, users, depth, canEdit, editingId, setEditingId, onSave, onDelete, draggedUser, setDraggedUser, onDropUser }) {
  const children = users.filter((u) => u.reportsTo === user._id);
  const indent = "   ".repeat(depth) + (depth > 0 ? "└─ " : "");
  const isDragSource = draggedUser?._id === user._id;
  const canDropHere = canEdit && draggedUser && draggedUser._id !== user._id && canDragUser(draggedUser, user, users);
  const [isDropTarget, setIsDropTarget] = useState(false);

  function handleDragStart(e) {
    if (!canEdit || user.role === "Admin") {
      e.preventDefault();
      return;
    }
    setDraggedUser(user);
    e.dataTransfer.effectAllowed = "move";
  }

  function handleDragOver(e) {
    if (!canDropHere) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setIsDropTarget(true);
  }

  function handleDragLeave() {
    setIsDropTarget(false);
  }

  function handleDrop(e) {
    e.preventDefault();
    setIsDropTarget(false);
    if (canDropHere) {
      onDropUser(draggedUser, user);
    }
  }

  if (editingId === user._id) {
    return (
      <>
        <EditUserForm
          user={user}
          users={users}
          onSave={async (body) => {
            await onSave(user._id, body);
          }}
          onCancel={() => setEditingId(null)}
        />
        {children.map((c) => (
          <TreeNode
            key={c._id}
            user={c}
            users={users}
            depth={depth + 1}
            canEdit={canEdit}
            editingId={editingId}
            setEditingId={setEditingId}
            onSave={onSave}
            onDelete={onDelete}
            draggedUser={draggedUser}
            setDraggedUser={setDraggedUser}
            onDropUser={onDropUser}
          />
        ))}
      </>
    );
  }

  const showEdit = canEdit && user.role !== "Admin";
  return (
    <>
      <div
        className="tree-node"
        draggable={canEdit && user.role !== "Admin"}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        style={{
          opacity: isDragSource ? 0.5 : 1,
          backgroundColor: isDropTarget ? "var(--blue-soft)" : isDragSource ? "var(--gray-soft)" : "transparent",
          cursor: canEdit && user.role !== "Admin" ? "grab" : "default",
          transition: "all 0.2s ease",
          borderRadius: "4px"
        }}
      >
        <span>
          <span className="indent">{indent}</span>
          {user.name}
          {user.phone ? <span className="subtle" style={{ fontSize: 11 }}> · {user.phone}</span> : null}
        </span>
        <span>
          <span className="badge gray">{user.role}</span>{" "}
          {showEdit && (
            <>
              <button className="btn-ghost btn-sm" onClick={() => setEditingId(user._id)}>Edit</button>{" "}
              <button className="btn-ghost btn-sm" style={{ color: "var(--red)" }} onClick={() => onDelete(user)}>Delete</button>
            </>
          )}
        </span>
      </div>
      {children.map((c) => (
        <TreeNode
          key={c._id}
          user={c}
          users={users}
          depth={depth + 1}
          canEdit={canEdit}
          editingId={editingId}
          setEditingId={setEditingId}
          onSave={onSave}
          onDelete={onDelete}
          draggedUser={draggedUser}
          setDraggedUser={setDraggedUser}
          onDropUser={onDropUser}
        />
      ))}
    </>
  );
}

export default function TeamPage() {
  const { user: cu } = useAuth();
  const qc = useQueryClient();
  const [editingId, setEditingId] = useState(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState(ROLES[1]);
  const [reportsTo, setReportsTo] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [draggedUser, setDraggedUser] = useState(null);

  const { data, isLoading } = useQuery({ queryKey: ["team"], queryFn: TeamAPI.get });
  const users = data?.users || [];
  const chain = data?.chain || [];

  function invalidate() {
    qc.invalidateQueries({ queryKey: ["team"] });
    qc.invalidateQueries({ queryKey: ["team-all"] });
    qc.invalidateQueries({ queryKey: ["leads"] });
  }

  async function saveUser(id, body) {
    await TeamAPI.updateUser(id, body);
    setEditingId(null);
    invalidate();
  }

  async function deleteUser(user) {
    if (!window.confirm(`Delete ${user.name}? Their direct reports and owned leads will be reassigned to Admin — you'll need to re-map them yourself. This can't be undone.`)) return;
    await TeamAPI.removeUser(user._id);
    invalidate();
  }

  async function submitAdd(e) {
    e.preventDefault();
    setError("");
    if (!reportsTo) {
      setError("Pick who this person reports to.");
      return;
    }
    try {
      await TeamAPI.addUser({ name, phone, email, role, reportsTo, password });
      setName(""); setPhone(""); setEmail(""); setPassword(""); setReportsTo("");
      invalidate();
    } catch (err) {
      setError(err.response?.data?.error || "Could not add person");
    }
  }

  async function handleDropUser(draggedUser, targetUser) {
    try {
      await TeamAPI.updateUser(draggedUser._id, { reportsTo: targetUser._id });
      setDraggedUser(null);
      invalidate();
    } catch (err) {
      alert(err.response?.data?.error || "Could not update reporting hierarchy");
      setDraggedUser(null);
    }
  }

  if (isLoading) return <p className="subtle">Loading…</p>;

  const roots = cu.role === "Admin" ? users.filter((u) => !u.reportsTo) : users.filter((u) => u._id === cu.id);
  const reportsToOptions = buildReportsToOptions(users, null);

  return (
    <>
      <h1>Team & hierarchy</h1>
      <p className="subtle">You only see your own position and everyone under you.</p>
      <div className="help-note">Your reporting line: {chain.map((u) => `${u.name} (${u.role})`).join(" → ")}</div>
      {canManageTeam(cu) && <div className="help-note" style={{ backgroundColor: "var(--blue-soft)" }}>💡 Drag and drop team members to change reporting hierarchy</div>}
      <div className="row">
        <div className="col card">
          <h2>{cu.role === "Admin" ? "Full org structure" : "Your team"}</h2>
          {roots.map((r) => (
            <TreeNode
              key={r._id}
              user={r}
              users={users}
              depth={0}
              canEdit={canManageTeam(cu)}
              editingId={editingId}
              setEditingId={setEditingId}
              onSave={saveUser}
              onDelete={deleteUser}
              draggedUser={draggedUser}
              setDraggedUser={setDraggedUser}
              onDropUser={handleDropUser}
            />
          ))}
        </div>
        <div className="col card">
          <h2>Add a person</h2>
          {canManageTeam(cu) ? (
            <form onSubmit={submitAdd}>
              <div className="field"><label>Name</label><input value={name} onChange={(e) => setName(e.target.value)} required /></div>
              <div className="field"><label>Phone</label><input value={phone} onChange={(e) => setPhone(e.target.value)} pattern="[0-9]{10}" title="10 digit phone number" /></div>
              <div className="field"><label>Email</label><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
              <div className="field"><label>Password</label><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required /></div>
              <div className="field">
                <label>Role</label>
                <select value={role} onChange={(e) => setRole(e.target.value)} required>
                  {ROLES.filter((r) => r !== "Admin").map((r) => <option key={r}>{r}</option>)}
                </select>
              </div>
              <div className="field">
                <label>Reports to</label>
                <p className="subtle" style={{ margin: "0 0 8px", fontSize: 11 }}>Admin can map anyone to anyone — this doesn't have to match their role's usual level.</p>
                <select value={reportsTo} onChange={(e) => setReportsTo(e.target.value)} required>
                  <option value="">Select...</option>
                  {reportsToOptions.map((u) => <option key={u._id} value={u._id}>{u.name} ({u.role})</option>)}
                </select>
              </div>
              {error && <p className="error-text">{error}</p>}
              <button type="submit" className="btn-primary">Add person</button>
            </form>
          ) : (
            <p className="subtle">Only Admin can add or re-map people in the hierarchy.</p>
          )}
        </div>
      </div>
    </>
  );
}
