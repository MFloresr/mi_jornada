// Estado de la conexión: lo actualizan los avisos del navegador y cada petición a la API
import { reactive } from "vue";

export const red = reactive({
  sinConexion: typeof navigator !== "undefined" ? navigator.onLine === false : false,
});

/** Cada respuesta del servidor demuestra que hay conexión; un fallo sin respuesta, que no la hay */
export function marcarConexion(hay) {
  red.sinConexion = !hay;
}

if (typeof window !== "undefined") {
  window.addEventListener("offline", () => (red.sinConexion = true));
  // "online" solo dice que hay red, no que el servidor responda: la primera petición lo confirma
  window.addEventListener("online", () => (red.sinConexion = false));
}
