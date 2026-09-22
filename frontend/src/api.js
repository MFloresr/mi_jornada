// src/api.js
import axios from "axios";

function getCookie(name) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(";").shift();
  return null;
}

const api = axios.create({
  // Mismo dominio que Django; en desarrollo Vite redirige /api a runserver
  baseURL: "/api/",
  withCredentials: true,
});

// Config para Django (por si Axios xsrf funciona)
api.defaults.xsrfCookieName = "csrftoken";
api.defaults.xsrfHeaderName = "X-CSRFToken";

// Interceptor: añade SIEMPRE X-CSRFToken leyendo la cookie
api.interceptors.request.use((config) => {
  const csrftoken = getCookie("csrftoken");

  if (csrftoken) {
    if (!config.headers) config.headers = {};
    config.headers["X-CSRFToken"] = csrftoken;
  }
  return config;
});

export default api;
