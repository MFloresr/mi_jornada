// Estado compartido de la app y llamadas a la API
import { reactive } from "vue";
import api from "./api";
import { mensajeError } from "./utils";

export const estado = reactive({
  usuario: null,
  comprobandoSesion: true,
  registros: [],
  jornada: null,
  lugares: [],
  aviso: null, // { tipo: "ok" | "error", texto }
});

let temporizadorAviso = null;
export function avisar(texto, tipo = "ok") {
  estado.aviso = { texto, tipo };
  clearTimeout(temporizadorAviso);
  temporizadorAviso = setTimeout(() => (estado.aviso = null), 4000);
}

/* ---------- Sesión ---------- */
export async function comprobarSesion() {
  estado.comprobandoSesion = true;
  try {
    await api.get("csrf-ping/");
    const r = await api.get("me/");
    estado.usuario = r.data;
    await cargarTodo();
  } catch {
    estado.usuario = null;
  } finally {
    estado.comprobandoSesion = false;
  }
}

export async function cerrarSesion() {
  try {
    await api.post("logout/");
  } catch {
    // Aunque falle en el servidor, limpiamos la sesión local
  }
  Object.assign(estado, { usuario: null, registros: [], jornada: null, lugares: [] });
}

export async function cargarTodo() {
  await Promise.all([cargarRegistros(), cargarJornada(), cargarLugares()]);
}

/* ---------- Registros ---------- */
export async function cargarRegistros() {
  try {
    const r = await api.get("registros/");
    estado.registros = r.data.registros || [];
  } catch (err) {
    avisar(mensajeError(err, "No se pudieron cargar los registros"), "error");
  }
}

export async function cargarLugares() {
  try {
    const r = await api.get("lugares/");
    estado.lugares = r.data || [];
  } catch {
    estado.lugares = [];
  }
}

/** Crea o actualiza un registro. Lanza el error para que el formulario lo muestre. */
export async function guardarRegistro(datos, id = null) {
  if (id) await api.put(`registros/${id}/`, datos);
  else await api.post("registros/", datos);
  await Promise.all([cargarRegistros(), cargarLugares()]);
}

export async function eliminarRegistro(id) {
  await api.delete(`registros/${id}/`);
  await cargarRegistros();
}

/* ---------- Fichar ---------- */
export async function cargarJornada() {
  try {
    const r = await api.get("jornada/");
    estado.jornada = r.data.activa;
  } catch {
    estado.jornada = null;
  }
}

export async function empezarJornada(lugar) {
  const r = await api.post("jornada/iniciar/", { lugar });
  estado.jornada = r.data.activa;
}

export async function cambiarJornada(cambios) {
  const r = await api.patch("jornada/", cambios);
  estado.jornada = r.data.activa;
}

/**
 * Termina la jornada. Devuelve null si se guardó, o los datos de la jornada
 * si hay que revisarla a mano (empezó otro día).
 */
export async function terminarJornada() {
  try {
    await api.post("jornada/terminar/");
    estado.jornada = null;
    await Promise.all([cargarRegistros(), cargarLugares()]);
    return null;
  } catch (err) {
    if (err?.response?.status === 409 && err.response.data?.activa) {
      return err.response.data;
    }
    throw err;
  }
}

export async function descartarJornada() {
  await api.delete("jornada/");
  estado.jornada = null;
}
