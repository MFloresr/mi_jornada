// Guarda en el dispositivo (IndexedDB) lo último que mandó el servidor y los cambios pendientes de enviar.
// Si el navegador no deja usar IndexedDB (modo privado, por ejemplo), usa la memoria: la app sigue
// funcionando, pero lo pendiente se pierde al cerrarla.

const BD = "mi-jornada";
const VERSION = 1;

const memoria = { datos: new Map(), cola: new Map() };
let usarMemoria = typeof indexedDB === "undefined";
let abierta = null;

function abrir() {
  if (!abierta) {
    abierta = new Promise((ok, mal) => {
      const peticion = indexedDB.open(BD, VERSION);
      peticion.onupgradeneeded = () => {
        const bd = peticion.result;
        bd.createObjectStore("datos");
        bd.createObjectStore("cola", { keyPath: "uid" });
      };
      peticion.onsuccess = () => ok(peticion.result);
      peticion.onerror = () => mal(peticion.error);
      peticion.onblocked = () => mal(new Error("IndexedDB bloqueada"));
    });
  }
  return abierta;
}

/** Ejecuta `accion(almacen)` en una transacción y devuelve su resultado */
async function transaccion(nombre, modo, accion) {
  const bd = await abrir();
  return new Promise((ok, mal) => {
    const t = bd.transaction(nombre, modo);
    let resultado;
    const peticion = accion(t.objectStore(nombre));
    if (peticion) peticion.onsuccess = () => (resultado = peticion.result);
    t.oncomplete = () => ok(resultado);
    t.onerror = () => mal(t.error);
    t.onabort = () => mal(t.error);
  });
}

/** Prueba IndexedDB; si falla, pasa a memoria para siempre (en esta visita) */
async function conFallback(conBD, enMemoria) {
  if (!usarMemoria) {
    try {
      return await conBD();
    } catch {
      usarMemoria = true;
    }
  }
  return enMemoria();
}

/* ---------- Datos sueltos (última copia del servidor, usuario, rechazados...) ---------- */
export const leerDato = (clave) =>
  conFallback(
    () => transaccion("datos", "readonly", (s) => s.get(clave)),
    () => memoria.datos.get(clave),
  ).then((v) => (v === undefined ? null : v));

export const guardarDato = (clave, valor) =>
  conFallback(
    () => transaccion("datos", "readwrite", (s) => s.put(valor, clave)),
    () => void memoria.datos.set(clave, valor),
  );

export const borrarDato = (clave) =>
  conFallback(
    () => transaccion("datos", "readwrite", (s) => s.delete(clave)),
    () => void memoria.datos.delete(clave),
  );

/* ---------- Cola de cambios pendientes ---------- */
export const todasLasOps = () =>
  conFallback(
    () => transaccion("cola", "readonly", (s) => s.getAll()),
    () => [...memoria.cola.values()],
  ).then((ops) => ops.sort((a, b) => a.orden - b.orden));

export const guardarOp = (op) =>
  conFallback(
    () => transaccion("cola", "readwrite", (s) => s.put(op)),
    () => void memoria.cola.set(op.uid, op),
  );

export const borrarOp = (uid) =>
  conFallback(
    () => transaccion("cola", "readwrite", (s) => s.delete(uid)),
    () => void memoria.cola.delete(uid),
  );

/** Borra todo lo guardado de una persona (al cerrar sesión) */
export async function borrarDatosDe(usuario) {
  const ops = await todasLasOps();
  await Promise.all(ops.filter((o) => o.usuario === usuario).map((o) => borrarOp(o.uid)));
  await Promise.all([borrarDato(`copia:${usuario}`), borrarDato(`rechazadas:${usuario}`), borrarDato("ultimo")]);
}
