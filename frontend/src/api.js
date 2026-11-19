// src/api.js
import axios from "axios";
import { marcarConexion } from "./offline/red";

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
  // Sin esto, con mala cobertura una petición podría quedarse colgada para siempre
  timeout: 20000,
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

// Cada respuesta demuestra que hay conexión; un fallo sin respuesta, que no la hay
api.interceptors.response.use(
  (respuesta) => {
    marcarConexion(true);
    return respuesta;
  },
  (error) => {
    marcarConexion(!!error.response);
    return Promise.reject(error);
  },
);

export default api;
