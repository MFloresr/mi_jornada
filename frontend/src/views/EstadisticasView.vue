<script setup>
import { computed, ref } from "vue";
import GraficoBarras from "../components/GraficoBarras.vue";
import Icono from "../components/Icono.vue";
import { estado } from "../store";
import { delMes, porDia, porLugar, totales } from "../metricas";
import { MESES, aFecha, euros, eurosRedondo, horas, isoFecha } from "../utils";

const hoy = new Date();
const anio = ref(hoy.getFullYear());
const mes = ref(hoy.getMonth());

function moverMes(delta) {
  const d = new Date(anio.value, mes.value + delta, 1);
  anio.value = d.getFullYear();
  mes.value = d.getMonth();
}

const delPeriodo = computed(() => delMes(estado.registros, anio.value, mes.value));
const resumen = computed(() => totales(delPeriodo.value));
const media = computed(() => (resumen.value.dias ? resumen.value.segundos / resumen.value.dias : 0));
const lugares = computed(() => porLugar(delPeriodo.value));
const maxLugar = computed(() => Math.max(1, ...lugares.value.map((l) => l.segundos)));

const diasMes = computed(() => {
  const mapa = porDia(delPeriodo.value);
  const total = new Date(anio.value, mes.value + 1, 0).getDate();
  return Array.from({ length: total }, (_, i) => {
    const iso = isoFecha(new Date(anio.value, mes.value, i + 1));
    return { fecha: iso, segundos: mapa[iso]?.segundos || 0, finde: [0, 6].includes(aFecha(iso).getDay()) };
  });
});
const diasLargos = computed(() => diasMes.value.filter((d) => d.segundos / 3600 > 10).length);
const findes = computed(() => diasMes.value.filter((d) => d.finde && d.segundos).length);
</script>

<template>
  <main class="mx-auto flex max-w-5xl flex-col gap-5 px-5 pt-7 pb-6 md:px-9 md:pt-8">
    <header class="flex items-center justify-between gap-3">
      <div class="flex flex-col gap-1">
        <span class="text-sm text-base-content/70">Estadísticas</span>
        <h1 class="font-display text-3xl font-bold first-letter:uppercase">
          {{ MESES[mes] }} <span class="font-semibold text-base-content/60">{{ anio }}</span>
        </h1>
      </div>
      <div class="flex gap-1.5">
        <button class="btn btn-circle border-base-300 bg-base-100" aria-label="Mes anterior" @click="moverMes(-1)"><Icono nombre="atras" :tam="18" grosor="2" /></button>
        <button class="btn btn-circle border-base-300 bg-base-100" aria-label="Mes siguiente" @click="moverMes(1)"><Icono nombre="adelante" :tam="18" grosor="2" /></button>
      </div>
    </header>

    <div class="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
      <div class="flex flex-col gap-1.5 rounded-[18px] border border-base-300 bg-base-100 p-4">
        <span class="text-[13px] text-base-content/70">Horas</span>
        <span class="cifra font-display text-[26px] font-bold">{{ horas(resumen.segundos) }}</span>
      </div>
      <div class="flex flex-col gap-1.5 rounded-[18px] bg-accent p-4 text-accent-content">
        <span class="text-[13px]">Ganado</span>
        <span class="cifra font-display text-[26px] font-bold">{{ eurosRedondo(resumen.importe) }}</span>
      </div>
      <div class="flex flex-col gap-1.5 rounded-[18px] border border-base-300 bg-base-100 p-4">
        <span class="text-[13px] text-base-content/70">Días trabajados</span>
        <span class="cifra font-display text-[26px] font-bold">{{ resumen.dias }}</span>
      </div>
      <div class="flex flex-col gap-1.5 rounded-[18px] border border-base-300 bg-base-100 p-4">
        <span class="text-[13px] text-base-content/70">Media por día</span>
        <span class="cifra font-display text-[26px] font-bold">{{ horas(media) }}</span>
      </div>
    </div>

    <section class="flex flex-col gap-4 rounded-[20px] border border-base-300 bg-base-100 p-4 md:p-5">
      <h2 class="text-base font-bold">Horas por día</h2>
      <div class="-mx-1 overflow-x-auto px-1">
        <div class="min-w-[560px]">
          <GraficoBarras :dias="diasMes" :mostrar-dia-semana="false" />
        </div>
      </div>
      <p v-if="diasLargos || findes" class="text-sm text-base-content/70">
        <template v-if="diasLargos">{{ diasLargos }} {{ diasLargos === 1 ? "día" : "días" }} de más de 10 h. </template>
        <template v-if="findes">{{ findes }} {{ findes === 1 ? "día" : "días" }} en fin de semana.</template>
      </p>
    </section>

    <section class="flex flex-col gap-3 rounded-[20px] border border-base-300 bg-base-100 p-4 md:p-5">
      <h2 class="text-base font-bold">Por lugar</h2>
      <p v-if="!lugares.length" class="text-sm text-base-content/70">No hay registros este mes.</p>
      <div v-for="l in lugares" :key="l.lugar" class="flex flex-col gap-1.5">
        <div class="flex items-baseline justify-between gap-3 text-sm">
          <span class="font-semibold">{{ l.lugar }}</span>
          <span class="cifra">{{ horas(l.segundos) }} · <span class="text-dinero">{{ euros(l.importe) }}</span></span>
        </div>
        <div class="h-2.5 overflow-hidden rounded-full bg-base-200">
          <div class="h-full rounded-full bg-primary" :style="{ width: `${(l.segundos / maxLugar) * 100}%` }"></div>
        </div>
      </div>
    </section>
  </main>
</template>
