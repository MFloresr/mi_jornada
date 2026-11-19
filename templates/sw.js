// Service worker de Mi Jornada: permite abrir la app sin conexión.
// Plantilla: `npm run build` rellena la versión y la lista de archivos y deja el resultado en templates/sw.js.
//
// Solo guarda la propia app (HTML, JS, CSS, iconos y tipografías). Los datos de la persona NO pasan
// por aquí: los guarda la app en IndexedDB y se borran al cerrar sesión.

const VERSION = "298e0df580";
const CACHE = `mi-jornada-${VERSION}`;
const CACHE_FUENTES = "mi-jornada-fuentes";
const PRECACHE = [
  "/",
  "/static/favicon.svg",
  "/static/assets/index-C-HrGWj4.css",
  "/static/assets/index-DxlCvCD1.js",
  "/static/icons/apple-touch-icon.png",
  "/static/icons/icon-192.png",
  "/static/icons/icon-512.png",
  "/static/icons/icon-maskable-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      // "reload": que no use copias viejas del navegador al guardar la versión nueva
      .then((cache) => cache.addAll(PRECACHE.map((url) => new Request(url, { cache: "reload" }))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((nombres) => Promise.all(nombres.filter((n) => n !== CACHE && n !== CACHE_FUENTES).map((n) => caches.delete(n))))
      .then(() => self.clients.claim()),
  );
});

/** Pide a la red; si tarda demasiado o falla, lanza error */
function conTiempo(request, ms) {
  return new Promise((ok, mal) => {
    const t = setTimeout(() => mal(new Error("tiempo agotado")), ms);
    fetch(request).then(
      (r) => {
        clearTimeout(t);
        ok(r);
      },
      (e) => {
        clearTimeout(t);
        mal(e);
      },
    );
  });
}

/** Páginas: primero la red (siempre la versión nueva); sin red, la app guardada */
async function pagina(request) {
  try {
    return await conTiempo(request, 4000);
  } catch {
    // Cualquier ruta de la app (/, /reset-password/...) abre la misma app
    return (await caches.match("/")) || Response.error();
  }
}

/** Archivos de la app (llevan el hash en el nombre): primero lo guardado */
async function primeroGuardado(request) {
  const guardado = await caches.match(request);
  if (guardado) return guardado;
  const respuesta = await fetch(request);
  if (respuesta.ok) (await caches.open(CACHE)).put(request, respuesta.clone());
  return respuesta;
}

/** Tipografías: lo guardado al momento y se renueva por detrás */
async function guardadoYRenovar(request) {
  const cache = await caches.open(CACHE_FUENTES);
  const guardado = await cache.match(request);
  const nueva = fetch(request)
    .then((r) => {
      if (r.ok || r.type === "opaque") cache.put(request, r.clone());
      return r;
    })
    .catch(() => guardado);
  return guardado || nueva;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  const propia = url.origin === self.location.origin;

  if (request.mode === "navigate") {
    if (!propia || url.pathname.startsWith("/admin") || url.pathname.startsWith("/api")) return;
    event.respondWith(pagina(request));
  } else if (propia && url.pathname.startsWith("/static/")) {
    event.respondWith(primeroGuardado(request));
  } else if (url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com") {
    event.respondWith(guardadoYRenovar(request));
  }
  // La API y todo lo demás va directo a la red
});
