<script setup>
// Avisos de estado: sin conexión, cambios por enviar, cambios rechazados y versión nueva
import Icono from "./Icono.vue";
import { estado, sincronizar } from "../store";
import { red } from "../offline/red";
import { pwa, recargar } from "../pwa";

const cambios = (n) => (n === 1 ? "1 cambio" : `${n} cambios`);
</script>

<template>
  <div v-if="red.sinConexion || estado.pendientes || estado.rechazadas.length || pwa.nuevaVersion" class="mx-auto flex max-w-6xl flex-col gap-2 px-5 pt-4 md:px-9">
    <!-- Sin conexión -->
    <p v-if="red.sinConexion" role="status" class="flex items-start gap-3 rounded-2xl bg-accent px-4 py-3 text-sm text-accent-content">
      <Icono nombre="nubeoff" :tam="20" class="mt-0.5 shrink-0" />
      <span>
        <strong>Sin conexión.</strong>
        Puedes seguir fichando y guardando registros: se guardan en este dispositivo y se envían solos cuando vuelva la conexión.
        <template v-if="estado.pendientes"> Pendientes de enviar: <strong>{{ cambios(estado.pendientes) }}</strong>.</template>
      </span>
    </p>

    <!-- Con conexión y cambios guardados en el dispositivo -->
    <p
      v-else-if="estado.pendientes"
      role="status"
      class="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-secondary px-4 py-3 text-sm text-secondary-content"
    >
      <span class="flex items-center gap-3">
        <span v-if="estado.sincronizando" class="loading loading-spinner loading-sm" aria-hidden="true"></span>
        <Icono v-else nombre="nube" :tam="20" class="shrink-0" />
        <span v-if="estado.sincronizando">Enviando {{ cambios(estado.pendientes) }}…</span>
        <span v-else>Hay <strong>{{ cambios(estado.pendientes) }}</strong> guardados en este dispositivo sin enviar.</span>
      </span>
      <button v-if="!estado.sincronizando" class="btn btn-sm h-9 rounded-full border-0 bg-base-100 text-base-content" @click="sincronizar()">Enviar ahora</button>
    </p>

    <!-- Cambios que el servidor no aceptó -->
    <p v-if="estado.rechazadas.length" role="alert" class="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-error bg-base-100 px-4 py-3 text-sm text-error">
      <span>{{ cambios(estado.rechazadas.length) }} no se {{ estado.rechazadas.length === 1 ? "pudo" : "pudieron" }} enviar.</span>
      <a href="#/perfil" class="font-semibold underline">Revisar</a>
    </p>

    <!-- Versión nueva de la app -->
    <p v-if="pwa.nuevaVersion" role="status" class="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-secondary px-4 py-3 text-sm text-secondary-content">
      <span>Hay una versión nueva de Mi Jornada.</span>
      <button class="btn btn-sm h-9 rounded-full border-0 bg-base-100 text-base-content" @click="recargar">Actualizar</button>
    </p>
  </div>
</template>
