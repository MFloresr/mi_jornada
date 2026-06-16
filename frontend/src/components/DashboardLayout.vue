<template>
  <div
    :class="[
      'min-h-screen flex flex-col md:flex-row',
      dark ? 'bg-base-200' : 'bg-gray-100',
    ]"
  >
    <!-- Sidebar desktop (fija) -->
    <aside
      v-if="showSidebar"
      class="hidden md:flex md:flex-col md:w-64 bg-base-300 shadow-xl"
    >
      <div class="p-6">
        <h1 class="text-2xl font-bold text-primary">Mi Jornada</h1>
        <p class="text-sm text-gray-500 mt-1">Control de Horas</p>
      </div>

      <nav class="mt-6 flex-1">
        <a
          href="#"
          class="flex items-center gap-3 px-6 py-3 bg-primary text-primary-content hover:bg-primary-focus"
        >
          Dashboard
        </a>
        <!-- resto de enlaces de la sidebar tal cual -->
      </nav>

      <div class="px-6 mt-4 mb-6">
        <div class="p-4 bg-base-200 rounded-lg">
          <p class="text-sm font-semibold">Usuario Actual</p>
          <p class="text-lg font-bold text-primary">
            {{ userName }}
          </p>
          <p class="text-xs text-gray-500">
            {{ esAdmin ? "Admin" : "Usuario" }}
          </p>
        </div>
      </div>
    </aside>

    <!-- Sidebar móvil (overlay) -->
    <transition name="fade">
      <aside
        v-if="mobileSidebarOpen && showSidebar"
        class="fixed inset-0 z-40 flex md:hidden"
      >
        <!-- fondo oscuro -->
        <div class="flex-1 bg-black/50" @click="mobileSidebarOpen = false" />
        <!-- panel lateral -->
        <div class="w-64 bg-base-300 shadow-xl flex flex-col">
          <div class="p-4 flex items-center justify-between">
            <div>
              <h1 class="text-xl font-bold text-primary">Mi Jornada</h1>
              <p class="text-xs text-gray-500">Control de Horas</p>
            </div>
            <button
              class="btn btn-ghost btn-xs"
              @click="mobileSidebarOpen = false"
            >
              ✕
            </button>
          </div>

          <nav class="mt-2 flex-1">
            <a
              href="#"
              class="flex items-center gap-3 px-4 py-3 bg-primary text-primary-content hover:bg-primary-focus text-sm"
            >
              Dashboard
            </a>
            <!-- resto de enlaces -->
          </nav>

          <div class="px-4 mt-2 mb-4">
            <div class="p-3 bg-base-200 rounded-lg">
              <p class="text-xs font-semibold">Usuario Actual</p>
              <p class="text-sm font-bold text-primary">
                {{ userName }}
              </p>
              <p class="text-[11px] text-gray-500">
                {{ esAdmin ? "Admin" : "Usuario" }}
              </p>
            </div>
          </div>
        </div>
      </aside>
    </transition>

    <!-- Contenido principal -->
    <div class="flex-1 flex flex-col">
      <!-- Top Header -->
      <header
        class="flex items-center justify-between gap-3 bg-white shadow-sm px-4 py-3 md:px-6 md:py-4"
      >
        <!-- Izquierda: botón menú móvil + título -->
        <div class="flex items-center gap-3">
          <!-- Botón menú móvil -->
          <button
            v-if="showSidebar"
            class="btn btn-ghost btn-sm md:hidden"
            @click="mobileSidebarOpen = !mobileSidebarOpen"
          >
            ☰
          </button>

          <div>
            <h2 class="text-lg md:text-2xl font-bold">Dashboard</h2>
            <p class="text-xs md:text-sm text-gray-500">
              Bienvenido{{ userName ? `, ${userName}` : "" }}. Aquí tienes el
              resumen de tu actividad.
            </p>
          </div>
        </div>

        <!-- Derecha: acciones -->
        <div class="flex items-center gap-2 md:gap-4">
          <!-- Botón tema -->
          <button
            class="btn btn-ghost btn-xs md:btn-sm"
            @click="$emit('toggle-theme')"
          >
            <span class="hidden sm:inline">
              {{ dark ? "Modo claro" : "Modo oscuro" }}
            </span>
            <span class="sm:hidden">
              {{ dark ? "☀️" : "🌙" }}
            </span>
          </button>

          <!-- NUEVA ENTRADA -->
          <button
            class="btn btn-secondary btn-xs md:btn-sm"
            @click="$emit('new-entry-click')"
          >
            <span class="hidden sm:inline">Nueva entrada</span>
            <span class="sm:hidden">+</span>
          </button>

          <!-- Login / Logout -->
          <button
            class="btn btn-primary btn-xs md:btn-sm"
            @click="$emit('nav-auth-click')"
          >
            <span v-if="userInfo">Logout</span>
            <span v-else>Login</span>
          </button>

          <!-- Menú usuario -->
          <div class="dropdown dropdown-end">
            <label tabindex="0" class="btn btn-ghost btn-xs md:btn-sm">
              <svg
                class="w-4 h-4 md:w-5 md:h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M12 5v.01M12 19v.01M12 11v.01M12 17v.01M5 12h.01M19 12h.01M11 12h.01M17 12h.01"
                />
              </svg>
            </label>
            <ul
              tabindex="0"
              class="dropdown-content menu p-2 shadow bg-base-100 rounded-box w-40 md:w-52 text-sm"
            >
              <li><a>Perfil</a></li>
              <li><a>Configuración</a></li>
              <li>
                <a class="text-error" @click="$emit('nav-auth-click')">
                  Logout
                </a>
              </li>
            </ul>
          </div>
        </div>
      </header>

      <!-- Contenido que viene del padre -->
      <div class="flex-1">
        <slot />
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from "vue";

const props = defineProps({
  esAdmin: Boolean,
  dark: Boolean,
  userInfo: Object,
  showSidebar: {
    type: Boolean,
    default: true,
  },
});

defineEmits(["toggle-theme", "nav-auth-click", "new-entry-click"]);

const mobileSidebarOpen = ref(false);

const userName = computed(() => {
  if (!props.userInfo) return "Invitado";
  return props.userInfo.username || props.userInfo.email || "Usuario";
});
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
