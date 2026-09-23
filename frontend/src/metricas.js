// Cálculos sobre la lista de registros (horas en segundos, importes en euros)
import { aFecha, inicioSemana, isoFecha } from "./utils";

/** Suma horas, importe y días distintos de una lista de registros */
export function totales(registros) {
  const dias = new Set();
  let segundos = 0;
  let importe = 0;
  for (const r of registros) {
    segundos += r.duracion_trabajada || 0;
    importe += r.sueldo_registro || 0;
    dias.add(r.fecha);
  }
  return { segundos, importe, dias: dias.size };
}

/** Registros con fecha entre desde y hasta (Date o ISO, ambos incluidos) */
export function entre(registros, desde, hasta) {
  const d = typeof desde === "string" ? desde : isoFecha(desde);
  const h = typeof hasta === "string" ? hasta : isoFecha(hasta);
  return registros.filter((r) => r.fecha >= d && r.fecha <= h);
}

export function deLaSemana(registros, ref = new Date()) {
  const lunes = inicioSemana(ref);
  const domingo = new Date(lunes);
  domingo.setDate(domingo.getDate() + 6);
  return entre(registros, lunes, domingo);
}

export function delMes(registros, anio, mes) {
  const prefijo = `${anio}-${String(mes + 1).padStart(2, "0")}-`;
  return registros.filter((r) => r.fecha.startsWith(prefijo));
}

/** { "2026-09-23": { segundos, importe, registros: [...] } } */
export function porDia(registros) {
  const mapa = {};
  for (const r of registros) {
    const d = (mapa[r.fecha] ||= { segundos: 0, importe: 0, registros: [] });
    d.segundos += r.duracion_trabajada || 0;
    d.importe += r.sueldo_registro || 0;
    d.registros.push(r);
  }
  for (const d of Object.values(mapa)) {
    d.registros.sort((a, b) => a.hora_entrada.localeCompare(b.hora_entrada));
  }
  return mapa;
}

/** Días con registro, del más reciente al más antiguo: [{ fecha, segundos, importe, registros }] */
export function diasRecientes(registros, limite = 5) {
  const mapa = porDia(registros);
  return Object.keys(mapa)
    .sort()
    .reverse()
    .slice(0, limite)
    .map((fecha) => ({ fecha, ...mapa[fecha] }));
}

/** Horas por lugar, de más a menos */
export function porLugar(registros) {
  const mapa = {};
  for (const r of registros) {
    const l = r.lugar || "Sin lugar";
    const d = (mapa[l] ||= { lugar: l, segundos: 0, importe: 0 });
    d.segundos += r.duracion_trabajada || 0;
    d.importe += r.sueldo_registro || 0;
  }
  return Object.values(mapa).sort((a, b) => b.segundos - a.segundos);
}

/** Últimos n días naturales (incluido hoy) con sus horas: [{ fecha, segundos }] */
export function ultimosDias(registros, n = 14, hoy = new Date()) {
  const mapa = porDia(registros);
  const res = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() - i);
    const iso = isoFecha(d);
    res.push({ fecha: iso, segundos: mapa[iso]?.segundos || 0, finde: [0, 6].includes(aFecha(iso).getDay()) });
  }
  return res;
}
