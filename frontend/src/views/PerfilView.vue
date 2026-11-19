<script setup>
import { computed, nextTick, ref } from "vue";
import Icono from "../components/Icono.vue";
import { avisar, cerrarSesion, descartarRechazada, estado, guardarSueldo, reintentarRechazada, sincronizar } from "../store";
import { red } from "../offline/red";
import { instalarApp, pwa } from "../pwa";
import { mensajeError } from "../utils";

defineProps({ oscuro: Boolean });
const emit = defineEmits(["cambiar-tema"]);

/* ---------- Sueldo por hora (cada persona cambia el suyo) ---------- */
const editando = ref(false);
const sueldo = ref("");
const guardando = ref(false);
const errorSueldo = ref("");
const campoSueldo = ref(null);

const formato = (v) => Number(v ?? 0).toFixed(2).replace(".", ",");

/* ---------- Conexión, datos sin enviar e instalación ---------- */
const cambios = (n) => (n === 1 ? "1 cambio" : `${n} cambios`);
const ultimaActualizacion = computed(() =>
  estado.ultimaActualizacion
    ? new Date(estado.ultimaActualizacion).toLocaleString("es-ES", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })
    : null,
);

async function instalar() {
  if (await instalarApp()) avisar("App instalada");
}

function salir() {
  const n = estado.pendientes;
  if (n && !confirm(`Tienes ${cambios(n)} guardados en este dispositivo sin enviar. Si cierras sesión se perderán. ¿Cerrar sesión igualmente?`)) return;
  cerrarSesion();
}

async function editarSueldo() {
  sueldo.value = formato(estado.usuario?.sueldo_por_hora);
  errorSueldo.value = "";
  editando.value = true;
  await nextTick();
  campoSueldo.value?.select();
}

function cancelarSueldo() {
  editando.value = false;
  errorSueldo.value = "";
}

async function enviarSueldo() {
  const valor = Number(String(sueldo.value).replace(",", "."));
  if (!sueldo.value || Number.isNaN(valor) || valor <= 0) {
    errorSueldo.value = "Escribe un importe mayor que 0.";
    return;
  }
  guardando.value = true;
  errorSueldo.value = "";
  try {
    await guardarSueldo(valor);
    editando.value = false;
    avisar("Sueldo por hora actualizado");
  } catch (err) {
    errorSueldo.value = mensajeError(err, "No se pudo guardar el sueldo.");
  } finally {
    guardando.value = false;
  }
}
</script>

<template>
  <main class="mx-auto flex max-w-2xl flex-col gap-5 px-5 pt-7 pb-6 md:px-9 md:pt-8">
    <h1 class="font-display text-3xl font-bold">Perfil</h1>

    <section class="flex items-center gap-4 rounded-[20px] border border-base-300 bg-base-100 p-5">
      <span class="flex size-14 items-center justify-center rounded-full bg-neutral text-xl font-bold text-neutral-content">
        {{ (estado.usuario?.nombre || "?").charAt(0).toUpperCase() }}
      </span>
      <div class="flex min-w-0 flex-col">
        <span class="truncate text-lg font-bold">{{ estado.usuario?.nombre }}</span>
        <span class="truncate text-sm text-base-content/70">{{ estado.usuario?.email }}</span>
        <span v-if="estado.usuario?.es_admin" class="text-xs font-semibold text-enlace">Administrador</span>
      </div>
    </section>

    <section class="flex flex-col divide-y divide-base-300 rounded-[20px] border border-base-300 bg-base-100">
      <div class="flex flex-col gap-3 p-4">
        <div class="flex items-center justify-between gap-3">
          <div class="flex flex-col">
            <span class="text-[15px] font-semibold">Sueldo por hora</span>
            <span class="text-[13px] text-base-content/70">Se aplica a los registros nuevos</span>
          </div>
          <div v-if="!editando" class="flex items-center gap-2">
            <span class="cifra text-lg font-bold text-dinero">{{ formato(estado.usuario?.sueldo_por_hora) }} €/h</span>
            <button type="button" class="btn btn-sm btn-ghost text-enlace" @click="editarSueldo">Cambiar</button>
          </div>
        </div>

        <form v-if="editando" class="flex flex-col gap-2" novalidate @submit.prevent="enviarSueldo">
          <label for="sueldo" class="text-sm font-medium">Importe en euros por hora</label>
          <div class="flex gap-2">
            <div class="relative flex-1">
              <input
                id="sueldo"
                ref="campoSueldo"
                v-model="sueldo"
                type="text"
                inputmode="decimal"
                autocomplete="off"
                class="input input-bordered h-12 w-full pr-14 tabular-nums"
                :class="{ 'input-error': errorSueldo }"
                :aria-invalid="!!errorSueldo"
                aria-describedby="sueldo-ayuda"
                @keydown.esc="cancelarSueldo"
              />
              <span class="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-sm text-base-content/60">€/h</span>
            </div>
            <button type="submit" class="btn btn-primary h-12" :disabled="guardando">
              <span v-if="!guardando">Guardar</span>
              <span v-else class="loading loading-spinner loading-xs" aria-label="Guardando" />
            </button>
            <button type="button" class="btn h-12" @click="cancelarSueldo">Cancelar</button>
          </div>
          <p id="sueldo-ayuda" class="text-xs" :class="errorSueldo ? 'text-error' : 'text-base-content/60'" :role="errorSueldo ? 'alert' : undefined">
            {{ errorSueldo || "Los registros que ya tienes mantienen el importe con el que se calcularon." }}
          </p>
        </form>
      </div>

      <label class="flex min-h-15 cursor-pointer items-center justify-between gap-3 p-4">
        <span class="flex items-center gap-3 text-[15px] font-semibold">
          <Icono :nombre="oscuro ? 'luna' : 'sol'" :tam="20" />Modo oscuro
        </span>
        <input type="checkbox" class="toggle toggle-primary" :checked="oscuro" @change="emit('cambiar-tema')" />
      </label>
      <a v-if="estado.usuario?.es_admin" href="/admin/" class="flex min-h-15 items-center justify-between gap-3 p-4 text-[15px] font-semibold">
        Panel de administración <Icono nombre="adelante" :tam="18" />
      </a>
    </section>

    <section aria-labelledby="t-sync" class="flex flex-col gap-3 rounded-[20px] border border-base-300 bg-base-100 p-4">
      <div class="flex items-center justify-between gap-3">
        <div class="flex flex-col">
          <h2 id="t-sync" class="text-[15px] font-semibold">Conexión y datos</h2>
          <span class="text-[13px] text-base-content/70">
            {{ red.sinConexion ? "Sin conexión" : "Con conexión" }}<template v-if="ultimaActualizacion"> · Datos actualizados el {{ ultimaActualizacion }}</template>
          </span>
        </div>
        <button class="btn btn-sm h-10 rounded-full" :disabled="red.sinConexion || !estado.pendientes || estado.sincronizando" @click="sincronizar()">Enviar ahora</button>
      </div>
      <p class="text-sm text-base-content/70">
        {{ estado.pendientes ? `Hay ${cambios(estado.pendientes)} guardados en este dispositivo sin enviar.` : "Todo está enviado al servidor." }}
        Sin conexión puedes fichar y guardar registros: se envían solos al volver.
      </p>
      <ul v-if="estado.rechazadas.length" class="flex flex-col gap-2">
        <li v-for="r in estado.rechazadas" :key="r.uid" class="rounded-2xl border border-error p-3 text-sm">
          <span class="block font-semibold">{{ r.texto }}</span>
          <span class="block text-error">{{ r.motivo }}</span>
          <span class="mt-2 flex gap-2">
            <button class="btn btn-sm rounded-full" @click="reintentarRechazada(r.uid)">Reintentar</button>
            <button class="btn btn-sm btn-ghost rounded-full" @click="descartarRechazada(r.uid)">Descartar</button>
          </span>
        </li>
      </ul>
    </section>

    <section aria-labelledby="t-app" class="flex flex-col gap-3 rounded-[20px] border border-base-300 bg-base-100 p-4">
      <h2 id="t-app" class="text-[15px] font-semibold">App</h2>
      <p v-if="pwa.instalada" class="text-sm text-base-content/70">Ya tienes Mi Jornada instalada en este dispositivo.</p>
      <template v-else>
        <p class="text-sm text-base-content/70">Instálala para abrirla desde la pantalla de inicio, a pantalla completa y también sin conexión.</p>
        <button v-if="pwa.puedeInstalar" class="btn btn-primary h-12 rounded-xl" @click="instalar">
          <Icono nombre="descargar" :tam="20" />Instalar app
        </button>
        <p v-else-if="pwa.esIOS" class="text-sm">En iPhone o iPad: pulsa el botón Compartir y elige «Añadir a pantalla de inicio».</p>
        <p v-else class="text-sm text-base-content/70">Si no ves el botón, busca «Instalar» o «Añadir a pantalla de inicio» en el menú del navegador.</p>
      </template>
    </section>

    <button class="btn h-12 rounded-xl border-base-300 bg-base-100 text-error" @click="salir">
      <Icono nombre="salir" :tam="20" />Cerrar sesión
    </button>
  </main>
</template>
