// Pruebas de la cola de cambios sin conexión: node --test tests/
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  aplicar,
  aplicarPlan,
  calcularRegistro,
  clasificarError,
  describirOp,
  esLocal,
  idLocal,
  nuevaOp,
  planificar,
  validarRegistro,
  vaciar,
} from "../src/offline/cola.js";

const U = "ana@example.com";
const reg = (extra = {}) => ({
  fecha: "2026-09-23",
  hora_entrada: "08:00",
  hora_salida: "17:00",
  lugar: "Obra",
  descanso_comida: true,
  descripcion: "",
  sueldo_por_hora: null,
  ...extra,
});
const crear = (clientId, registro = reg()) => nuevaOp("registro_crear", { clientId, registro }, U);

/** Añade una operación a la cola como lo hace la aplicación */
function anadir(cola, op) {
  return aplicarPlan(cola, planificar(cola, op));
}

describe("cálculo y validación", () => {
  it("calcula las horas y el importe como el servidor", () => {
    const c = calcularRegistro(reg(), 12);
    assert.equal(c.duracion_total, 9 * 3600);
    assert.equal(c.duracion_trabajada, 8 * 3600);
    assert.equal(c.sueldo_registro, 96);
  });

  it("usa el sueldo propio del registro si lo tiene", () => {
    assert.equal(calcularRegistro(reg({ sueldo_por_hora: 20 }), 12).sueldo_registro, 160);
  });

  it("rechaza lo mismo que el servidor", () => {
    assert.match(validarRegistro(reg({ hora_salida: "07:00" })), /posterior/);
    assert.match(validarRegistro(reg({ hora_entrada: "08:00", hora_salida: "09:00" })), /1 h/);
    assert.match(validarRegistro(reg({ fecha: "" })), /Indica/);
    assert.equal(validarRegistro(reg()), null);
    assert.equal(validarRegistro(reg({ hora_salida: "09:00", descanso_comida: false })), null);
  });
});

describe("compactar la cola", () => {
  it("editar un registro que aún no se ha enviado cambia el registro nuevo", () => {
    let cola = anadir([], crear("a1"));
    cola = anadir(cola, nuevaOp("registro_editar", { id: idLocal("a1"), registro: reg({ hora_salida: "18:00" }) }, U));
    assert.equal(cola.length, 1);
    assert.equal(cola[0].tipo, "registro_crear");
    assert.equal(cola[0].datos.registro.hora_salida, "18:00");
  });

  it("borrar un registro que aún no se ha enviado lo quita de la cola", () => {
    let cola = anadir([], crear("a1"));
    cola = anadir(cola, nuevaOp("registro_borrar", { id: idLocal("a1") }, U));
    assert.deepEqual(cola, []);
  });

  it("varias ediciones del mismo registro del servidor se quedan en una", () => {
    let cola = anadir([], nuevaOp("registro_editar", { id: 7, registro: reg({ lugar: "A" }) }, U));
    cola = anadir(cola, nuevaOp("registro_editar", { id: 7, registro: reg({ lugar: "B" }) }, U));
    assert.equal(cola.length, 1);
    assert.equal(cola[0].datos.registro.lugar, "B");
  });

  it("borrar tras editar deja solo el borrado, y no se repite", () => {
    let cola = anadir([], nuevaOp("registro_editar", { id: 7, registro: reg() }, U));
    cola = anadir(cola, nuevaOp("registro_borrar", { id: 7 }, U));
    cola = anadir(cola, nuevaOp("registro_borrar", { id: 7 }, U));
    assert.deepEqual(cola.map((o) => o.tipo), ["registro_borrar"]);
  });

  it("los cambios de la jornada se juntan con el inicio pendiente", () => {
    let cola = anadir([], nuevaOp("jornada_iniciar", { fecha: "2026-09-23", hora_entrada: "08:00", lugar: "", descanso_comida: false }, U));
    cola = anadir(cola, nuevaOp("jornada_cambiar", { descanso_comida: true }, U));
    assert.equal(cola.length, 1);
    assert.equal(cola[0].datos.descanso_comida, true);
  });

  it("descartar una jornada que nunca se envió no envía nada", () => {
    let cola = anadir([], nuevaOp("jornada_iniciar", { fecha: "2026-09-23", hora_entrada: "08:00", lugar: "" }, U));
    cola = anadir(cola, nuevaOp("jornada_descartar", {}, U));
    assert.deepEqual(cola, []);
  });

  it("descartar una jornada que sí está en el servidor se envía una sola vez", () => {
    let cola = anadir([], nuevaOp("jornada_descartar", {}, U));
    cola = anadir(cola, nuevaOp("jornada_descartar", {}, U));
    assert.equal(cola.length, 1);
  });

  it("empezar y terminar sin conexión el mismo día se convierte en un registro", () => {
    let cola = anadir([], nuevaOp("jornada_iniciar", { fecha: "2026-09-23", hora_entrada: "08:05", lugar: "Obra", descanso_comida: false }, U));
    cola = anadir(cola, nuevaOp("jornada_cambiar", { descanso_comida: true }, U));
    cola = anadir(
      cola,
      nuevaOp("jornada_terminar", { clientId: "c9", fecha: "2026-09-23", hora_salida: "17:10", jornada: {} }, U),
    );
    assert.equal(cola.length, 1);
    const [op] = cola;
    assert.equal(op.tipo, "registro_crear");
    assert.equal(op.datos.clientId, "c9");
    assert.deepEqual(
      [op.datos.registro.hora_entrada, op.datos.registro.hora_salida, op.datos.registro.lugar, op.datos.registro.descanso_comida],
      ["08:05", "17:10", "Obra", true],
    );
  });

  it("si la jornada ya está en el servidor, terminar se envía como terminar", () => {
    const cola = anadir([], nuevaOp("jornada_terminar", { clientId: "c9", fecha: "2026-09-23", hora_salida: "17:10", jornada: {} }, U));
    assert.deepEqual(cola.map((o) => o.tipo), ["jornada_terminar"]);
  });

  it("mantiene el orden en que se hicieron los cambios", () => {
    let cola = anadir([], crear("a1"));
    cola = anadir(cola, nuevaOp("registro_borrar", { id: 3 }, U));
    cola = anadir(cola, crear("a2"));
    assert.deepEqual(cola.map((o) => o.tipo), ["registro_crear", "registro_borrar", "registro_crear"]);
    assert.deepEqual(cola.map((o) => o.orden), [...cola.map((o) => o.orden)].sort((a, b) => a - b));
  });
});

describe("lo que se ve en pantalla", () => {
  const servidor = {
    registros: [
      { id: 1, fecha: "2026-09-22", hora_entrada: "08:00", hora_salida: "16:00", lugar: "Taller", descanso_comida: false, sueldo_por_hora: 12, duracion_trabajada: 28800, sueldo_registro: 96 },
    ],
    jornada: null,
    lugares: ["Taller"],
  };

  it("muestra un registro nuevo como pendiente y calcula su importe", () => {
    const v = aplicar(servidor, [crear("a1")], 12);
    assert.equal(v.registros.length, 2);
    assert.equal(v.registros[0].id, idLocal("a1")); // el más reciente primero
    assert.ok(esLocal(v.registros[0].id));
    assert.equal(v.registros[0].pendiente, true);
    assert.equal(v.registros[0].sueldo_registro, 96);
    assert.equal(v.lugares[0], "Obra");
  });

  it("no modifica lo que mandó el servidor", () => {
    aplicar(servidor, [crear("a1"), nuevaOp("registro_borrar", { id: 1 }, U)], 12);
    assert.equal(servidor.registros.length, 1);
    assert.equal(servidor.registros[0].pendiente, undefined);
  });

  it("oculta un registro borrado y recalcula uno editado", () => {
    const editado = aplicar(servidor, [nuevaOp("registro_editar", { id: 1, registro: reg({ fecha: "2026-09-22", hora_salida: "17:00", descanso_comida: false, sueldo_por_hora: 12 }) }, U)], 12);
    assert.equal(editado.registros[0].duracion_trabajada, 9 * 3600);
    assert.equal(editado.registros[0].pendiente, true);
    assert.equal(aplicar(servidor, [nuevaOp("registro_borrar", { id: 1 }, U)], 12).registros.length, 0);
  });

  it("empezar y terminar la jornada se ven como jornada en curso y luego como registro", () => {
    const empezada = aplicar(servidor, [nuevaOp("jornada_iniciar", { fecha: "2026-09-23", hora_entrada: "08:00", lugar: "Obra" }, U)], 12);
    assert.equal(empezada.jornada.hora_entrada, "08:00");
    assert.equal(empezada.jornada.pendiente, true);

    const terminada = aplicar(
      { ...servidor, jornada: { fecha: "2026-09-23", hora_entrada: "08:00", lugar: "Obra", descanso_comida: false } },
      [nuevaOp("jornada_terminar", { clientId: "j1", fecha: "2026-09-23", hora_salida: "16:30", jornada: { fecha: "2026-09-23", hora_entrada: "08:00", lugar: "Obra", descanso_comida: false } }, U)],
      12,
    );
    assert.equal(terminada.jornada, null);
    assert.equal(terminada.registros[0].hora_salida, "16:30");
  });

  it("cambiar o descartar la jornada del servidor se refleja", () => {
    const base = { ...servidor, jornada: { fecha: "2026-09-23", hora_entrada: "08:00", lugar: "", descanso_comida: false } };
    assert.equal(aplicar(base, [nuevaOp("jornada_cambiar", { descanso_comida: true }, U)]).jornada.descanso_comida, true);
    assert.equal(aplicar(base, [nuevaOp("jornada_descartar", {}, U)]).jornada, null);
  });

  it("describe los cambios con palabras", () => {
    assert.match(describirOp(crear("a1")), /23\/09\/2026.*08:00 a 17:00/);
    assert.match(describirOp(nuevaOp("jornada_terminar", { hora_salida: "17:10" }, U)), /17:10/);
  });
});

describe("enviar la cola", () => {
  const sinRespuesta = () => Object.assign(new Error("Network Error"), { code: "ERR_NETWORK" });
  const conEstado = (status) => Object.assign(new Error("HTTP"), { response: { status } });

  it("clasifica los errores", () => {
    assert.equal(clasificarError(sinRespuesta()), "red");
    assert.equal(clasificarError(conEstado(401)), "sesion");
    assert.equal(clasificarError(conEstado(403)), "sesion");
    assert.equal(clasificarError(conEstado(503)), "servidor");
    assert.equal(clasificarError(conEstado(429)), "servidor");
    assert.equal(clasificarError(conEstado(400)), "rechazo");
    assert.equal(clasificarError(conEstado(409)), "rechazo");
  });

  function entorno(falla = {}) {
    const hecho = [];
    const rechazadas = [];
    return {
      hecho,
      rechazadas,
      opciones: {
        ejecutar: async (op) => {
          if (falla[op.datos.clientId]) throw falla[op.datos.clientId];
          hecho.push(op.datos.clientId);
        },
        alEnviar: async () => {},
        alRechazar: async (op) => rechazadas.push(op.datos.clientId),
      },
    };
  }

  it("envía todo en orden", async () => {
    const e = entorno();
    const r = await vaciar([crear("a"), crear("b"), crear("c")], e.opciones);
    assert.deepEqual(e.hecho, ["a", "b", "c"]);
    assert.deepEqual([r.enviadas, r.parada], [3, null]);
  });

  it("si se corta la conexión se detiene y no se salta nada", async () => {
    const e = entorno({ b: sinRespuesta() });
    const r = await vaciar([crear("a"), crear("b"), crear("c")], e.opciones);
    assert.deepEqual(e.hecho, ["a"]);
    assert.deepEqual([r.enviadas, r.parada], [1, "red"]);
  });

  it("si el servidor rechaza un cambio lo aparta y sigue con los demás", async () => {
    const e = entorno({ b: conEstado(400) });
    const r = await vaciar([crear("a"), crear("b"), crear("c")], e.opciones);
    assert.deepEqual(e.hecho, ["a", "c"]);
    assert.deepEqual(e.rechazadas, ["b"]);
    assert.deepEqual([r.enviadas, r.rechazadas.length, r.parada], [2, 1, null]);
  });

  it("si la sesión ha caducado se detiene y conserva el resto", async () => {
    const e = entorno({ a: conEstado(401) });
    const r = await vaciar([crear("a"), crear("b")], e.opciones);
    assert.deepEqual(e.hecho, []);
    assert.equal(r.parada, "sesion");
  });
});
