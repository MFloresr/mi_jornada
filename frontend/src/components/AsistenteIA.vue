<script setup>
// Caja "Escríbelo o díctalo": envía el texto al asistente y devuelve los registros entendidos
import { onBeforeUnmount, onMounted, ref } from "vue";
import Icono from "./Icono.vue";
import { interpretarTexto } from "../store";
import { mensajeError } from "../utils";

const props = defineProps({
  textoInicial: { type: String, default: "" },
  // Envía el texto nada más abrirse (cuando viene de la barra del escritorio)
  autoEnviar: Boolean,
});
const emit = defineEmits(["resultado"]);

const texto = ref(props.textoInicial);
const pensando = ref(false);
const aviso = ref("");
const esError = ref(false);

/* ---------- Dictado por voz (si el navegador lo permite) ---------- */
const Reconocimiento = window.SpeechRecognition || window.webkitSpeechRecognition;
const escuchando = ref(false);
let reconocimiento = null;
let textoAntes = "";

function alternarDictado() {
  if (escuchando.value) {
    reconocimiento?.stop();
    return;
  }
  reconocimiento = new Reconocimiento();
  reconocimiento.lang = "es-ES";
  reconocimiento.interimResults = true;
  textoAntes = texto.value ? `${texto.value.trim()} ` : "";
  reconocimiento.onresult = (e) => {
    const dicho = Array.from(e.results, (r) => r[0].transcript).join("");
    texto.value = textoAntes + dicho;
  };
  reconocimiento.onerror = (e) => {
    if (e.error === "not-allowed") mostrarAviso("Permite el uso del micrófono para dictar.", true);
  };
  reconocimiento.onend = () => (escuchando.value = false);
  reconocimiento.start();
  escuchando.value = true;
}
onBeforeUnmount(() => reconocimiento?.abort());

function mostrarAviso(t, error = false) {
  aviso.value = t;
  esError.value = error;
}

async function enviar() {
  const t = texto.value.trim();
  if (!t || pensando.value) return;
  reconocimiento?.stop();
  pensando.value = true;
  mostrarAviso("");
  try {
    const r = await interpretarTexto(t);
    if (r.registros.length) emit("resultado", { ...r, texto: t });
    else mostrarAviso(r.aviso || "No he encontrado horas en el texto.", true);
  } catch (err) {
    mostrarAviso(mensajeError(err, "El asistente no responde ahora mismo."), true);
  } finally {
    pensando.value = false;
  }
}

function alTeclear(e) {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    enviar();
  }
}

onMounted(() => {
  if (props.autoEnviar && texto.value.trim()) enviar();
});
</script>

<template>
  <section aria-label="Escribir con IA" class="flex flex-col gap-3 rounded-[20px] border-[1.5px] border-primary bg-base-100 p-4">
    <label for="ia-texto" class="flex items-center gap-2 text-sm font-bold text-secondary-content">
      <Icono nombre="chispa" :tam="18" />Escríbelo o díctalo
    </label>
    <textarea
      id="ia-texto"
      v-model="texto"
      rows="2"
      maxlength="600"
      placeholder="Ej.: ayer de 8 a 14 y de 16 a 19 en la obra de Sants"
      class="w-full resize-none bg-transparent text-base leading-snug outline-none placeholder:text-base-content/50"
      :disabled="pensando"
      @keydown="alTeclear"
    ></textarea>
    <div class="flex items-center gap-2.5">
      <button
        v-if="Reconocimiento"
        type="button"
        class="btn btn-circle size-12 border-base-300"
        :class="escuchando ? 'animate-pulse bg-error text-error-content motion-reduce:animate-none' : 'bg-base-200'"
        :aria-label="escuchando ? 'Parar el dictado' : 'Dictar por voz'"
        :aria-pressed="escuchando"
        :disabled="pensando"
        @click="alternarDictado"
      >
        <Icono nombre="micro" :tam="20" />
      </button>
      <button type="button" class="btn btn-primary h-12 flex-1 rounded-[14px] text-base" :disabled="pensando || !texto.trim()" @click="enviar">
        <span v-if="pensando" class="loading loading-spinner loading-sm"></span>
        {{ pensando ? "Pensando…" : "Rellenar por mí" }}
      </button>
    </div>
    <p v-if="escuchando" class="text-xs text-base-content/70" aria-live="polite">Te escucho… pulsa el micrófono para terminar.</p>
    <p
      v-if="aviso"
      :role="esError ? 'alert' : 'status'"
      class="rounded-xl px-3 py-2 text-sm"
      :class="esError ? 'bg-error/10 text-error' : 'bg-secondary text-secondary-content'"
    >{{ aviso }}</p>
  </section>
</template>
