<script setup>
// Muestra lo que ha entendido el asistente para que el usuario lo revise antes de guardar
import { computed, ref, watch } from "vue";
import Icono from "./Icono.vue";
import { avisar, estado, guardarVarios } from "../store";
import { diaCorto, diaNumero, euros, horas, mensajeError, segundosEntre } from "../utils";

const props = defineProps({
  resultado: { type: Object, required: true }, // { registros, aviso, texto }
});
const emit = defineEmits(["guardado", "corregir"]);

const tramos = ref([]);
const editando = ref(null);
const guardando = ref(false);
const error = ref("");

watch(
  () => props.resultado,
  (r) => {
    tramos.value = r.registros.map((x, i) => ({ ...x, clave: i }));
    editando.value = null;
    error.value = "";
  },
  { immediate: true },
);

const sueldo = computed(() => estado.usuario?.sueldo_por_hora || 0);
const segundosDe = (t) => segundosEntre(t.hora_entrada, t.hora_salida, t.descanso_comida);
const total = computed(() => tramos.value.reduce((s, t) => s + Math.max(0, segundosDe(t)), 0));
const diasDistintos = computed(() => new Set(tramos.value.map((t) => t.fecha)).size);

const nombreTramo = (t, i) => {
  if (tramos.value.length === 1) return "Registro";
  const h = Number(t.hora_entrada.slice(0, 2));
  const momento = h < 13 ? "mañana" : h < 20 ? "tarde" : "noche";
  return diasDistintos.value > 1 ? `Tramo ${i + 1}` : `Tramo ${i + 1} · ${momento}`;
};

function quitar(i) {
  tramos.value.splice(i, 1);
  if (!tramos.value.length) emit("corregir", null);
}

async function guardar() {
  error.value = "";
  const malo = tramos.value.find((t) => !t.fecha || !t.hora_entrada || !t.hora_salida || segundosDe(t) <= 0);
  if (malo) {
    error.value = "Hay un tramo con horas imposibles. Revísalo o quítalo.";
    return;
  }
  guardando.value = true;
  const lista = tramos.value.map(({ clave, ...t }) => ({ ...t, sueldo_por_hora: null }));
  const { guardados, error: fallo } = await guardarVarios(lista);
  guardando.value = false;
  if (fallo) {
    tramos.value.splice(0, guardados);
    error.value = `${guardados ? `Se guardaron ${guardados}. ` : ""}${mensajeError(fallo, "No se pudo guardar")}`;
    return;
  }
  avisar(guardados === 1 ? "Registro guardado" : `${guardados} registros guardados`);
  emit("guardado");
}
</script>

<template>
  <div class="flex flex-col gap-4 pt-1">
    <p class="text-sm text-base-content/70 italic">«{{ resultado.texto }}»</p>

    <p v-if="resultado.aviso" class="flex items-start gap-2.5 rounded-[14px] bg-secondary px-3.5 py-3 text-sm text-secondary-content">
      <Icono nombre="info" :tam="18" class="mt-px" />{{ resultado.aviso }}
    </p>

    <article
      v-for="(t, i) in tramos"
      :key="t.clave"
      class="flex flex-col gap-3 rounded-[18px] border border-base-300 bg-base-100 p-4"
    >
      <div class="flex items-center justify-between gap-2">
        <span class="text-[13px] font-bold tracking-wide text-base-content/70 uppercase">{{ nombreTramo(t, i) }}</span>
        <div class="flex gap-1.5">
          <button
            type="button"
            class="btn btn-sm h-9 rounded-[10px] border-base-300 bg-base-100"
            :aria-expanded="editando === t.clave"
            @click="editando = editando === t.clave ? null : t.clave"
          >{{ editando === t.clave ? "Listo" : "Cambiar" }}</button>
          <button
            v-if="tramos.length > 1"
            type="button"
            class="btn btn-sm btn-ghost btn-square h-9"
            :aria-label="`Quitar ${nombreTramo(t, i)}`"
            @click="quitar(i)"
          ><Icono nombre="papelera" :tam="16" /></button>
        </div>
      </div>

      <div v-if="editando !== t.clave" class="grid grid-cols-3 gap-2.5">
        <div class="flex flex-col gap-0.5">
          <span class="text-xs text-base-content/70">Día</span>
          <span class="text-[15px] font-semibold">{{ diaCorto(t.fecha) }} {{ diaNumero(t.fecha) }}</span>
        </div>
        <div class="flex flex-col gap-0.5">
          <span class="text-xs text-base-content/70">Horario</span>
          <span class="cifra text-[15px] font-semibold">{{ t.hora_entrada }}–{{ t.hora_salida }}</span>
        </div>
        <div class="flex min-w-0 flex-col gap-0.5">
          <span class="text-xs text-base-content/70">Lugar</span>
          <span class="truncate text-[15px] font-semibold">{{ t.lugar || "—" }}</span>
        </div>
        <span v-if="t.descanso_comida" class="col-span-3 text-[13px] text-base-content/70">Con descanso de comida (−1 h)</span>
        <span v-if="t.descripcion" class="col-span-3 text-[13px] text-base-content/70">{{ t.descripcion }}</span>
      </div>

      <div v-else class="grid grid-cols-2 gap-3">
        <label class="col-span-2 flex flex-col gap-1.5 text-sm font-semibold">
          Día<input v-model="t.fecha" type="date" class="input h-11 w-full bg-base-100 font-normal" />
        </label>
        <label class="flex flex-col gap-1.5 text-sm font-semibold">
          Entrada<input v-model="t.hora_entrada" type="time" class="input cifra h-11 w-full bg-base-100 font-normal" />
        </label>
        <label class="flex flex-col gap-1.5 text-sm font-semibold">
          Salida<input v-model="t.hora_salida" type="time" class="input cifra h-11 w-full bg-base-100 font-normal" />
        </label>
        <label class="col-span-2 flex flex-col gap-1.5 text-sm font-semibold">
          Lugar<input v-model="t.lugar" type="text" maxlength="200" class="input h-11 w-full bg-base-100 font-normal" />
        </label>
        <label class="col-span-2 flex items-center justify-between gap-3 text-sm font-medium">
          Descanso de comida (resta 1 h)
          <input v-model="t.descanso_comida" type="checkbox" class="toggle toggle-primary" />
        </label>
      </div>
    </article>

    <div class="flex items-baseline justify-between px-1">
      <span class="text-[15px] text-base-content/70">{{ diasDistintos > 1 ? "Total" : "Total del día" }}</span>
      <span class="cifra text-lg font-bold">{{ horas(total) }} · <span class="text-dinero">{{ euros((total / 3600) * sueldo) }}</span></span>
    </div>

    <p v-if="error" role="alert" class="rounded-field bg-error/10 px-4 py-3 text-sm font-medium text-error">{{ error }}</p>

    <div class="flex flex-col gap-2">
      <button type="button" class="btn btn-primary h-13 rounded-[14px] text-base" :disabled="guardando" @click="guardar">
        <span v-if="guardando" class="loading loading-spinner loading-sm"></span>
        {{ tramos.length === 1 ? "Guardar registro" : `Guardar ${tramos.length} registros` }}
      </button>
      <button type="button" class="btn btn-ghost h-12 rounded-[14px] text-[15px]" @click="emit('corregir', tramos[0] || null)">
        No es esto, lo corrijo a mano
      </button>
    </div>
    <p class="text-center text-xs text-base-content/70">No se guarda nada hasta que lo confirmes.</p>
  </div>
</template>
