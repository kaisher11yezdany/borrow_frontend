import { verificationStatusInfo } from "../constants";

export default function VerificationBadge({ status }) {
  const info = verificationStatusInfo(status);
  return <span className={`badge ${info.cls}`}>{info.label}</span>;
}
