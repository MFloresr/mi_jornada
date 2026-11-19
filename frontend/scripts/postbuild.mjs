// Después de `vite build`: deja en templates/ lo que sirve Django (la página, el service worker y el manifiesto)
import { createHash } from "node:crypto";
import { copyFileSync, readdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const aqui = dirname(fileURLToPath(import.meta.url));
const pwa = join(aqui, "..", "pwa");
const proyecto = join(aqui, "..", "..");
const estaticos = join(proyecto, "backend", "static");
const plantillas = join(proyecto, "templates");

// 1) La página: la sirve Django desde templates/
renameSync(join(estaticos, "index.html"), join(plantillas, "index.html"));

// 2) Archivos que el service worker guarda para abrir sin conexión
const listar = (carpeta) => readdirSync(join(estaticos, carpeta)).sort().map((f) => `/static/${carpeta}/${f}`);
const precache = ["/", "/static/favicon.svg", ...listar("assets"), ...listar("icons")];

// 3) Versión: cambia solo si cambia la página o la lista de archivos, y así el navegador actualiza el service worker
const version = createHash("sha1")
  .update(readFileSync(join(plantillas, "index.html")))
  .update(precache.join("\n"))
  .digest("hex")
  .slice(0, 10);

const plantilla = readFileSync(join(pwa, "sw.template.js"), "utf8");
writeFileSync(
  join(plantillas, "sw.js"),
  plantilla.replace("__VERSION__", version).replace("__PRECACHE__", JSON.stringify(precache, null, 2)),
);

// 4) El manifiesto
copyFileSync(join(pwa, "manifest.webmanifest"), join(plantillas, "manifest.webmanifest"));

console.log(`PWA lista: versión ${version}, ${precache.length} archivos para abrir sin conexión`);
