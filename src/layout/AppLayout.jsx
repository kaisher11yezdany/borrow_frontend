import { NavLink, Outlet } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../auth/AuthContext";
import { VerificationAPI, RemindersAPI } from "../api/endpoints";
import { canVerify, canUpdateStage, canManageSettings, canViewTeamHierarchy } from "../constants";
import logo from "../assets/logo.png";

function useVerificationBadge(user) {
  const enabled = canVerify(user);
  const { data } = useQuery({
    queryKey: ["verification-badge"],
    queryFn: VerificationAPI.queues,
    enabled,
    refetchInterval: 30000,
  });
  if (!enabled || !data) return "";
  const n = data.pendingCount || 0;
  return n > 0 ? ` (${n})` : "";
}

function useReminderBadge(user) {
  const enabled = canUpdateStage(user);
  const { data } = useQuery({
    queryKey: ["reminder-badge"],
    queryFn: RemindersAPI.board,
    enabled,
    refetchInterval: 30000,
  });
  if (!enabled || !data) return "";
  const n = data.overdue.length + data.dueToday.length;
  return n > 0 ? ` (${n})` : "";
}

export default function AppLayout() {
  const { user, logout } = useAuth();
  const verificationBadge = useVerificationBadge(user);
  const reminderBadge = useReminderBadge(user);

  const tabs = [
    ["dashboard", "Dashboard"],
    ["leads", "Leads"],
    ["tasks", "Tasks"],
    ...(canVerify(user) ? [["verification", `Verification${verificationBadge}`]] : []),
    ["accounting", "Accounting"],
    ...(canUpdateStage(user) ? [["reminders", `Reminders${reminderBadge}`]] : []),
    ["notifications", "Notifications"],
    ...(canViewTeamHierarchy(user) ? [["team", "Team & Hierarchy"]] : []),
    ...(canManageSettings(user) ? [["settings", "Settings"]] : []),
  ];

  return (
    <>
      <div className="topbar">
        <div className="brand">
          <img src={logo} alt="BorrowRight" className="brand-logo" />
        </div>
        <div className="who" style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span>
            Signed in as <b>{user.name}</b> · {user.role}
          </span>
          <button className="btn-sm" onClick={logout}>Log out</button>
        </div>
      </div>
      <div className="tabs">
        {tabs.map(([key, label]) => (
          <NavLink key={key} to={`/${key}`} className={({ isActive }) => `tab${isActive ? " active" : ""}`}>
            {label}
          </NavLink>
        ))}
      </div>
      <main>
        <Outlet />
      </main>
      <footer>Referral Partner CRM — internal system.</footer>
    </>
  );
}
