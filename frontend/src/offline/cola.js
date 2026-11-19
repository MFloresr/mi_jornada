// Lógica de la cola de cambios hechos sin conexión.
// Es código puro (sin red, sin navegador, sin Vue) para poder probarlo con `npm test`.
//
// Cada cambio pendiente ("operación") tiene esta forma:
//   { uid, orden, usuario, tipo, datos }
// Tipos y datos:
//   registro_crear    { clientId, registro }          registro nuevo (clientId evita duplicados al reenviar)
//   registro_editar   { id, registro }                cambios de un registro que ya está en el servidor
//   registro_borrar   { id }
//   jornada_iniciar   { fecha, hora_entrada, lugar, descanso_comida }
//   jornada_cambiar   { lugar?, descanso_comida? }
//   jornada_terminar  { clientId, fecha, hora_salida, jornada }   (jornada: copia de la que se cierra)
//   jornada_descartar {}

const ID_LOCAL = "local-";

export const esLocal = (id) => typeof id === "string" && id.startsWith(ID_LOCAL);
export const idLocal = (clientId) => ID_LOCAL + clientId;

let contador = 0;
const nuevoId = () =>
  globalThis.crypto?.randomUUID?.() ??
  "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });

export const generarId = nuevoId;

/** Crea una operación pendiente. `orden` sube siempre, así se envían en el mismo orden en que se hicieron. */
export function nuevaOp(tipo, datos, usuario) {
  contador = (contador + 1) % 1000;
  return { uid: nuevoId(), orden: Date.now() * 1000 + contador, usuario, tipo, datos };
}

/* ---------- Cálculos de un registro (igual que en el servidor) ---------- */
const segundosDe = (hora) => {
  const [h, m] = hora.split(":").map(Number);
  return h * 3600 + m * 60;
};

/** Duraciones e importe de un registro, para mostrarlo antes de que el servidor lo confirme */
export function calcularRegistro(r, sueldoPerfil = 0) {
  const total = segundosDe(r.hora_salida) - segundosDe(r.hora_entrada);
  const trabajada = r.descanso_comida ? total - 3600 : total;
  const sueldoHora = r.sueldo_por_hora ?? sueldoPerfil;
  return {
    sueldo_por_hora: sueldoHora,
    duracion_total: total,
    duracion_trabajada: trabajada,
    sueldo_registro: Math.round((trabajada / 3600) * sueldoHora * 100) / 100,
  };
}

/** Mismas reglas que el servidor. Devuelve el mensaje de error o null si todo va bien. */
export function validarRegistro(r) {
  if (!r.fecha || !r.hora_entrada || !r.hora_salida) return "Indica el día, la hora de entrada y la de salida.";
  const duracion = segundosDe(r.hora_salida) - segundosDe(r.hora_entrada);
  if (duracion <= 0) return "La salida tiene que ser posterior a la entrada.";
  if (r.descanso_comida && duracion <= 3600) return "Con descanso de comida la jornada debe durar más de 1 h.";
  return null;
}

/* ---------- Añadir un cambio a la cola ---------- */
/**
 * Decide cómo queda la cola al añadir `nueva`. Devuelve { anadir, actualizar, borrar }:
 * se evita enviar cosas que no hacen falta (por ejemplo, editar un registro que aún
 * no se ha enviado cambia el registro nuevo en lugar de añadir otra edición).
 */
export function planificar(ops, nueva) {
  const plan = { anadir: [], actualizar: [], borrar: [] };
  const d = nueva.datos;
  const buscar = (fn) => ops.find(fn);
  const todas = (fn) => ops.filter(fn);

  switch (nueva.tipo) {
    case "registro_editar": {
      if (esLocal(d.id)) {
        const crear = buscar((o) => o.tipo === "registro_crear" && idLocal(o.datos.clientId) === d.id);
        if (crear) plan.actualizar.push({ ...crear, datos: { ...crear.datos, registro: { ...crear.datos.registro, ...d.registro } } });
        return plan; // si ya no está en la cola es que se acaba de enviar: no hay nada que editar
      }
      const previa = buscar((o) => o.tipo === "registro_editar" && o.datos.id === d.id);
      if (previa) plan.actualizar.push({ ...previa, datos: { id: d.id, registro: { ...previa.datos.registro, ...d.registro } } });
      else plan.anadir.push(nueva);
      return plan;
    }

    case "registro_borrar": {
      if (esLocal(d.id)) {
        todas((o) => o.tipo === "registro_crear" && idLocal(o.datos.clientId) === d.id).forEach((o) => plan.borrar.push(o.uid));
        return plan; // nunca llegó al servidor: basta con quitarlo
      }
      todas((o) => o.tipo === "registro_editar" && o.datos.id === d.id).forEach((o) => plan.borrar.push(o.uid));
      if (!buscar((o) => o.tipo === "registro_borrar" && o.datos.id === d.id)) plan.anadir.push(nueva);
      return plan;
    }

    case "jornada_cambiar": {
      const inicio = buscar((o) => o.tipo === "jornada_iniciar");
      if (inicio) {
        plan.actualizar.push({ ...inicio, datos: { ...inicio.datos, ...d } });
        return plan;
      }
      const previa = buscar((o) => o.tipo === "jornada_cambiar");
      if (previa) plan.actualizar.push({ ...previa, datos: { ...previa.datos, ...d } });
      else plan.anadir.push(nueva);
      return plan;
    }

    case "jornada_descartar": {
      const inicio = buscar((o) => o.tipo === "jornada_iniciar");
      todas((o) => o.tipo === "jornada_cambiar").forEach((o) => plan.borrar.push(o.uid));
      if (inicio) {
        plan.borrar.push(inicio.uid); // el servidor nunca supo de esa jornada
        return plan;
      }
      if (!buscar((o) => o.tipo === "jornada_descartar")) plan.anadir.push(nueva);
      return plan;
    }

    case "jornada_terminar": {
      const inicio = buscar((o) => o.tipo === "jornada_iniciar");
      if (inicio && inicio.datos.fecha === d.fecha) {
        // Empezó y terminó sin conexión el mismo día: se guarda directamente como un registro
        const cambios = todas((o) => o.tipo === "jornada_cambiar");
        const j = cambios.reduce((acc, o) => ({ ...acc, ...o.datos }), inicio.datos);
        plan.borrar.push(inicio.uid, ...cambios.map((o) => o.uid));
        plan.anadir.push({
          ...nuevaOp(
            "registro_crear",
            {
              clientId: d.clientId,
              registro: {
                fecha: j.fecha,
                hora_entrada: j.hora_entrada,
                hora_salida: d.hora_salida,
                lugar: j.lugar || "",
                descanso_comida: !!j.descanso_comida,
                descripcion: "",
                sueldo_por_hora: null,
              },
            },
            nueva.usuario,
          ),
          orden: nueva.orden,
        });
        return plan;
      }
      plan.anadir.push(nueva);
      return plan;
    }

    default:
      plan.anadir.push(nueva);
      return plan;
  }
}

/** Aplica un plan a la lista de operaciones y devuelve la lista nueva, ordenada */
export function aplicarPlan(ops, plan) {
  const borrar = new Set(plan.borrar);
  const cambios = new Map(plan.actualizar.map((o) => [o.uid, o]));
  const resultado = ops.filter((o) => !borrar.has(o.uid)).map((o) => cambios.get(o.uid) || o);
  return [...resultado, ...plan.anadir].sort((a, b) => a.orden - b.orden);
}

/* ---------- Cómo se ven los cambios pendientes en pantalla ---------- */
const ordenar = (registros) =>
  [...registros].sort((a, b) => b.fecha.localeCompare(a.fecha) || b.hora_entrada.localeCompare(a.hora_entrada));

/**
 * Datos que ve la persona: lo último que mandó el servidor más lo que aún no se ha enviado.
 * `base` = { registros, jornada, lugares }. No modifica `base`.
 */
export function aplicar(base, ops, sueldoPerfil = 0) {
  let registros = base.registros.map((r) => ({ ...r }));
  let jornada = base.jornada ? { ...base.jornada } : null;
  const lugares = [...base.lugares];
  const recordarLugar = (l) => {
    if (l && !lugares.includes(l)) lugares.unshift(l);
  };
  const provisional = (clientId, r) => ({
    id: idLocal(clientId),
    client_id: clientId,
    descripcion: "",
    ...r,
    ...calcularRegistro(r, sueldoPerfil),
    pendiente: true,
  });

  for (const op of ops) {
    const d = op.datos;
    switch (op.tipo) {
      case "registro_crear":
        registros.push(provisional(d.clientId, d.registro));
        recordarLugar(d.registro.lugar);
        break;
      case "registro_editar":
        registros = registros.map((r) => {
          if (r.id !== d.id) return r;
          const nuevo = { ...r, ...d.registro, sueldo_por_hora: d.registro.sueldo_por_hora ?? r.sueldo_por_hora };
          return { ...nuevo, ...calcularRegistro(nuevo, sueldoPerfil), pendiente: true };
        });
        recordarLugar(d.registro.lugar);
        break;
      case "registro_borrar":
        registros = registros.filter((r) => r.id !== d.id);
        break;
      case "jornada_iniciar":
        jornada = { fecha: d.fecha, hora_entrada: d.hora_entrada, lugar: d.lugar || "", descanso_comida: !!d.descanso_comida, pendiente: true };
        break;
      case "jornada_cambiar":
        if (jornada) jornada = { ...jornada, ...d, pendiente: true };
        break;
      case "jornada_terminar": {
        const j = d.jornada;
        if (j) {
          registros.push(
            provisional(d.clientId, {
              fecha: j.fecha,
              hora_entrada: j.hora_entrada,
              hora_salida: d.hora_salida,
              lugar: j.lugar || "",
              descanso_comida: !!j.descanso_comida,
              sueldo_por_hora: null,
            }),
          );
        }
        jornada = null;
        break;
      }
      case "jornada_descartar":
        jornada = null;
        break;
    }
  }
  return { registros: ordenar(registros), jornada, lugares };
}

/** Frase corta para listar un cambio ("Registro del 2026-09-23 de 08:00 a 17:00") */
export function describirOp(op) {
  const d = op.datos;
  const dia = (iso) => (iso ? iso.split("-").reverse().join("/") : "");
  switch (op.tipo) {
    case "registro_crear":
      return `Registro nuevo del ${dia(d.registro.fecha)}, de ${d.registro.hora_entrada} a ${d.registro.hora_salida}`;
    case "registro_editar":
      return `Cambios en el registro del ${dia(d.registro.fecha)}`;
    case "registro_borrar":
      return "Registro eliminado";
    case "jornada_iniciar":
      return `Jornada empezada a las ${d.hora_entrada}`;
    case "jornada_cambiar":
      return "Cambios en la jornada en curso";
    case "jornada_terminar":
      return `Jornada terminada a las ${d.hora_salida}`;
    case "jornada_descartar":
      return "Jornada descartada";
    default:
      return "Cambio pendiente";
  }
}

/* ---------- Enviar la cola ---------- */
/**
 * Qué ha pasado con una petición fallida:
 *  "red"      sin conexión, tiempo agotado -> reintentar más tarde
 *  "servidor" el servidor está caído o saturado -> reintentar más tarde
 *  "sesion"   la sesión ha caducado -> hay que entrar de nuevo, los cambios se conservan
 *  "rechazo"  el servidor dice que ese cambio no es válido -> no sirve reintentarlo
 */
export function clasificarError(err) {
  const respuesta = err?.response;
  if (!respuesta) return "red";
  const s = respuesta.status;
  if (s === 401 || s === 403) return "sesion";
  if (s === 408 || s === 429 || s >= 500) return "servidor";
  return "rechazo";
}

/**
 * Envía las operaciones una a una y en orden.
 *  - Si falla por red, servidor o sesión se detiene y deja el resto como estaba.
 *  - Si el servidor rechaza un cambio lo aparta y sigue con el siguiente.
 * Devuelve { enviadas, rechazadas: [{ op, err }], parada }.
 */
export async function vaciar(ops, { ejecutar, alEnviar, alRechazar }) {
  const resultado = { enviadas: 0, rechazadas: [], parada: null };
  for (const op of ops) {
    try {
      await ejecutar(op);
    } catch (err) {
      const tipo = clasificarError(err);
      if (tipo === "rechazo") {
        await alRechazar(op, err);
        resultado.rechazadas.push({ op, err });
        continue;
      }
      resultado.parada = tipo;
      break;
    }
    await alEnviar(op);
    resultado.enviadas++;
  }
  return resultado;
}
