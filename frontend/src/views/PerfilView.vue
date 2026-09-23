<script setup>
import Icono from "../components/Icono.vue";
import { cerrarSesion, estado } from "../store";

defineProps({ oscuro: Boolean });
const emit = defineEmits(["cambiar-tema"]);
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
      <div class="flex items-center justify-between gap-3 p-4">
        <div class="flex flex-col">
          <span class="text-[15px] font-semibold">Sueldo por hora</span>
          <span class="text-[13px] text-base-content/70">Lo cambia el administrador</span>
        </div>
        <span class="cifra text-lg font-bold text-dinero">{{ estado.usuario?.sueldo_por_hora?.toFixed(2).replace(".", ",") }} €/h</span>
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

    <button class="btn h-12 rounded-xl border-base-300 bg-base-100 text-error" @click="cerrarSesion">
      <Icono nombre="salir" :tam="20" />Cerrar sesión
    </button>
  </main>
</template>
