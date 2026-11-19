// Estado compartido de la app y llamadas a la API.
//
// Funciona también sin conexión: todo cambio se guarda primero en el dispositivo (cola de cambios
// pendientes) y se envía al servidor en cuanto hay conexión. Lo que ve la persona es siempre
// "lo último que mandó el servidor" más "lo que aún no se ha enviado".
import { reactive } from "vue";
import api from "./api";
import * as almacen from "./offline/almacen";
import { aplicar, aplicarPlan, describirOp, generarId, nuevaOp, planificar, validarRegistro, vaciar } from "./offline/cola";
import { red } from "./offline/red";
import { ahoraHHMM, hoyISO, mensajeError } from "./utils";

export const estado = reactive({
  usuario: null,
  comprobandoSesion: true,
  registros: [],
  jornada: null,
  lugares: [],
  aviso: null, // { tipo: "ok" | "error", texto }
  pendientes: 0, // cambios guardados en el dispositivo y aún sin enviar
  rechazadas: [], // cambios que el servidor no aceptó: [{ uid, texto, motivo, en, tipo, datos }]
  sincronizando: false,
  ultimaActualizacion: null, // cuándo se recibieron por última vez los datos del servidor
});

let temporizadorAviso = null;
export function avisar(texto, tipo = "ok") {
  estado.aviso = { texto, tipo };
  clearTimeout(temporizadorAviso);
  temporizadorAviso = setTimeout(() => (estado.aviso = null), 4000);
}

/** Error de validación detectado en el propio dispositivo (se muestra tal cual) */
const errorLocal = (mensaje) => Object.assign(new Error(mensaje), { esValidacion: true });

/* ---------- Datos: servidor + cambios pendientes ---------- */
let base = { registros: [], jornada: null, lugares: [] }; // lo último que mandó el servidor
let cola = []; // cambios pendientes de la persona que ha entrado, en orden

const email = () => estado.usuario?.email;

function refrescarVista() {
  const v = aplicar(base, cola, estado.usuario?.sueldo_por_hora || 0);
  estado.registros = v.registros;
  estado.jornada = v.jornada;
  estado.lugares = v.lugares;
  estado.pendientes = cola.length;
}

function guardarCopia() {
  if (email()) almacen.guardarDato(`copia:${email()}`, { ...base, en: estado.ultimaActualizacion });
}

async function cargarCopia() {
  const copia = email() ? await almacen.leerDato(`copia:${email()}`) : null;
  if (copia) {
    base = { registros: copia.registros || [], jornada: copia.jornada || null, lugares: copia.lugares || [] };
    estado.ultimaActualizacion = copia.en || null;
  }
}

async function cargarCola() {
  const todas = await almacen.todasLasOps();
  cola = todas.filter((o) => o.usuario === email());
  estado.rechazadas = (await almacen.leerDato(`rechazadas:${email()}`)) || [];
}

/* ---------- Sesión ---------- */
export async function comprobarSesion() {
  estado.comprobandoSesion = true;
  try {
    await api.get("csrf-ping/");
    const r = await api.get("me/");
    estado.usuario = r.data;
    await almacen.guardarDato("ultimo", r.data);
    await cargarCola();
    await cargarCopia();
    await sincronizar({ avisos: false }); // primero lo que se hizo sin conexión
    await cargarTodo();
  } catch (err) {
    estado.usuario = null;
    if (!err?.response) {
      // Sin conexión: se entra con lo último que se guardó en este dispositivo
      const ultimo = await almacen.leerDato("ultimo");
      if (ultimo) {
        estado.usuario = ultimo;
        await cargarCola();
        await cargarCopia();
        refrescarVista();
      }
    }
  } finally {
    estado.comprobandoSesion = false;
  }
}

/** Cambia el sueldo por hora del usuario. Solo afecta a los registros nuevos. Lanza el error para mostrarlo. */
export async function guardarSueldo(valor) {
  const r = await api.patch("me/", { sueldo_por_hora: valor });
  estado.usuario = r.data;
  await almacen.guardarDato("ultimo", r.data);
  refrescarVista();
}

export async function cerrarSesion() {
  const quien = email();
  try {
    await api.post("logout/");
  } catch {
    // Aunque falle en el servidor, limpiamos la sesión local
  }
  clearTimeout(reintento);
  if (quien) await almacen.borrarDatosDe(quien);
  base = { registros: [], jornada: null, lugares: [] };
  cola = [];
  Object.assign(estado, { usuario: null, registros: [], jornada: null, lugares: [], pendientes: 0, rechazadas: [] });
}

/* ---------- Leer del servidor ---------- */
export async function cargarTodo() {
  try {
    const [registros, jornada, lugares] = await Promise.all([api.get("registros/"), api.get("jornada/"), api.get("lugares/")]);
    base = { registros: registros.data.registros || [], jornada: jornada.data.activa, lugares: lugares.data || [] };
    estado.ultimaActualizacion = Date.now();
    guardarCopia();
  } catch (err) {
    if (err?.response?.status === 401 || err?.response?.status === 403) throw err;
    // Sin conexión no es un error: se sigue con la última copia
    if (err?.response) avisar(mensajeError(err, "No se pudieron cargar los datos"), "error");
  }
  refrescarVista();
}

/* ---------- Guardar un cambio: primero en el dispositivo, luego al servidor ---------- */
/**
 * Añade el cambio a la cola y, si hay conexión, lo envía. Devuelve { pendiente }: true si se
 * quedó guardado solo en el dispositivo. Si el servidor lo rechaza, lanza el error (para mostrarlo en el formulario).
 */
async function registrar(tipo, datos) {
  const op = nuevaOp(tipo, datos, email());
  const plan = planificar(cola, op);
  const afectadas = [...plan.anadir, ...plan.actualizar].map((o) => o.uid);
  cola = aplicarPlan(cola, plan);
  await Promise.all([
    ...plan.anadir.map(almacen.guardarOp),
    ...plan.actualizar.map(almacen.guardarOp),
    ...plan.borrar.map(almacen.borrarOp),
  ]);
  refrescarVista();
  if (!afectadas.length) return { pendiente: false }; // se anuló con otro cambio que aún no se había enviado

  if (!red.sinConexion) {
    const r = await sincronizar({ avisos: false });
    const rechazo = r.rechazadas.find((x) => afectadas.includes(x.op.uid));
    if (rechazo) {
      await descartarRechazada(rechazo.op.uid);
      throw rechazo.err;
    }
  }
  return { pendiente: cola.some((o) => afectadas.includes(o.uid)) };
}

/* ---------- Enviar al servidor ---------- */
async function enviarOp(op) {
  const d = op.datos;
  try {
    switch (op.tipo) {
      case "registro_crear":
        await api.post("registros/", { ...d.registro, client_id: d.clientId });
        break;
      case "registro_editar":
        await api.put(`registros/${d.id}/`, d.registro);
        break;
      case "registro_borrar":
        await api.delete(`registros/${d.id}/`);
        break;
      case "jornada_iniciar":
        await api.post("jornada/iniciar/", d);
        break;
      case "jornada_cambiar":
        await api.patch("jornada/", d);
        break;
      case "jornada_terminar":
        await api.post("jornada/terminar/", { fecha: d.fecha, hora_salida: d.hora_salida, client_id: d.clientId });
        break;
      case "jornada_descartar":
        await api.delete("jornada/");
        break;
    }
  } catch (err) {
    // Si lo que se quería borrar o cambiar ya no existe, el resultado es el mismo
    if (err?.response?.status === 404 && ["registro_borrar", "jornada_cambiar", "jornada_descartar"].includes(op.tipo)) return;
    throw err;
  }
}

async function quitarOp(op) {
  cola = cola.filter((o) => o.uid !== op.uid);
  await almacen.borrarOp(op.uid);
}

async function moverARechazadas(op, err) {
  const rechazada = {
    uid: op.uid,
    tipo: op.tipo,
    texto: describirOp(op),
    motivo: mensajeError(err, "El servidor no aceptó este cambio"),
    en: Date.now(),
    datos: op.datos,
  };
  estado.rechazadas = [...estado.rechazadas, rechazada];
  await almacen.guardarDato(`rechazadas:${email()}`, estado.rechazadas);
  await quitarOp(op);
}

export async function descartarRechazada(uid) {
  estado.rechazadas = estado.rechazadas.filter((r) => r.uid !== uid);
  await almacen.guardarDato(`rechazadas:${email()}`, estado.rechazadas);
}

/** Vuelve a intentar enviar un cambio que el servidor había rechazado */
export async function reintentarRechazada(uid) {
  const r = estado.rechazadas.find((x) => x.uid === uid);
  if (!r) return;
  await descartarRechazada(uid);
  try {
    await registrar(r.tipo, r.datos);
  } catch (err) {
    avisar(mensajeError(err, "El servidor sigue sin aceptarlo"), "error");
  }
}

let enVuelo = null;
let reintento = null;

/**
 * Envía los cambios pendientes en orden. Se puede llamar cuando se quiera: si ya hay un envío en
 * marcha, se une a él. Devuelve { enviadas, rechazadas, parada }.
 */
export function sincronizar({ avisos = true } = {}) {
  if (!enVuelo) enVuelo = ejecutarSincronizacion(avisos).finally(() => (enVuelo = null));
  return enVuelo;
}

async function ejecutarSincronizacion(avisos) {
  const total = { enviadas: 0, rechazadas: [], parada: null };
  if (!estado.usuario || !cola.length) return total;
  if (red.sinConexion && navigator.onLine === false) return { ...total, parada: "red" };

  estado.sincronizando = true;
  clearTimeout(reintento);
  try {
    if (!document.cookie.includes("csrftoken=")) await api.get("csrf-ping/");
    const intentadas = new Set();
    for (;;) {
      const pendientes = cola.filter((o) => !intentadas.has(o.uid));
      if (!pendientes.length) break;
      pendientes.forEach((o) => intentadas.add(o.uid));
      const r = await vaciar(pendientes, { ejecutar: enviarOp, alEnviar: quitarOp, alRechazar: moverARechazadas });
      total.enviadas += r.enviadas;
      total.rechazadas.push(...r.rechazadas);
      if (r.parada) {
        total.parada = r.parada;
        break;
      }
    }
  } catch (err) {
    // No se pudo ni preparar el envío (casi siempre, sin conexión)
    total.parada = err?.response ? "servidor" : "red";
  } finally {
    estado.sincronizando = false;
  }

  if (total.parada === "sesion") {
    avisar("Tu sesión ha caducado. Entra de nuevo y tus cambios se enviarán.", "error");
    estado.usuario = null; // los cambios siguen guardados en el dispositivo
    return total;
  }
  if (total.enviadas || total.rechazadas.length) await cargarTodo();
  else refrescarVista();

  if (avisos) {
    if (total.rechazadas.length) {
      avisar(`${total.rechazadas.length === 1 ? "Un cambio no se pudo enviar" : `${total.rechazadas.length} cambios no se pudieron enviar`}. Míralos en Perfil.`, "error");
    } else if (total.enviadas && !cola.length) {
      avisar(total.enviadas === 1 ? "Se ha enviado 1 cambio guardado en el móvil" : `Se han enviado ${total.enviadas} cambios guardados en el móvil`);
    }
  }
  if ((total.parada === "red" || total.parada === "servidor") && cola.length) {
    reintento = setTimeout(() => sincronizar({ avisos }), 30000);
  }
  return total;
}

let automatica = false;
/** Envía lo pendiente al recuperar la conexión, al volver a la app y cada minuto mientras haya algo */
export function iniciarSincronizacionAutomatica() {
  if (automatica) return;
  automatica = true;
  window.addEventListener("online", () => {
    if (!estado.usuario) return;
    sincronizar().then(() => !cola.length && cargarTodo().catch(() => {}));
  });
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") comprobarYEnviar();
  });
  // El navegador no siempre avisa de que vuelve la conexión (p. ej. si cae el servidor): se pregunta cada 15 s
  setInterval(comprobarYEnviar, 15000);
}

let comprobando = false;
async function comprobarYEnviar() {
  if (!estado.usuario || comprobando || estado.sincronizando) return;
  comprobando = true;
  try {
    if (red.sinConexion) {
      try {
        await api.get("csrf-ping/", { timeout: 5000 }); // si responde, el interceptor quita el aviso
      } catch {
        return;
      }
      if (!cola.length) await cargarTodo();
    }
    if (cola.length) await sincronizar();
  } finally {
    comprobando = false;
  }
}

/* ---------- Registros ---------- */
/** Crea o actualiza un registro. Lanza el error para que el formulario lo muestre. */
export async function guardarRegistro(datos, id = null) {
  const problema = validarRegistro(datos);
  if (problema) throw errorLocal(problema);
  return id ? registrar("registro_editar", { id, registro: datos }) : registrar("registro_crear", { clientId: generarId(), registro: datos });
}

/**
 * Guarda varios registros nuevos en orden y se detiene en el primer error.
 * Devuelve { guardados, error, pendiente } para saber cuáles quedan por revisar.
 */
export async function guardarVarios(lista) {
  let guardados = 0;
  let error = null;
  let pendiente = false;
  for (const datos of lista) {
    try {
      const r = await guardarRegistro(datos);
      pendiente = pendiente || r.pendiente;
      guardados++;
    } catch (err) {
      error = err;
      break;
    }
  }
  return { guardados, error, pendiente };
}

/** Pide al asistente que convierta un texto en registros (no guarda nada). Necesita conexión. */
export async function interpretarTexto(texto) {
  const r = await api.post("ia/interpretar/", { texto }, { timeout: 60000 });
  return r.data;
}

export function eliminarRegistro(id) {
  return registrar("registro_borrar", { id });
}

/* ---------- Fichar ---------- */
export function empezarJornada(lugar) {
  if (estado.jornada) throw errorLocal("Ya tienes una jornada en curso");
  return registrar("jornada_iniciar", { fecha: hoyISO(), hora_entrada: ahoraHHMM(), lugar, descanso_comida: false });
}

export function cambiarJornada(cambios) {
  return registrar("jornada_cambiar", cambios);
}

/**
 * Termina la jornada con la hora de este momento. Devuelve { pendiente } si se guardó, o
 * { revisar } con los datos de la jornada si hay que revisarla a mano (empezó otro día).
 */
export async function terminarJornada() {
  const j = estado.jornada;
  if (!j) throw errorLocal("No hay ninguna jornada en curso");
  const hoy = hoyISO();
  if (j.fecha !== hoy) {
    return { revisar: { detail: "La jornada empezó otro día. Revisa las horas y guárdala a mano.", activa: j } };
  }
  const hora = ahoraHHMM();
  const problema = validarRegistro({ fecha: hoy, hora_entrada: j.hora_entrada, hora_salida: hora, descanso_comida: j.descanso_comida });
  if (problema) throw errorLocal(problema);

  try {
    return await registrar("jornada_terminar", {
      clientId: generarId(),
      fecha: hoy,
      hora_salida: hora,
      jornada: { fecha: j.fecha, hora_entrada: j.hora_entrada, lugar: j.lugar, descanso_comida: j.descanso_comida },
    });
  } catch (err) {
    if (err?.response?.status === 409 && err.response.data?.activa) return { revisar: err.response.data };
    throw err;
  }
}

export function descartarJornada() {
  return registrar("jornada_descartar", {});
}
