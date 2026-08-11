import axios from "axios";

// Empty by default so local dev (Vite's /api and /uploads proxy to
// localhost:5000, see vite.config.js) keeps working unchanged. Set
// VITE_API_ORIGIN at build time (e.g. "http://<backend-ip>" or
// "https://api.yourdomain.com") when the frontend and backend are deployed
// on separate hosts, so relative paths from the API no longer resolve
// against the frontend's own origin.
const API_ORIGIN = import.meta.env.VITE_API_ORIGIN || "";

const api = axios.create({ baseURL: `${API_ORIGIN}/api` });

// Resolves a path the backend returned (e.g. "/uploads/xyz.jpg") into a URL
// that's actually reachable from the browser. Already-absolute URLs pass
// through untouched.
export function fileUrl(path) {
  if (!path) return path;
  if (/^https?:\/\//.test(path)) return path;
  return `${API_ORIGIN}${path}`;
}

export function setAuthToken(token) {
  if (token) {
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
    localStorage.setItem("crm_token", token);
  } else {
    delete api.defaults.headers.common.Authorization;
    localStorage.removeItem("crm_token");
  }
}

export function loadStoredToken() {
  const token = localStorage.getItem("crm_token");
  if (token) setAuthToken(token);
  return token;
}

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) setAuthToken(null);
    return Promise.reject(err);
  }
);

export default api;
