<script setup>
import Icono from "./Icono.vue";
defineProps({ grande: Boolean });
</script>

<template>
  <div class="flex items-center gap-2.5">
    <span
      class="flex items-center justify-center rounded-[10px] bg-primary text-primary-content"
      :class="grande ? 'size-11' : 'size-9'"
    >
      <Icono nombre="reloj" :tam="grande ? 24 : 20" grosor="2.2" />
    </span>
    <span class="font-display font-bold" :class="grande ? 'text-2xl' : 'text-xl'">Mi Jornada</span>
  </div>
</template>
