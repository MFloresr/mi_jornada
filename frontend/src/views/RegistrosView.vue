<script setup>
import { computed, ref } from "vue";
import Icono from "../components/Icono.vue";
import { estado } from "../store";
import { totales } from "../metricas";
import { MESES, aFecha, diaCorto, diaNumero, euros, horas } from "../utils";

const emit = defineEmits(["editar"]);

const filtroMes = ref(""); // "2026-09" o "" (todos)
const filtroLugar = ref("");

const mesesDisponibles = computed(() => {
  const claves = [...new Set(estado.registros.map((r) => r.fecha.slice(0, 7)))].sort().reverse();
  return claves.map((k) => {
    const [y, m] = k.split("-").map(Number);
    const nombre = MESES[m - 1];
    return { valor: k, texto: `${nombre[0].toUpperCase()}${nombre.slice(1)} ${y}` };
  });
});
const lugaresDisponibles = computed(() => [...new Set(estado.registros.map((r) => r.lugar).filter(Boolean))].sort());

const filtrados = computed(() =>
  estado.registros.filter(
    (r) => (!filtroMes.value || r.fecha.startsWith(filtroMes.value)) && (!filtroLugar.value || r.lugar === filtroLugar.value),
  ),
);
const resumen = computed(() => totales(filtrados.value));

/** Agrupa por mes para la lista */
const grupos = computed(() => {
  const res = [];
  for (const r of filtrados.value) {
    const clave = r.fecha.slice(0, 7);
    let g = res[res.length - 1];
    if (!g || g.clave !== clave) {
      const d = aFecha(r.fecha);
      g = { clave, titulo: `${MESES[d.getMonth()]} ${d.getFullYear()}`, registros: [] };
      res.push(g);
    }
    g.registros.push(r);
  }
  return res;
});

function exportarCSV() {
  const cab = ["Fecha", "Entrada", "Salida", "Comida", "Horas", "Lugar", "Descripción", "€/h", "Importe"];
  const num = (v) => String(Math.round(v * 100) / 100).replace(".", ",");
  const celda = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const filas = filtrados.value.map((r) => [
    r.fecha,
    r.hora_entrada,
    r.hora_salida,
    r.descanso_comida ? "Sí" : "No",
    num(r.duracion_trabajada / 3600),
    r.lugar,
    r.descripcion,
    num(r.sueldo_por_hora),
    num(r.sueldo_registro),
  ]);
  // Punto y coma y BOM para que Excel en español lo abra bien
  const csv = "﻿" + [cab, ...filas].map((f) => f.map(celda).join(";")).join("\r\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `mi-jornada${filtroMes.value ? "-" + filtroMes.value : ""}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
</script>

<template>
  <main class="mx-auto flex max-w-5xl flex-col gap-5 px-5 pt-7 pb-6 md:px-9 md:pt-8">
    <header class="flex flex-wrap items-end justify-between gap-3">
      <h1 class="font-display text-3xl font-bold">Registros</h1>
      <button class="btn h-11 rounded-xl border-base-300 bg-base-100" :disabled="!filtrados.length" @click="exportarCSV">
        <Icono nombre="descargar" :tam="18" />Exportar CSV
      </button>
    </header>

    <div class="grid grid-cols-2 gap-3">
      <label class="flex flex-col gap-1.5 text-sm font-semibold">
        Mes
        <select v-model="filtroMes" class="select h-11 w-full bg-base-100 font-normal">
          <option value="">Todos</option>
          <option v-for="m in mesesDisponibles" :key="m.valor" :value="m.valor">{{ m.texto }}</option>
        </select>
      </label>
      <label class="flex flex-col gap-1.5 text-sm font-semibold">
        Lugar
        <select v-model="filtroLugar" class="select h-11 w-full bg-base-100 font-normal">
          <option value="">Todos</option>
          <option v-for="l in lugaresDisponibles" :key="l" :value="l">{{ l }}</option>
        </select>
      </label>
    </div>

    <p class="cifra text-sm text-base-content/70">
      {{ filtrados.length }} registros · {{ horas(resumen.segundos) }} ·
      <span class="font-semibold text-dinero">{{ euros(resumen.importe) }}</span>
    </p>

    <div v-if="!filtrados.length" class="rounded-[18px] border border-dashed border-base-300 bg-base-100 p-6 text-center text-sm text-base-content/70">
      No hay registros con estos filtros.
    </div>

    <section v-for="g in grupos" :key="g.clave" class="flex flex-col gap-2">
      <h2 class="text-sm font-bold text-base-content/70 uppercase">{{ g.titulo }}</h2>
      <ul class="overflow-hidden rounded-[18px] border border-base-300 bg-base-100">
        <li v-for="r in g.registros" :key="r.id" class="border-b border-base-300 last:border-b-0">
          <button class="flex w-full items-center gap-3.5 px-4 py-3 text-left hover:bg-base-200/60" @click="emit('editar', r)">
            <span class="flex w-11 flex-col items-center">
              <span class="text-xs text-base-content/70 uppercase">{{ diaCorto(r.fecha) }}</span>
              <span class="cifra text-lg font-bold">{{ diaNumero(r.fecha) }}</span>
            </span>
            <span class="flex min-w-0 flex-1 flex-col gap-0.5">
              <span class="truncate text-[15px] font-semibold">{{ r.lugar || "Sin lugar" }}</span>
              <span class="cifra truncate text-[13px] text-base-content/70">
                {{ r.hora_entrada }} – {{ r.hora_salida }}{{ r.descanso_comida ? " · con comida" : "" }}{{ r.descripcion ? ` · ${r.descripcion}` : "" }}
              </span>
            </span>
            <span class="flex flex-col items-end gap-0.5">
              <span class="cifra text-[15px] font-bold">{{ horas(r.duracion_trabajada) }}</span>
              <span class="cifra text-[13px] text-dinero">{{ euros(r.sueldo_registro) }}</span>
            </span>
          </button>
        </li>
      </ul>
    </section>
  </main>
</template>
