<script setup>
import { computed, ref } from "vue";
import Icono from "../components/Icono.vue";
import { estado } from "../store";
import { delMes, porDia, totales } from "../metricas";
import { MESES, diaYNumero, euros, eurosRedondo, horas, hoyISO, isoFecha } from "../utils";

const emit = defineEmits(["editar", "nuevo"]);

const hoy = new Date();
const anio = ref(hoy.getFullYear());
const mes = ref(hoy.getMonth());
const seleccionado = ref(hoyISO());

function moverMes(delta) {
  const d = new Date(anio.value, mes.value + delta, 1);
  anio.value = d.getFullYear();
  mes.value = d.getMonth();
}

const dias = computed(() => porDia(estado.registros));
const resumenMes = computed(() => totales(delMes(estado.registros, anio.value, mes.value)));

/** Celdas del mes empezando en lunes (null = hueco) */
const celdas = computed(() => {
  const primero = new Date(anio.value, mes.value, 1);
  const huecos = (primero.getDay() + 6) % 7;
  const total = new Date(anio.value, mes.value + 1, 0).getDate();
  const res = Array(huecos).fill(null);
  for (let d = 1; d <= total; d++) {
    const iso = isoFecha(new Date(anio.value, mes.value, d));
    res.push({ iso, num: d, segundos: dias.value[iso]?.segundos || 0 });
  }
  while (res.length % 7) res.push(null);
  return res;
});

const detalle = computed(() => dias.value[seleccionado.value] || null);

const horasCorta = (s) => `${String(Math.round((s / 3600) * 10) / 10).replace(".", ",")} h`;

function clasesCelda(c) {
  const sel = c.iso === seleccionado.value;
  const esHoy = c.iso === hoyISO();
  const lleno = c.segundos / 3600 > 8;
  return [
    c.segundos ? (lleno ? "bg-primary text-primary-content" : "bg-secondary text-secondary-content") : "hover:bg-base-200",
    sel ? "ring-2 ring-base-content ring-offset-1 ring-offset-base-100" : "",
    esHoy && !sel ? "outline-2 outline-dashed outline-primary -outline-offset-2" : "",
  ];
}

function duplicar(r) {
  emit("nuevo", { ...r, id: undefined, fecha: hoyISO() });
}
</script>

<template>
  <main class="mx-auto flex max-w-5xl flex-col gap-5 px-5 pt-7 pb-6 md:px-9 md:pt-8">
    <header class="flex items-center justify-between gap-3">
      <h1 class="font-display text-3xl font-bold first-letter:uppercase">
        {{ MESES[mes] }} <span class="font-semibold text-base-content/60">{{ anio }}</span>
      </h1>
      <div class="flex gap-1.5">
        <button class="btn btn-circle border-base-300 bg-base-100" aria-label="Mes anterior" @click="moverMes(-1)"><Icono nombre="atras" :tam="18" grosor="2" /></button>
        <button class="btn btn-circle border-base-300 bg-base-100" aria-label="Mes siguiente" @click="moverMes(1)"><Icono nombre="adelante" :tam="18" grosor="2" /></button>
      </div>
    </header>

    <div class="grid gap-5 md:grid-cols-5">
      <section aria-label="Días del mes" class="flex flex-col gap-1.5 rounded-[20px] border border-base-300 bg-base-100 px-2.5 py-3.5 md:col-span-3 md:p-5">
        <div class="grid grid-cols-7 text-center text-xs font-semibold text-base-content/70" aria-hidden="true">
          <span>L</span><span>M</span><span>X</span><span>J</span><span>V</span><span>S</span><span>D</span>
        </div>
        <div class="grid grid-cols-7 gap-1 md:gap-1.5">
          <template v-for="(c, i) in celdas" :key="c?.iso || `h${i}`">
            <span v-if="!c"></span>
            <button
              v-else
              class="flex h-12.5 flex-col items-center justify-center gap-0.5 rounded-xl transition-colors md:h-16"
              :class="clasesCelda(c)"
              :aria-pressed="c.iso === seleccionado"
              :aria-label="`${diaYNumero(c.iso)}${c.segundos ? `, ${horasCorta(c.segundos)}` : ', sin registros'}`"
              @click="seleccionado = c.iso"
            >
              <span class="cifra text-[15px] font-semibold">{{ c.num }}</span>
              <span v-if="c.segundos" class="cifra text-[11px] font-semibold opacity-85">{{ horasCorta(c.segundos) }}</span>
            </button>
          </template>
        </div>
        <div class="flex gap-3.5 px-1.5 pt-1.5 text-xs text-base-content/70">
          <span class="flex items-center gap-1.5"><span class="size-2.5 rounded-[3px] bg-secondary"></span>Hasta 8 h</span>
          <span class="flex items-center gap-1.5"><span class="size-2.5 rounded-[3px] bg-primary"></span>Más de 8 h</span>
        </div>
      </section>

      <div class="flex flex-col gap-5 md:col-span-2">
        <section aria-live="polite" class="flex flex-col gap-3 rounded-[20px] border border-base-300 bg-base-100 p-4 md:p-5">
          <div class="flex items-baseline justify-between gap-3">
            <h2 class="text-[17px] font-bold first-letter:uppercase">{{ diaYNumero(seleccionado) }}</h2>
            <span v-if="detalle" class="cifra text-[15px] font-bold">
              {{ horas(detalle.segundos) }} · <span class="text-dinero">{{ euros(detalle.importe) }}</span>
            </span>
          </div>

          <template v-if="detalle">
            <div v-for="r in detalle.registros" :key="r.id" class="flex flex-col gap-2.5 border-t border-base-300 pt-3 first-of-type:border-t-0 first-of-type:pt-0">
              <span class="cifra text-sm text-base-content/70">
                {{ r.hora_entrada }} – {{ r.hora_salida }} · {{ r.lugar }}{{ r.descanso_comida ? " · con comida" : "" }}
              </span>
              <p v-if="r.descripcion" class="text-sm">{{ r.descripcion }}</p>
              <div class="flex gap-2">
                <button class="btn h-11 flex-1 rounded-xl border-base-300 bg-base-100" @click="emit('editar', r)">Editar</button>
                <button class="btn h-11 flex-1 rounded-xl border-base-300 bg-base-100" @click="duplicar(r)">
                  <Icono nombre="copiar" :tam="16" />Duplicar
                </button>
              </div>
            </div>
          </template>
          <template v-else>
            <p class="text-sm text-base-content/70">No hay registros este día.</p>
            <button class="btn h-11 rounded-xl border-base-300 bg-base-100" @click="emit('nuevo', { fecha: seleccionado })">
              <Icono nombre="mas" :tam="18" />Añadir registro este día
            </button>
          </template>
        </section>

        <div class="grid grid-cols-3 gap-2.5 text-center">
          <div class="flex flex-col gap-0.5"><span class="cifra text-xl font-bold">{{ horas(resumenMes.segundos) }}</span><span class="text-xs text-base-content/70">trabajadas</span></div>
          <div class="flex flex-col gap-0.5"><span class="cifra text-xl font-bold">{{ resumenMes.dias }}</span><span class="text-xs text-base-content/70">días</span></div>
          <div class="flex flex-col gap-0.5"><span class="cifra text-xl font-bold text-dinero">{{ eurosRedondo(resumenMes.importe) }}</span><span class="text-xs text-base-content/70">ganado</span></div>
        </div>
      </div>
    </div>
  </main>
</template>
