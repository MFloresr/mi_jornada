<script setup>
import { computed } from "vue";

const props = defineProps({
  registros: {
    type: Array,
    default: () => [],
  },
});

// Helpers
function parseFecha(fechaStr) {
  if (!fechaStr) return null;
  const base = fechaStr.split("T")[0];
  return new Date(base);
}

// 1. Días trabajados (días distintos con registros)
const diasTrabajados = computed(() => {
  const fechas = new Set();
  for (const reg of props.registros) {
    if (!reg.fecha) continue;
    fechas.add(reg.fecha.split("T")[0]);
  }
  return fechas.size;
});

// 2. Horas promedio/día (sobre días trabajados)
const horasPromedioDia = computed(() => {
  if (!props.registros?.length) return 0;

  const totalSegundosPorDia = new Map();

  for (const reg of props.registros) {
    if (!reg.fecha) continue;
    const key = reg.fecha.split("T")[0];
    const prev = totalSegundosPorDia.get(key) || 0;
    totalSegundosPorDia.set(key, prev + (reg.duracion_trabajada || 0));
  }

  const dias = totalSegundosPorDia.size;
  if (!dias) return 0;

  let totalSegundos = 0;
  for (const val of totalSegundosPorDia.values()) {
    totalSegundos += val;
  }

  return totalSegundos / 3600 / dias;
});

// 3. Lugar más usado
const lugarMasUsado = computed(() => {
  const count = new Map();

  for (const reg of props.registros) {
    const lugar = reg.lugar || "Sin lugar";
    count.set(lugar, (count.get(lugar) || 0) + 1);
  }

  if (!count.size) return "-";

  let maxLugar = null;
  let maxCount = 0;

  for (const [lugar, c] of count.entries()) {
    if (c > maxCount) {
      maxCount = c;
      maxLugar = lugar;
    }
  }

  return maxLugar;
});

// 4. Descansos comida
const descansosComida = computed(() => {
  let n = 0;
  for (const reg of props.registros) {
    if (reg.descanso_comida && reg.descanso_comida > 0) {
      n += 1;
    }
  }
  return n;
});

// 5. Objetivo mensual
const horasTotales = computed(() => {
  let totalSegundos = 0;
  for (const reg of props.registros) {
    totalSegundos += reg.duracion_trabajada || 0;
  }
  return totalSegundos / 3600;
});

const objetivoMensual = 40;

const porcentajeObjetivo = computed(() => {
  if (!objetivoMensual) return 0;
  return Math.min(100, (horasTotales.value / objetivoMensual) * 100);
});
</script>

<template>
  <div class="bg-base-100 rounded-box shadow p-4 md:p-6 h-full">
    <h3 class="text-base md:text-xl font-bold mb-3 md:mb-4">
      Estadísticas rápidas
    </h3>

    <div class="space-y-3 md:space-y-4 text-xs md:text-sm">
      <div
        class="flex items-center justify-between p-2.5 md:p-3 bg-blue-50 rounded-lg"
      >
        <span class="font-semibold">Días trabajados</span>
        <span class="text-lg md:text-xl font-bold text-blue-600">
          {{ diasTrabajados }}
        </span>
      </div>

      <div
        class="flex items-center justify-between p-2.5 md:p-3 bg-green-50 rounded-lg"
      >
        <span class="font-semibold">Horas promedio/día</span>
        <span class="text-lg md:text-xl font-bold text-green-600">
          {{ horasPromedioDia.toFixed(1) }}h
        </span>
      </div>

      <div
        class="flex items-center justify-between p-2.5 md:p-3 bg-purple-50 rounded-lg"
      >
        <span class="font-semibold">Lugar más usado</span>
        <span
          class="text-xs md:text-lg font-bold text-purple-600 text-right line-clamp-1"
        >
          {{ lugarMasUsado }}
        </span>
      </div>

      <div
        class="flex items-center justify-between p-2.5 md:p-3 bg-orange-50 rounded-lg"
      >
        <span class="font-semibold">Descansos comida</span>
        <span class="text-lg md:text-xl font-bold text-orange-600">
          {{ descansosComida }}
        </span>
      </div>

      <div
        class="mt-4 md:mt-6 p-3 md:p-4 bg-gradient-to-r from-primary to-primary-hover rounded-lg text-white"
      >
        <p class="text-[11px] md:text-sm opacity-90">Objetivo mensual</p>
        <p class="text-xl md:text-2xl font-bold mt-1">
          {{ horasTotales.toFixed(1) }}h / {{ objetivoMensual }}h
        </p>
        <div class="mt-2 bg-white bg-opacity-30 rounded-full h-1.5 md:h-2">
          <div
            class="bg-white rounded-full h-1.5 md:h-2"
            :style="{ width: `${porcentajeObjetivo}%` }"
          ></div>
        </div>
        <p class="text-[11px] md:text-xs mt-1 opacity-90">
          {{ porcentajeObjetivo.toFixed(0) }}% completado
        </p>
      </div>
    </div>
  </div>
</template>
