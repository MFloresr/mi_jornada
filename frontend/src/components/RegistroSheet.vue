<script setup>
// Formulario para crear o editar un registro de jornada
import { computed, ref, watch } from "vue";
import AsistenteIA from "./AsistenteIA.vue";
import ConfirmarIA from "./ConfirmarIA.vue";
import Hoja from "./Hoja.vue";
import Icono from "./Icono.vue";
import { avisar, descartarJornada, eliminarRegistro, estado, guardarRegistro } from "../store";
import { ayerISO, euros, horas, hoyISO, mensajeError, segundosEntre } from "../utils";

const props = defineProps({
  abierta: Boolean,
  // Registro a editar (con id) o datos para rellenar uno nuevo (sin id)
  registro: { type: Object, default: null },
});
const emit = defineEmits(["cerrar"]);

const fecha = ref(hoyISO());
const entrada = ref("");
const salida = ref("");
const lugar = ref("");
const comida = ref(false);
const descripcion = ref("");
const sueldo = ref("");
const masOpciones = ref(false);
const guardando = ref(false);
const error = ref("");
const resultadoIA = ref(null);
const textoIA = ref(""); // se conserva al volver de la confirmación
const autoIA = ref(false); // enviar al abrir (texto escrito en la barra del escritorio)

const editando = computed(() => !!props.registro?.id);
const conIA = computed(() => !editando.value && !!estado.usuario?.ia_disponible);
const titulo = computed(() => {
  if (resultadoIA.value) return "Esto es lo que he entendido";
  return editando.value ? "Editar registro" : "Nuevo registro";
});

function alEntenderIA(r) {
  textoIA.value = r.texto;
  autoIA.value = false;
  resultadoIA.value = r;
}

/** "No es esto": vuelve al formulario con el primer tramo entendido */
function corregirIA(tramo) {
  resultadoIA.value = null;
  if (tramo) rellenar({ ...tramo, id: undefined });
}

/** Rellena el formulario con un registro (o lo vacía) */
function rellenar(r = {}) {
  fecha.value = r.fecha || hoyISO();
  entrada.value = r.hora_entrada || "";
  salida.value = r.hora_salida || "";
  lugar.value = r.lugar || "";
  comida.value = !!r.descanso_comida;
  descripcion.value = r.descripcion || "";
  sueldo.value = r.id && r.sueldo_por_hora != null ? String(r.sueldo_por_hora) : "";
  masOpciones.value = !!(descripcion.value || sueldo.value);
  error.value = "";
}

watch(
  () => [props.abierta, props.registro],
  ([abierta]) => {
    if (!abierta) return;
    resultadoIA.value = null;
    textoIA.value = props.registro?.textoIA || "";
    autoIA.value = !!textoIA.value;
    rellenar(props.registro || {});
  },
  { immediate: true },
);

defineExpose({ rellenar });

const eleccionDia = computed(() => {
  if (fecha.value === hoyISO()) return "hoy";
  if (fecha.value === ayerISO()) return "ayer";
  return "otro";
});

const sueldoHora = computed(() => {
  const propio = parseFloat(String(sueldo.value).replace(",", "."));
  return Number.isFinite(propio) ? propio : estado.usuario?.sueldo_por_hora || 0;
});
const segundos = computed(() => segundosEntre(entrada.value, salida.value, comida.value));
const importe = computed(() => (segundos.value > 0 ? (segundos.value / 3600) * sueldoHora.value : 0));

const sugerencias = computed(() => estado.lugares.slice(0, 4));

async function guardar() {
  error.value = "";
  if (!fecha.value || !entrada.value || !salida.value) {
    error.value = "Indica el día, la hora de entrada y la de salida.";
    return;
  }
  if (!lugar.value.trim()) {
    error.value = "Indica el lugar de trabajo.";
    return;
  }
  guardando.value = true;
  try {
    const propio = parseFloat(String(sueldo.value).replace(",", "."));
    await guardarRegistro(
      {
        fecha: fecha.value,
        hora_entrada: entrada.value,
        hora_salida: salida.value,
        lugar: lugar.value.trim(),
        descanso_comida: comida.value,
        descripcion: descripcion.value.trim(),
        sueldo_por_hora: Number.isFinite(propio) ? propio : null,
      },
      props.registro?.id,
    );
    if (props.registro?.desdeJornada) await descartarJornada();
    avisar(editando.value ? "Registro actualizado" : "Registro guardado");
    emit("cerrar");
  } catch (err) {
    error.value = mensajeError(err, "No se pudo guardar el registro");
  } finally {
    guardando.value = false;
  }
}

async function borrar() {
  if (!confirm("¿Eliminar este registro? No se puede deshacer.")) return;
  try {
    await eliminarRegistro(props.registro.id);
    avisar("Registro eliminado");
    emit("cerrar");
  } catch (err) {
    error.value = mensajeError(err, "No se pudo eliminar");
  }
}
</script>

<template>
  <Hoja :abierta="abierta" :titulo="titulo" @cerrar="emit('cerrar')">
    <ConfirmarIA v-if="resultadoIA" :resultado="resultadoIA" @guardado="emit('cerrar')" @corregir="corregirIA" />

    <form v-else id="form-registro" class="flex flex-col gap-5 pt-1" @submit.prevent="guardar">
      <template v-if="conIA">
        <AsistenteIA :texto-inicial="textoIA" :auto-enviar="autoIA" @resultado="alEntenderIA" />
        <div class="flex items-center gap-3 text-[13px] text-base-content/70" aria-hidden="true">
          <span class="h-px flex-1 bg-base-300"></span>o a mano<span class="h-px flex-1 bg-base-300"></span>
        </div>
      </template>

      <fieldset class="flex flex-col gap-2">
        <legend class="mb-2 text-sm font-semibold">Día</legend>
        <div class="flex flex-wrap gap-2">
          <button
            type="button"
            class="btn h-11 rounded-full px-5"
            :class="eleccionDia === 'hoy' ? 'btn-neutral' : 'border-base-300 bg-base-100'"
            :aria-pressed="eleccionDia === 'hoy'"
            @click="fecha = hoyISO()"
          >Hoy</button>
          <button
            type="button"
            class="btn h-11 rounded-full px-5"
            :class="eleccionDia === 'ayer' ? 'btn-neutral' : 'border-base-300 bg-base-100'"
            :aria-pressed="eleccionDia === 'ayer'"
            @click="fecha = ayerISO()"
          >Ayer</button>
          <label class="sr-only" for="reg-fecha">Fecha</label>
          <input
            id="reg-fecha"
            v-model="fecha"
            type="date"
            required
            class="input h-11 min-w-0 flex-1 rounded-full bg-base-100"
            :class="eleccionDia === 'otro' ? 'border-neutral' : 'border-base-300'"
          />
        </div>
      </fieldset>

      <div class="grid grid-cols-2 gap-3">
        <label class="flex flex-col gap-2 text-sm font-semibold">
          Entrada
          <input v-model="entrada" type="time" required class="input cifra h-13 w-full bg-base-100 text-xl font-semibold" />
        </label>
        <label class="flex flex-col gap-2 text-sm font-semibold">
          Salida
          <input v-model="salida" type="time" required class="input cifra h-13 w-full bg-base-100 text-xl font-semibold" />
        </label>
      </div>

      <div class="flex flex-col gap-2">
        <label for="reg-lugar" class="text-sm font-semibold">Lugar</label>
        <input
          id="reg-lugar"
          v-model="lugar"
          type="text"
          maxlength="200"
          autocomplete="off"
          placeholder="Ej.: Obra Sants"
          class="input h-13 w-full bg-base-100 text-base"
        />
        <div v-if="sugerencias.length" class="flex flex-wrap gap-2">
          <button
            v-for="l in sugerencias"
            :key="l"
            type="button"
            class="btn btn-sm h-9 rounded-full border-0"
            :class="lugar === l ? 'bg-secondary text-secondary-content' : 'bg-base-300/70'"
            @click="lugar = l"
          >{{ l }}</button>
        </div>
      </div>

      <label class="flex min-h-13 cursor-pointer items-center justify-between gap-3 rounded-field border border-base-300 bg-base-100 px-4 text-[15px] font-medium">
        Descanso de comida (resta 1 h)
        <input v-model="comida" type="checkbox" class="toggle toggle-primary" />
      </label>

      <div>
        <button
          type="button"
          class="flex min-h-11 w-full items-center justify-between gap-3 text-[15px] font-semibold"
          :aria-expanded="masOpciones"
          @click="masOpciones = !masOpciones"
        >
          Más opciones
          <span class="text-sm font-normal text-base-content/70">{{ masOpciones ? "Ocultar" : "Descripción · sueldo por hora" }}</span>
        </button>
        <div v-if="masOpciones" class="mt-3 flex flex-col gap-4">
          <label class="flex flex-col gap-2 text-sm font-semibold">
            Descripción
            <textarea v-model="descripcion" rows="2" class="textarea w-full bg-base-100 text-base font-normal"></textarea>
          </label>
          <label class="flex flex-col gap-2 text-sm font-semibold">
            Sueldo por hora (si es distinto del habitual)
            <input
              v-model="sueldo"
              type="number"
              step="0.01"
              min="0"
              inputmode="decimal"
              :placeholder="`${estado.usuario?.sueldo_por_hora ?? ''} €/h`"
              class="input h-12 w-full bg-base-100 text-base font-normal"
            />
          </label>
        </div>
      </div>

      <p v-if="error" role="alert" class="rounded-field bg-error/10 px-4 py-3 text-sm font-medium text-error">{{ error }}</p>

      <button v-if="editando" type="button" class="btn btn-ghost self-start text-error" @click="borrar">
        <Icono nombre="papelera" :tam="18" />Eliminar registro
      </button>
    </form>

    <template v-if="!resultadoIA" #pie>
      <div class="flex items-center gap-4">
        <div class="flex flex-1 flex-col">
          <span class="cifra text-lg font-bold">{{ segundos > 0 ? horas(segundos) : "—" }}</span>
          <span class="cifra text-[13px] font-semibold text-dinero">
            {{ euros(importe) }} · {{ sueldoHora.toFixed(2).replace(".", ",") }} €/h
          </span>
        </div>
        <button type="submit" form="form-registro" class="btn btn-neutral h-13 rounded-field px-7 text-base" :disabled="guardando">
          <span v-if="guardando" class="loading loading-spinner loading-sm"></span>
          {{ editando ? "Guardar cambios" : "Guardar" }}
        </button>
      </div>
    </template>
  </Hoja>
</template>
