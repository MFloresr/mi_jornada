// Utilidades de formato y fechas (todo en hora local del navegador)

const DIAS_CORTOS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const DIAS_LARGOS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
export const MESES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

// useGrouping "always": en español Intl no pone el punto de miles en números de 4 cifras
const eurosFmt = new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", useGrouping: "always" });
const eurosRedondoFmt = new Intl.NumberFormat("es-ES", {
  style: "currency", currency: "EUR", maximumFractionDigits: 0, useGrouping: "always",
});
const numeroFmt = new Intl.NumberFormat("es-ES", { maximumFractionDigits: 1, useGrouping: "always" });

/** 96 -> "96,00 €" */
export const euros = (v) => eurosFmt.format(v || 0);
/** 1584.4 -> "1584 €" (para totales grandes) */
export const eurosRedondo = (v) => eurosRedondoFmt.format(v || 0);

/** Segundos -> "6,5 h" */
export function horas(segundos) {
  return `${numeroFmt.format((segundos || 0) / 3600)} h`;
}

/** Segundos -> "4 h 36 min" */
export function horasMinutos(segundos) {
  const total = Math.max(0, Math.floor((segundos || 0) / 60));
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (!h) return `${m} min`;
  return m ? `${h} h ${m} min` : `${h} h`;
}

/** Date -> "2026-09-23" */
export function isoFecha(d) {
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

/** "2026-09-23" -> Date local a medianoche */
export function aFecha(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export const hoyISO = () => isoFecha(new Date());
export function ayerISO() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return isoFecha(d);
}

/** "2026-09-23" -> "Mié" */
export const diaCorto = (iso) => DIAS_CORTOS[aFecha(iso).getDay()];
/** "2026-09-23" -> "23" */
export const diaNumero = (iso) => String(aFecha(iso).getDate());
/** Date -> "Miércoles, 23 de septiembre" */
export function fechaLarga(d = new Date()) {
  const dia = DIAS_LARGOS[d.getDay()];
  return `${dia[0].toUpperCase()}${dia.slice(1)}, ${d.getDate()} de ${MESES[d.getMonth()]}`;
}
/** "2026-09-17" -> "jueves 17" */
export function diaYNumero(iso) {
  const d = aFecha(iso);
  return `${DIAS_LARGOS[d.getDay()]} ${d.getDate()}`;
}

/** Lunes de la semana de d (00:00) */
export function inicioSemana(d = new Date()) {
  const r = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  r.setDate(r.getDate() - ((r.getDay() + 6) % 7));
  return r;
}

/** Duración trabajada en segundos entre "HH:MM" y "HH:MM" */
export function segundosEntre(entrada, salida, comida = false) {
  if (!entrada || !salida) return 0;
  const [h1, m1] = entrada.split(":").map(Number);
  const [h2, m2] = salida.split(":").map(Number);
  let s = (h2 * 60 + m2 - (h1 * 60 + m1)) * 60;
  if (comida) s -= 3600;
  return s;
}

/** Primer mensaje legible de un error de la API (DRF o JsonResponse) */
export function mensajeError(err, porDefecto = "Ha ocurrido un error") {
  const data = err?.response?.data;
  if (!data) return err?.response ? porDefecto : "Sin conexión con el servidor";
  if (typeof data === "string") return porDefecto;
  if (data.detail) return data.detail;
  const primero = Object.values(data)[0];
  if (Array.isArray(primero) && primero.length) return String(primero[0]);
  if (typeof primero === "string") return primero;
  return porDefecto;
}
