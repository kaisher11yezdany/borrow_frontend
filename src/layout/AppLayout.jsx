import { NavLink, Outlet } from "react-router-dom";
import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../auth/AuthContext";
import { VerificationAPI, RemindersAPI } from "../api/endpoints";
import { canVerify, canUpdateStage, canManageAccounting, canManageSettings, canViewTeamHierarchy } from "../constants";
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

function useReminderNotifications(user) {
  const enabled = canUpdateStage(user);
  const notifiedRef = useRef(new Set());
  const { data } = useQuery({
    queryKey: ["reminders-notifications"],
    queryFn: RemindersAPI.board,
    enabled,
    refetchInterval: 10000,
  });

  useEffect(() => {
    if (!enabled || !data || !("Notification" in window)) return;

    const now = new Date();
    const allReminders = [...(data.overdue || []), ...(data.dueToday || [])];

    console.log(`[Reminder Check] Current time: ${now.toISOString()}, Found ${allReminders.length} reminders to check`);

    allReminders.forEach(({ reminder, lead }) => {
      const reminderId = String(reminder._id);
      const reminderTime = new Date(reminder.date);

      console.log(`[Reminder] "${lead.customerName}": scheduled=${reminderTime.toISOString()}, now=${now.toISOString()}, overdue=${reminderTime <= now}, alreadyNotified=${notifiedRef.current.has(reminderId)}`);

      if (notifiedRef.current.has(reminderId)) return;

      if (reminderTime <= now) {
        notifiedRef.current.add(reminderId);

        if (Notification.permission === "granted") {
          console.log(`[Notification Sent] "${lead.customerName}": ${reminder.caseDetails}`);
          new Notification(`🔔 Reminder: ${lead.customerName}`, {
            body: reminder.caseDetails,
            tag: `reminder-${reminderId}`,
            requireInteraction: true,
          });
        } else {
          console.warn(`[Permission Denied] Notification permission is: ${Notification.permission}`);
        }
      }
    });
  }, [enabled, data]);
}

export default function AppLayout() {
  const { user, logout } = useAuth();
  const verificationBadge = useVerificationBadge(user);
  const reminderBadge = useReminderBadge(user);
  useReminderNotifications(user);

  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  const tabs = [
    ["dashboard", "Dashboard"],
    ["leads", "Leads"],
    ["tasks", "Tasks"],
    ...(canVerify(user) ? [["verification", `Verification${verificationBadge}`]] : []),
    ...(canManageAccounting(user) ? [["accounting", "Accounting"]] : []),
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
