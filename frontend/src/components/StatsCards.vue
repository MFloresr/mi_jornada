<script setup>
import { computed } from "vue";

const props = defineProps({
  registros: {
    type: Array,
    default: () => [],
  },
});

// Helpers fechas
function parseFecha(fechaStr) {
  if (!fechaStr) return null;
  const base = fechaStr.split("T")[0]; // "YYYY-MM-DD"
  return new Date(base);
}

function isSameDate(d1, d2) {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

function getWeekRange(date) {
  const day = date.getDay(); // 0 domingo, 1 lunes...
  const diffToMonday = (day + 6) % 7; // 0 si ya es lunes
  const monday = new Date(date);
  monday.setDate(date.getDate() - diffToMonday);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return { monday, sunday };
}

// 1. Horas hoy
const horasHoy = computed(() => {
  if (!props.registros?.length) return 0;
  const hoy = new Date();
  let totalSegundos = 0;

  for (const reg of props.registros) {
    const d = parseFecha(reg.fecha);
    if (!d) continue;
    if (isSameDate(d, hoy)) {
      totalSegundos += reg.duracion_trabajada || 0;
    }
  }
  return totalSegundos / 3600;
});

// 2. Horas semana actual
const horasSemana = computed(() => {
  if (!props.registros?.length) return 0;
  const hoy = new Date();
  const { monday, sunday } = getWeekRange(hoy);
  let totalSegundos = 0;

  for (const reg of props.registros) {
    const d = parseFecha(reg.fecha);
    if (!d) continue;
    if (d >= monday && d <= sunday) {
      totalSegundos += reg.duracion_trabajada || 0;
    }
  }
  return totalSegundos / 3600;
});

// 3. Sueldo mes actual
const sueldoMes = computed(() => {
  if (!props.registros?.length) return 0;
  const hoy = new Date();
  const mes = hoy.getMonth();
  const year = hoy.getFullYear();
  let total = 0;

  for (const reg of props.registros) {
    const d = parseFecha(reg.fecha);
    if (!d) continue;
    if (d.getFullYear() === year && d.getMonth() === mes) {
      total += reg.sueldo_registro || 0;
    }
  }
  return total;
});

// 4. Registros mes actual
const registrosMes = computed(() => {
  if (!props.registros?.length) return 0;
  const hoy = new Date();
  const mes = hoy.getMonth();
  const year = hoy.getFullYear();
  let count = 0;

  for (const reg of props.registros) {
    const d = parseFecha(reg.fecha);
    if (!d) continue;
    if (d.getFullYear() === year && d.getMonth() === mes) {
      count += 1;
    }
  }
  return count;
});
</script>

<template>
  <!-- Stats Cards -->
  <div
    class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-6"
  >
    <!-- Horas Hoy -->
    <div
      class="stat-card bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-lg shadow-lg p-4 md:p-6"
    >
      <div class="flex items-center justify-between gap-2">
        <div>
          <p class="text-xs md:text-sm opacity-90">Horas hoy</p>
          <p class="text-2xl md:text-4xl font-bold mt-1 md:mt-2">
            {{ horasHoy.toFixed(1) }}h
          </p>
          <p class="text-[11px] md:text-xs opacity-75 mt-1">+0h desde ayer</p>
        </div>
        <svg
          class="w-9 h-9 md:w-12 md:h-12 opacity-50 flex-shrink-0"
          fill="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"
          />
        </svg>
      </div>
    </div>

    <!-- Horas Semana -->
    <div
      class="stat-card bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-lg shadow-lg p-4 md:p-6"
    >
      <div class="flex items-center justify-between gap-2">
        <div>
          <p class="text-xs md:text-sm opacity-90">Horas semana</p>
          <p class="text-2xl md:text-4xl font-bold mt-1 md:mt-2">
            {{ horasSemana.toFixed(1) }}h
          </p>
          <p class="text-[11px] md:text-xs opacity-75 mt-1">Semana actual</p>
        </div>
        <svg
          class="w-9 h-9 md:w-12 md:h-12 opacity-50 flex-shrink-0"
          fill="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"
          />
        </svg>
      </div>
    </div>

    <!-- Sueldo Mes -->
    <div
      class="stat-card bg-gradient-to-br from-green-500 to-green-600 text-white rounded-lg shadow-lg p-4 md:p-6"
    >
      <div class="flex items-center justify-between gap-2">
        <div>
          <p class="text-xs md:text-sm opacity-90">Sueldo mes</p>
          <p class="text-2xl md:text-4xl font-bold mt-1 md:mt-2">
            {{ sueldoMes.toFixed(0) }} €
          </p>
          <p class="text-[11px] md:text-xs opacity-75 mt-1">+0 € esta semana</p>
        </div>
        <svg
          class="w-9 h-9 md:w-12 md:h-12 opacity-50 flex-shrink-0"
          fill="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.52 1.97-2.6 1.97-2.3 0-2.94-.93-3.03-2.2h-2.21c.07 2.22 1.66 3.67 3.93 4.19V21h3v-2.15c2.12-.45 3.57-1.69 3.57-3.64 0-2.29-2.04-3.45-4.76-4.21z"
          />
        </svg>
      </div>
    </div>

    <!-- Registros Mes -->
    <div
      class="stat-card bg-gradient-to-br from-orange-500 to-orange-600 text-white rounded-lg shadow-lg p-4 md:p-6"
    >
      <div class="flex items-center justify-between gap-2">
        <div>
          <p class="text-xs md:text-sm opacity-90">Registros mes</p>
          <p class="text-2xl md:text-4xl font-bold mt-1 md:mt-2">
            {{ registrosMes }}
          </p>
          <p class="text-[11px] md:text-xs opacity-75 mt-1">+0 esta semana</p>
        </div>
        <svg
          class="w-9 h-9 md:w-12 md:h-12 opacity-50 flex-shrink-0"
          fill="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            d="M14 2H6c-1.1 0-1.99.9-1.99 2v16c0 1.1.89 2 1.99 2h8c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 18H6V4h2v2h1V6h2v2h1V6h2v2h1V6h2v12H14z"
          />
        </svg>
      </div>
    </div>
  </div>
</template>
