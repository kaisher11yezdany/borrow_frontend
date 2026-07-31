import axios from "axios";

const api = axios.create({ baseURL: "/api" });

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
