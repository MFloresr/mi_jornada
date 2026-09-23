<script setup>
import { computed } from "vue";
import Icono from "./Icono.vue";
import Logo from "./Logo.vue";
import { estado } from "../store";

defineProps({ vista: { type: String, required: true } });
const emit = defineEmits(["nuevo"]);

const SECCIONES = [
  { id: "hoy", texto: "Hoy", icono: "reloj" },
  { id: "registros", texto: "Registros", icono: "lista" },
  { id: "calendario", texto: "Calendario", icono: "calendario" },
  { id: "estadisticas", texto: "Estadísticas", icono: "grafico" },
  { id: "perfil", texto: "Perfil", icono: "usuario" },
];

const inicial = computed(() => (estado.usuario?.nombre || "?").charAt(0).toUpperCase());
</script>

<template>
  <div class="min-h-dvh md:flex">
    <!-- Barra lateral (escritorio) -->
    <aside class="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col gap-7 border-r border-base-300 bg-base-100 px-4 py-7 md:flex">
      <div class="px-2"><Logo /></div>
      <nav aria-label="Navegación principal" class="flex flex-col gap-1">
        <a
          v-for="s in SECCIONES"
          :key="s.id"
          :href="`#/${s.id}`"
          :aria-current="vista === s.id ? 'page' : undefined"
          class="flex h-11 items-center gap-3 rounded-xl px-3 text-[15px] transition-colors"
          :class="vista === s.id ? 'bg-secondary font-bold text-secondary-content' : 'font-medium text-base-content/80 hover:bg-base-200'"
        >
          <Icono :nombre="s.icono" :tam="20" />{{ s.texto }}
        </a>
      </nav>
      <button class="btn btn-primary h-12 rounded-xl text-[15px]" @click="emit('nuevo')">
        <Icono nombre="mas" :tam="20" grosor="2.2" />Añadir registro
      </button>
      <a href="#/perfil" class="mt-auto flex items-center gap-2.5 rounded-2xl bg-base-200 p-3.5">
        <span class="flex size-9 items-center justify-center rounded-full bg-neutral font-bold text-neutral-content">{{ inicial }}</span>
        <span class="flex min-w-0 flex-col">
          <span class="truncate text-sm font-semibold">{{ estado.usuario?.nombre }}</span>
          <span class="cifra text-xs text-base-content/70">{{ estado.usuario?.sueldo_por_hora?.toFixed(2).replace(".", ",") }} €/h</span>
        </span>
      </a>
    </aside>

    <div class="min-w-0 flex-1 pb-28 md:pb-0">
      <slot />
    </div>

    <!-- Botón flotante (móvil) -->
    <button
      class="btn btn-circle fixed right-5 bottom-[calc(6rem+env(safe-area-inset-bottom))] z-30 size-15 border-0 bg-neutral text-neutral-content shadow-lg md:hidden"
      aria-label="Añadir registro"
      @click="emit('nuevo')"
    >
      <Icono nombre="mas" :tam="26" grosor="2.2" />
    </button>

    <!-- Barra inferior (móvil) -->
    <nav
      aria-label="Navegación principal"
      class="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-base-300 bg-base-100 px-1 pt-1.5 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:hidden"
    >
      <a
        v-for="s in SECCIONES"
        :key="s.id"
        :href="`#/${s.id}`"
        :aria-current="vista === s.id ? 'page' : undefined"
        class="flex h-14 flex-col items-center justify-center gap-1 text-[11px]"
        :class="vista === s.id ? 'font-bold text-enlace' : 'font-medium text-base-content/70'"
      >
        <Icono :nombre="s.icono" :grosor="vista === s.id ? 2 : 1.8" />{{ s.texto }}
      </a>
    </nav>
  </div>
</template>
