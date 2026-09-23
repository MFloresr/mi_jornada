<script setup>
// Tarjeta para fichar: empezar la jornada, ver el tiempo que llevas y terminarla
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import Icono from "./Icono.vue";
import {
  avisar,
  cambiarJornada,
  descartarJornada,
  empezarJornada,
  estado,
  terminarJornada,
} from "../store";
import { aFecha, euros, horasMinutos, mensajeError } from "../utils";

const emit = defineEmits(["revisar"]);

const ahora = ref(Date.now());
let reloj = null;
onMounted(() => (reloj = setInterval(() => (ahora.value = Date.now()), 15000)));
onBeforeUnmount(() => clearInterval(reloj));

const jornada = computed(() => estado.jornada);
const lugarNuevo = ref(estado.lugares[0] || "");
const ocupado = ref(false);

const segundos = computed(() => {
  if (!jornada.value) return 0;
  const inicio = aFecha(jornada.value.fecha);
  const [h, m] = jornada.value.hora_entrada.split(":").map(Number);
  inicio.setHours(h, m, 0, 0);
  const s = Math.max(0, (ahora.value - inicio.getTime()) / 1000);
  return jornada.value.descanso_comida ? Math.max(0, s - 3600) : s;
});
const llevas = computed(() => (segundos.value / 3600) * (estado.usuario?.sueldo_por_hora || 0));

async function accion(fn, textoError) {
  ocupado.value = true;
  try {
    await fn();
  } catch (err) {
    avisar(mensajeError(err, textoError), "error");
  } finally {
    ocupado.value = false;
  }
}

const empezar = () =>
  accion(async () => {
    await empezarJornada(lugarNuevo.value.trim());
    avisar("Jornada empezada");
  }, "No se pudo empezar la jornada");

const terminar = () =>
  accion(async () => {
    const revisar = await terminarJornada();
    if (revisar) {
      avisar(revisar.detail, "error");
      emit("revisar", revisar.activa);
    } else {
      avisar("Jornada guardada");
    }
  }, "No se pudo terminar la jornada");

const alternarComida = () =>
  accion(() => cambiarJornada({ descanso_comida: !jornada.value.descanso_comida }), "No se pudo cambiar");

const descartar = () => {
  if (!confirm("¿Descartar la jornada en curso sin guardarla?")) return;
  accion(async () => {
    await descartarJornada();
    avisar("Jornada descartada");
  }, "No se pudo descartar");
};
</script>

<template>
  <!-- Jornada en curso -->
  <section
    v-if="jornada"
    aria-label="Jornada en curso"
    class="flex h-full flex-col justify-between gap-4 rounded-[24px] bg-primary p-5 text-primary-content"
  >
    <div class="flex flex-col gap-3">
      <div class="flex items-center justify-between gap-3">
        <span class="flex items-center gap-2 text-sm font-semibold">
          <span class="size-2 animate-pulse rounded-full bg-vivo motion-reduce:animate-none"></span>Jornada en curso
        </span>
        <span v-if="jornada.lugar" class="text-[13px] opacity-85">{{ jornada.lugar }}</span>
      </div>
      <div class="flex flex-col gap-0.5">
        <span class="cifra font-display text-5xl leading-none font-bold tracking-tight" aria-live="polite">{{ horasMinutos(segundos) }}</span>
        <span class="cifra text-sm opacity-85">
          Desde las {{ jornada.hora_entrada }}{{ jornada.descanso_comida ? " · con comida" : "" }} · llevas {{ euros(llevas) }}
        </span>
      </div>
    </div>
    <div class="flex flex-col gap-2">
      <div class="flex gap-2.5">
        <button class="btn h-12.5 flex-1 rounded-[14px] border-0 bg-white px-6 text-base text-[#0b524c] hover:bg-white/90" :disabled="ocupado" @click="terminar">
          Terminar jornada
        </button>
        <button
          class="btn h-12.5 rounded-[14px] border-white/45 bg-transparent px-4 text-[15px] font-medium text-white hover:bg-white/10"
          :aria-pressed="jornada.descanso_comida"
          :disabled="ocupado"
          @click="alternarComida"
        >
          {{ jornada.descanso_comida ? "Quitar comida" : "Pausa comida" }}
        </button>
      </div>
      <button class="self-start text-[13px] underline opacity-80 hover:opacity-100" :disabled="ocupado" @click="descartar">
        Descartar jornada
      </button>
    </div>
  </section>

  <!-- Sin jornada: empezar -->
  <section v-else aria-label="Empezar jornada" class="flex h-full flex-col gap-4 rounded-[24px] border border-base-300 bg-base-100 p-5">
    <div class="flex flex-col gap-1">
      <h2 class="font-display text-2xl font-bold">¿Empiezas a trabajar?</h2>
      <p class="text-sm text-base-content/70">Pulsa al llegar y otra vez al salir. Se guarda la hora exacta.</p>
    </div>
    <div class="flex flex-col gap-2">
      <label for="fichar-lugar" class="text-sm font-semibold">Lugar</label>
      <input id="fichar-lugar" v-model="lugarNuevo" type="text" maxlength="200" placeholder="Ej.: Obra Sants" class="input h-12 w-full bg-base-100 text-base" />
      <div v-if="estado.lugares.length" class="flex flex-wrap gap-2">
        <button
          v-for="l in estado.lugares.slice(0, 3)"
          :key="l"
          type="button"
          class="btn btn-sm h-9 rounded-full border-0"
          :class="lugarNuevo === l ? 'bg-secondary text-secondary-content' : 'bg-base-300/70'"
          @click="lugarNuevo = l"
        >{{ l }}</button>
      </div>
    </div>
    <button class="btn btn-primary h-13 rounded-[14px] text-base" :disabled="ocupado" @click="empezar">
      <Icono nombre="reloj" :tam="20" grosor="2" />Empezar jornada ahora
    </button>
  </section>
</template>
