// App instalable: registro del service worker, aviso de versión nueva y botón de instalar
import { reactive } from "vue";

const instalada = () =>
  window.matchMedia?.("(display-mode: standalone)").matches || window.navigator.standalone === true;

export const pwa = reactive({
  nuevaVersion: false, // hay una versión más reciente de la app ya descargada
  puedeInstalar: false, // el navegador permite instalarla ahora (Chrome, Edge, Android...)
  instalada: false,
  esIOS: /iphone|ipad|ipod/i.test(navigator.userAgent),
});

let eventoInstalacion = null;

export function iniciarPWA() {
  pwa.instalada = instalada();

  // Solo en la versión publicada: en desarrollo un service worker estorbaría
  if ("serviceWorker" in navigator && import.meta.env.PROD) {
    const habiaControlador = !!navigator.serviceWorker.controller;
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {
        // Sin service worker la app funciona igual, solo que no abre sin conexión
      });
    });
    // Si cambia el service worker que controla la página (y ya había uno), hay versión nueva
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (habiaControlador) pwa.nuevaVersion = true;
    });
  }

  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault(); // se ofrece desde Perfil, no con el aviso del navegador
    eventoInstalacion = e;
    pwa.puedeInstalar = true;
  });
  window.addEventListener("appinstalled", () => {
    eventoInstalacion = null;
    pwa.puedeInstalar = false;
    pwa.instalada = true;
  });
}

/** Abre el diálogo de instalación. Devuelve true si la persona aceptó. */
export async function instalarApp() {
  if (!eventoInstalacion) return false;
  eventoInstalacion.prompt();
  const { outcome } = await eventoInstalacion.userChoice;
  eventoInstalacion = null;
  pwa.puedeInstalar = false;
  return outcome === "accepted";
}

export const recargar = () => window.location.reload();
