import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { initSocket } from "../utils/socket";

// Anything a lead mutation can move. Keys are prefixes, so ["leads"] also
// invalidates ["leads", filters, page, limit].
const LEAD_QUERY_KEYS = [
  ["leads"],
  ["lead"],
  ["accounting"],
  ["verification-queues"],
  ["verification-badge"],
  ["reminders-board"],
  ["reminder-badge"],
  ["all-tasks"],
];

// Subscribes the calling page to lead broadcasts. The payload only names the
// lead, so we refetch rather than patching cached state — that keeps every
// page's own filters and pagination authoritative.
export function useLeadRealtime({ onNoteNotification = true } = {}) {
  const qc = useQueryClient();

  useEffect(() => {
    const socket = initSocket();

    const handleLeadUpdate = () => {
      LEAD_QUERY_KEYS.forEach((queryKey) => qc.invalidateQueries({ queryKey }));
    };

    const handleNoteAdded = ({ leadName, note, addedBy }) => {
      qc.invalidateQueries({ queryKey: ["notes"] });
      qc.invalidateQueries({ queryKey: ["comments"] });
      if (
        onNoteNotification &&
        "Notification" in window &&
        Notification.permission === "granted"
      ) {
        new Notification(`💬 ${addedBy} commented on ${leadName}`, {
          body: note,
          icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='75' font-size='75'>💬</text></svg>",
        });
      }
    };

    socket.on("lead:updated", handleLeadUpdate);
    socket.on("note:added", handleNoteAdded);

    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }

    return () => {
      socket.off("lead:updated", handleLeadUpdate);
      socket.off("note:added", handleNoteAdded);
    };
  }, [qc, onNoteNotification]);
}
