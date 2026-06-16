<script setup>
import { ref, onMounted } from "vue";
import api from "./api";

import LoginView from "./components/LoginView.vue";
import RegistroForm from "./components/RegistroForm.vue";
import RegistrosList from "./components/RegistrosList.vue";
import Calendario from "./components/Calendario.vue";
import DashboardLayout from "./components/DashboardLayout.vue";
import StatsCards from "./components/StatsCards.vue";
import ActividadReciente from "./components/ActividadReciente.vue";
import QuickStats from "./components/QuickStats.vue";

/* ---------- Estado global ---------- */
const dark = ref(false);

const registros = ref([]);
const userInfo = ref(null);

const loading = ref(false);
const error = ref(null);

const esAdmin = ref(false);

const totales = ref({
  duracion_trabajada_segundos: 0,
  sueldo_total: 0,
});

const modalAbierto = ref(false);
const modalData = ref(null);

const detalleDiaSeleccionado = ref(null);

const mostrarModalNuevaEntrada = ref(false);
const modoEdicion = ref(false);
const registroEditando = ref(null);

/* ---------- UI / Tema ---------- */
function toggleTheme() {
  dark.value = !dark.value;
  document.documentElement.setAttribute(
    "data-theme",
    dark.value ? "dark" : "light",
  );
}

/* ---------- CRUD Registros ---------- */
async function cargarRegistros() {
  loading.value = true;
  error.value = null;

  try {
    const resp = await api.get("registros/");

    if (resp.data && typeof resp.data.es_admin !== "undefined") {
      esAdmin.value = !!resp.data.es_admin;
    }

    registros.value = resp.data.registros || [];
    totales.value = resp.data.totales || {
      duracion_trabajada_segundos: 0,
      sueldo_total: 0,
    };
  } catch (err) {
    error.value = "Error cargando registros";
  } finally {
    loading.value = false;
  }
}

async function crearRegistro(payload) {
  if (!payload) {
    error.value = "Fecha, entrada y salida son obligatorias";
    return;
  }

  error.value = null;

  try {
    await api.post("registros/", payload);
    await cargarRegistros();
    cerrarModalNuevaEntrada();
  } catch (err) {
    error.value = "Error creando registro";
  }
}

async function actualizarRegistro(id, payload) {
  if (!payload) {
    error.value = "Fecha, entrada y salida son obligatorias";
    return;
  }

  error.value = null;

  try {
    await api.put(`registros/${id}/`, payload);
    await cargarRegistros();
    cerrarModalNuevaEntrada();
  } catch (err) {
    error.value = "Error actualizando registro";
  }
}

async function eliminarRegistro(id) {
  error.value = null;

  try {
    await api.delete(`registros/${id}/`);
    await cargarRegistros();

    if (
      detalleDiaSeleccionado.value &&
      detalleDiaSeleccionado.value.registros
    ) {
      detalleDiaSeleccionado.value = {
        ...detalleDiaSeleccionado.value,
        registros: detalleDiaSeleccionado.value.registros.filter(
          (r) => r.id !== id,
        ),
      };
    }
  } catch (err) {
    error.value = "Error eliminando registro";
  }
}

function editarRegistroDesdeDetalle(reg) {
  modoEdicion.value = true;
  registroEditando.value = reg;
  mostrarModalNuevaEntrada.value = true;
}

/* ---------- Auth ---------- */
function onLoggedIn(info) {
  userInfo.value = info;
  esAdmin.value = !!info.es_admin;
  cargarRegistros();
}

function onLoggedOut() {
  userInfo.value = null;
  registros.value = [];
  esAdmin.value = false;
  detalleDiaSeleccionado.value = null;
}

async function navAuthClick() {
  if (!userInfo.value) return;

  try {
    await api.post("logout/");
  } catch (err) {
    // Si falla el logout en servidor, igualmente limpiamos sesión local
  }
  onLoggedOut();
}

/* ---------- Modales / detalle día ---------- */
function abrirModalNuevaEntrada() {
  modoEdicion.value = false;
  registroEditando.value = null;
  mostrarModalNuevaEntrada.value = true;
}

function cerrarModalNuevaEntrada() {
  mostrarModalNuevaEntrada.value = false;
  modoEdicion.value = false;
  registroEditando.value = null;
}

function abrirModalDetalle(payload) {
  if (esAdmin.value) {
    modalData.value = payload;
    modalAbierto.value = true;
  } else {
    detalleDiaSeleccionado.value = payload;
  }
}

function cerrarModal() {
  modalAbierto.value = false;
  modalData.value = null;
}

/* ---------- Bootstrap CSRF ---------- */
onMounted(async () => {
  document.documentElement.setAttribute("data-theme", "light");
  try {
    await api.get("csrf-ping/");
  } catch (e) {
    // Si falla, igualmente intentaremos login luego
  }
});
</script>

<template>
  <!-- LOGIN -->
  <div
    v-if="!userInfo"
    class="min-h-screen flex items-center justify-center bg-base-200 px-4"
  >
    <LoginView @logged-in="onLoggedIn" />
  </div>

  <!-- DASHBOARD -->
  <DashboardLayout
    v-else
    :es-admin="esAdmin"
    :dark="dark"
    :user-info="userInfo"
    @toggle-theme="toggleTheme"
    @nav-auth-click="navAuthClick"
    @new-entry-click="abrirModalNuevaEntrada"
  >
    <main class="w-full px-4 py-4 md:px-6 md:py-6 space-y-6">
      <!-- Stats -->
      <section>
        <StatsCards :registros="registros" />
      </section>

      <!-- Calendario + Detalle -->
      <section class="space-y-4">
        <Calendario
          :registros="registros"
          :esAdmin="esAdmin"
          @ver-detalle-dia="abrirModalDetalle"
        />

        <div v-if="!esAdmin" class="bg-base-100 rounded-box shadow p-4 md:p-5">
          <h2 class="text-base md:text-lg font-semibold mb-2">
            Detalle del día
            <span v-if="detalleDiaSeleccionado">
              {{ detalleDiaSeleccionado.dateStr }}
            </span>
          </h2>

          <div v-if="!detalleDiaSeleccionado" class="text-sm text-gray-500">
            Selecciona un día en el calendario para ver sus registros.
          </div>

          <div
            v-else-if="
              !detalleDiaSeleccionado.registros ||
              !detalleDiaSeleccionado.registros.length
            "
            class="text-sm text-gray-500"
          >
            No hay registros para este día.
          </div>

          <div v-else class="space-y-2 text-sm">
            <div
              v-for="(reg, idx) in detalleDiaSeleccionado.registros"
              :key="reg.id || idx"
              class="border rounded-lg p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
            >
              <div>
                <div class="font-medium">
                  Entrada: {{ reg.hora_entrada }} - Salida:
                  {{ reg.hora_salida }}
                </div>
                <div class="text-gray-500">
                  {{ reg.descripcion || "Sin descripción" }}
                </div>
              </div>

              <div
                class="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto"
              >
                <div class="text-right">
                  <div class="text-purple-700 font-semibold">
                    {{ (reg.duracion_trabajada / 3600).toFixed(2) }} h
                  </div>
                  <div class="text-green-700">
                    {{ reg.sueldo_registro.toFixed(2) }} €
                  </div>
                </div>

                <div class="flex flex-col gap-1">
                  <button
                    class="btn btn-xs btn-outline"
                    @click="editarRegistroDesdeDetalle(reg)"
                  >
                    Editar
                  </button>
                  <button
                    class="btn btn-xs btn-error"
                    @click="eliminarRegistro(reg.id)"
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Actividad reciente + Quick stats -->
      <section class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div class="lg:col-span-2">
          <ActividadReciente :registros="registros" />
        </div>
        <div>
          <QuickStats :registros="registros" />
        </div>
      </section>

      <!-- Alerts -->
      <section class="space-y-2">
        <div v-if="loading" class="alert alert-info">Cargando registros...</div>
        <div v-if="error" class="alert alert-error">
          {{ error }}
        </div>
      </section>

      <!-- Lista de registros -->
      <section>
        <RegistrosList :registros="registros" />
      </section>
    </main>

    <!-- Modal Nueva Entrada / Edición -->
    <div
      v-if="mostrarModalNuevaEntrada"
      class="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50 px-2"
    >
      <div
        class="bg-base-100 rounded-lg shadow-lg p-4 md:p-5 max-w-lg w-full max-h-screen overflow-y-auto"
      >
        <div class="flex justify-between items-center mb-3">
          <h2 class="text-base md:text-lg font-bold">
            {{ modoEdicion ? "Editar registro" : "Nueva entrada" }}
          </h2>
          <button
            class="text-gray-500 hover:text-gray-700 text-xl leading-none"
            @click="cerrarModalNuevaEntrada"
          >
            ×
          </button>
        </div>

        <RegistroForm
          :registro="registroEditando"
          @crear="
            (payload) => {
              if (modoEdicion && registroEditando && registroEditando.id) {
                actualizarRegistro(registroEditando.id, payload);
              } else {
                crearRegistro(payload);
              }
            }
          "
        />
      </div>
    </div>

    <!-- Modal detalle día (admin) -->
    <div
      v-if="modalAbierto"
      class="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50 px-2"
    >
      <div
        class="bg-base-100 rounded-lg shadow-lg p-4 md:p-5 max-w-lg w-full max-h-screen overflow-y-auto"
      >
        <div class="flex justify-between items-center mb-3">
          <h2 class="text-base md:text-lg font-bold">
            Detalle del día {{ modalData?.dateStr }}
          </h2>
          <button
            class="text-gray-500 hover:text-gray-700 text-xl leading-none"
            @click="cerrarModal"
          >
            ×
          </button>
        </div>

        <div v-if="modalData?.registros?.length">
          <p class="text-sm text-gray-600 mb-2">
            Registros: {{ modalData.registros.length }}
          </p>
          <ul class="space-y-2 text-sm">
            <li
              v-for="(reg, idx) in modalData.registros"
              :key="idx"
              class="border rounded-lg p-2"
            >
              <div><strong>ID:</strong> {{ reg.id }}</div>
              <div>
                <strong>Duración:</strong>
                {{ (reg.duracion_trabajada / 3600).toFixed(2) }} h
              </div>
              <div><strong>Sueldo:</strong> {{ reg.sueldo_registro }} €</div>
              <div><strong>Fecha:</strong> {{ reg.fecha }}</div>
            </li>
          </ul>
        </div>
        <div class="text-sm text-gray-500" v-else>
          No hay registros para este día.
        </div>

        <div class="mt-4 text-right">
          <button class="btn btn-sm btn-outline" @click="cerrarModal">
            Cerrar
          </button>
        </div>
      </div>
    </div>
  </DashboardLayout>
</template>
