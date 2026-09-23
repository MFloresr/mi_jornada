<script setup>
import { computed } from "vue";
import GraficoBarras from "../components/GraficoBarras.vue";
import TarjetaFichar from "../components/TarjetaFichar.vue";
import { estado } from "../store";
import { deLaSemana, delMes, diasRecientes, totales, ultimosDias } from "../metricas";
import { MESES, diaCorto, diaNumero, euros, eurosRedondo, fechaLarga, horas, hoyISO } from "../utils";

const emit = defineEmits(["editar", "nuevo"]);

const hoy = new Date();
const semana = computed(() => totales(deLaSemana(estado.registros)));
const mes = computed(() => totales(delMes(estado.registros, hoy.getFullYear(), hoy.getMonth())));
const recientes = computed(() => diasRecientes(estado.registros, 5));
const barras = computed(() => ultimosDias(estado.registros, 14));

const ultimoRegistro = computed(() => estado.registros[0] || null);

function repetirUltimo() {
  const r = ultimoRegistro.value;
  emit("nuevo", {
    fecha: hoyISO(),
    hora_entrada: r.hora_entrada,
    hora_salida: r.hora_salida,
    lugar: r.lugar,
    descanso_comida: r.descanso_comida,
  });
}

const horario = (d) =>
  d.registros.map((r) => `${r.hora_entrada} – ${r.hora_salida}`).join(" · ") +
  (d.registros.some((r) => r.descanso_comida) ? " · con comida" : "");
const lugares = (d) => [...new Set(d.registros.map((r) => r.lugar))].join(", ");
</script>

<template>
  <main class="mx-auto flex max-w-6xl flex-col gap-5 px-5 pt-7 pb-6 md:px-9 md:pt-8">
    <header class="flex flex-col gap-1">
      <span class="text-sm text-base-content/70">{{ fechaLarga(hoy) }}</span>
      <h1 class="font-display text-3xl font-bold tracking-tight md:text-4xl">Hola, {{ estado.usuario?.nombre }}</h1>
    </header>

    <div class="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
      <div class="col-span-2">
        <TarjetaFichar @revisar="(j) => emit('nuevo', { ...j, desdeJornada: true })" />
      </div>
      <div class="flex flex-col gap-1.5 rounded-[18px] border border-base-300 bg-base-100 p-4 md:p-5">
        <span class="text-[13px] text-base-content/70">Esta semana</span>
        <span class="cifra font-display text-[26px] font-bold md:text-3xl">{{ horas(semana.segundos) }}</span>
        <span class="cifra text-xs text-base-content/70">{{ euros(semana.importe) }}</span>
      </div>
      <div class="flex flex-col gap-1.5 rounded-[18px] bg-accent p-4 text-accent-content md:p-5">
        <span class="text-[13px] first-letter:uppercase">{{ MESES[hoy.getMonth()] }}</span>
        <span class="cifra font-display text-[26px] font-bold md:text-3xl">{{ eurosRedondo(mes.importe) }}</span>
        <span class="cifra text-xs">{{ horas(mes.segundos) }} · {{ mes.dias }} días</span>
      </div>
    </div>

    <div class="grid gap-4 md:grid-cols-5">
      <section class="hidden flex-col gap-4 rounded-[20px] border border-base-300 bg-base-100 p-5 md:col-span-2 md:flex">
        <h2 class="text-base font-bold">Horas por día · últimas 2 semanas</h2>
        <GraficoBarras :dias="barras" />
      </section>

      <section aria-labelledby="t-recientes" class="flex flex-col gap-2.5 md:col-span-3">
        <div class="flex items-center justify-between">
          <h2 id="t-recientes" class="text-[17px] font-bold">Últimos días</h2>
          <div class="flex items-center gap-4">
            <button v-if="ultimoRegistro" class="text-sm font-semibold text-enlace" @click="repetirUltimo">Repetir el último</button>
            <a href="#/registros" class="hidden text-sm font-semibold text-enlace md:inline">Ver todos</a>
          </div>
        </div>

        <div v-if="!recientes.length" class="rounded-[18px] border border-dashed border-base-300 bg-base-100 p-6 text-center text-sm text-base-content/70">
          Aún no hay registros. Ficha tu jornada o pulsa <strong>+</strong> para añadir uno.
        </div>

        <ul v-else class="flex flex-col overflow-hidden rounded-[18px] border border-base-300 bg-base-100">
          <li v-for="d in recientes" :key="d.fecha" class="border-b border-base-300 last:border-b-0">
            <button
              class="flex w-full items-center gap-3.5 px-4 py-3.5 text-left hover:bg-base-200/60"
              :aria-label="`Editar ${diaCorto(d.fecha)} ${diaNumero(d.fecha)}`"
              @click="emit('editar', d.registros[0])"
            >
              <span class="flex w-11 flex-col items-center">
                <span class="text-xs text-base-content/70 uppercase">{{ diaCorto(d.fecha) }}</span>
                <span class="cifra text-xl font-bold">{{ diaNumero(d.fecha) }}</span>
              </span>
              <span class="flex min-w-0 flex-1 flex-col gap-0.5">
                <span class="truncate text-[15px] font-semibold">{{ lugares(d) }}</span>
                <span class="cifra truncate text-[13px] text-base-content/70">{{ horario(d) }}</span>
              </span>
              <span class="flex flex-col items-end gap-0.5">
                <span class="cifra text-[15px] font-bold">{{ horas(d.segundos) }}</span>
                <span class="cifra text-[13px] text-dinero">{{ euros(d.importe) }}</span>
              </span>
            </button>
          </li>
        </ul>
      </section>
    </div>
  </main>
</template>
