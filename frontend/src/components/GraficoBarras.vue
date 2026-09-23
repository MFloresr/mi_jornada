<script setup>
// Barras de horas por día con la línea de referencia de 8 h
import { computed } from "vue";
import { diaCorto, diaNumero } from "../utils";

const props = defineProps({
  // [{ fecha, segundos, finde }]
  dias: { type: Array, required: true },
  referenciaHoras: { type: Number, default: 8 },
  mostrarDiaSemana: { type: Boolean, default: true },
});

const maximo = computed(() =>
  Math.max(props.referenciaHoras + 2, ...props.dias.map((d) => d.segundos / 3600)),
);
const altura = (s) => `${Math.round((s / 3600 / maximo.value) * 100)}%`;
const lineaRef = computed(() => `${(props.referenciaHoras / maximo.value) * 100}%`);
const etiqueta = (s) => (s ? String(Math.round((s / 3600) * 10) / 10).replace(".", ",") : "");
const resumen = computed(() =>
  props.dias
    .filter((d) => d.segundos)
    .map((d) => `${diaCorto(d.fecha)} ${diaNumero(d.fecha)}: ${etiqueta(d.segundos)} h`)
    .join(", "),
);
</script>

<template>
  <figure class="m-0 flex flex-col gap-2">
    <div class="relative flex h-44 items-end gap-1.5 border-b border-base-300" role="img" :aria-label="`Horas por día. ${resumen || 'Sin registros'}`">
      <span class="pointer-events-none absolute inset-x-0 border-t border-dashed border-base-content/30" :style="{ bottom: lineaRef }"></span>
      <div v-for="d in dias" :key="d.fecha" class="flex h-full flex-1 flex-col items-center justify-end gap-1">
        <span class="cifra text-[11px] text-base-content/70">{{ etiqueta(d.segundos) }}</span>
        <span
          class="w-full rounded-t-md"
          :class="d.segundos / 3600 > referenciaHoras ? 'bg-primary' : 'bg-primary/60'"
          :style="{ height: altura(d.segundos) }"
        ></span>
      </div>
    </div>
    <div class="flex gap-1.5 text-center text-[11px] text-base-content/70" aria-hidden="true">
      <span v-for="d in dias" :key="d.fecha" class="flex-1 leading-tight" :class="d.finde && 'opacity-60'">
        <template v-if="mostrarDiaSemana">{{ diaCorto(d.fecha).charAt(0) }}<br /></template>{{ diaNumero(d.fecha) }}
      </span>
    </div>
    <figcaption class="text-xs text-base-content/70">Línea discontinua: jornada de {{ referenciaHoras }} h</figcaption>
  </figure>
</template>
