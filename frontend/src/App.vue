<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import AppShell from "./components/AppShell.vue";
import LoginView from "./components/LoginView.vue";
import RegistroSheet from "./components/RegistroSheet.vue";
import ResetPasswordView from "./components/ResetPasswordView.vue";
import CalendarioView from "./views/CalendarioView.vue";
import EstadisticasView from "./views/EstadisticasView.vue";
import HoyView from "./views/HoyView.vue";
import PerfilView from "./views/PerfilView.vue";
import RegistrosView from "./views/RegistrosView.vue";
import { comprobarSesion, estado } from "./store";

// Enlace del email de recuperación: /reset-password/<token>/
const resetToken = window.location.pathname.match(/^\/reset-password\/([^/]+)\/?$/)?.[1] ?? null;

/* ---------- Navegación por #/seccion ---------- */
const VISTAS = { hoy: HoyView, registros: RegistrosView, calendario: CalendarioView, estadisticas: EstadisticasView, perfil: PerfilView };
const vistaDesdeHash = () => {
  const v = window.location.hash.replace(/^#\/?/, "");
  return VISTAS[v] ? v : "hoy";
};
const vista = ref(vistaDesdeHash());
const componenteVista = computed(() => VISTAS[vista.value]);
function alCambiarHash() {
  vista.value = vistaDesdeHash();
  window.scrollTo(0, 0);
}

/* ---------- Tema ---------- */
const oscuro = ref(document.documentElement.getAttribute("data-theme") === "jornada-oscuro");
function cambiarTema() {
  oscuro.value = !oscuro.value;
  const tema = oscuro.value ? "jornada-oscuro" : "jornada";
  document.documentElement.setAttribute("data-theme", tema);
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", oscuro.value ? "#141412" : "#F5F3EE");
  try {
    localStorage.setItem("mj-tema", tema);
  } catch {
    // Sin almacenamiento el tema dura solo esta visita
  }
}

/* ---------- Formulario de registro ---------- */
const hojaAbierta = ref(false);
const registroHoja = ref(null);
function abrirRegistro(registro = null) {
  registroHoja.value = registro;
  hojaAbierta.value = true;
}

onMounted(() => {
  window.addEventListener("hashchange", alCambiarHash);
  if (!resetToken) comprobarSesion();
});
onBeforeUnmount(() => window.removeEventListener("hashchange", alCambiarHash));
</script>

<template>
  <ResetPasswordView v-if="resetToken" :token="resetToken" />

  <div v-else-if="estado.comprobandoSesion" class="flex min-h-dvh items-center justify-center" aria-busy="true">
    <span class="loading loading-spinner loading-lg text-primary" aria-label="Cargando"></span>
  </div>

  <LoginView v-else-if="!estado.usuario" @logged-in="comprobarSesion" />

  <AppShell v-else :vista="vista" @nuevo="abrirRegistro()">
    <component
      :is="componenteVista"
      :oscuro="oscuro"
      @editar="abrirRegistro"
      @nuevo="abrirRegistro"
      @cambiar-tema="cambiarTema"
    />
    <RegistroSheet :abierta="hojaAbierta" :registro="registroHoja" @cerrar="hojaAbierta = false" />
  </AppShell>

  <!-- Avisos -->
  <div class="pointer-events-none fixed inset-x-0 top-4 z-[60] flex justify-center px-4" aria-live="polite">
    <Transition name="hoja">
      <p
        v-if="estado.aviso"
        class="pointer-events-auto rounded-full px-5 py-3 text-sm font-semibold shadow-lg"
        :class="estado.aviso.tipo === 'error' ? 'bg-error text-error-content' : 'bg-neutral text-neutral-content'"
        :role="estado.aviso.tipo === 'error' ? 'alert' : 'status'"
      >
        {{ estado.aviso.texto }}
      </p>
    </Transition>
  </div>
</template>
