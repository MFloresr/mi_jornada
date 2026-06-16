<script setup>
import { computed } from "vue";

const props = defineProps({
  registros: {
    type: Array,
    default: () => [],
  },
});

// Ordenar por fecha descendente y coger los últimos N
const ultimosRegistros = computed(() => {
  if (!props.registros?.length) return [];
  return [...props.registros]
    .filter((r) => r.fecha)
    .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
    .slice(0, 10); // últimos 10
});

// Helper: formatear fecha a YYYY-MM-DD
function formatFecha(fechaStr) {
  if (!fechaStr) return "";
  return fechaStr.split("T")[0];
}

// Helper: horas en formato "xh"
function formatHoras(segundos) {
  const h = (segundos || 0) / 3600;
  return `${h.toFixed(1)}h`;
}
</script>

<template>
  <div class="bg-base-100 rounded-box shadow p-4 md:p-6 h-full">
    <h3 class="text-base md:text-xl font-bold mb-3 md:mb-4">
      Actividad reciente
    </h3>

    <div class="overflow-x-auto -mx-2 md:mx-0">
      <table class="table table-zebra w-full text-xs md:text-sm">
        <thead>
          <tr class="text-[11px] md:text-xs uppercase tracking-wide">
            <th>Fecha</th>
            <th>Descripción</th>
            <th class="hidden sm:table-cell">Lugar</th>
            <th>Horas</th>
            <th>Sueldo</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="!ultimosRegistros.length">
            <td
              colspan="5"
              class="text-center text-xs md:text-sm text-gray-500"
            >
              No hay registros recientes.
            </td>
          </tr>

          <tr
            v-for="reg in ultimosRegistros"
            :key="reg.id"
            class="align-middle"
          >
            <td class="whitespace-nowrap">
              {{ formatFecha(reg.fecha) }}
            </td>
            <td class="max-w-[140px] sm:max-w-none">
              <span class="line-clamp-2 md:line-clamp-3">
                {{ reg.descripcion || "Sin descripción" }}
              </span>
            </td>
            <td class="hidden sm:table-cell">
              {{ reg.lugar || "-" }}
            </td>
            <td class="whitespace-nowrap">
              {{ formatHoras(reg.duracion_trabajada) }}
            </td>
            <td class="text-green-600 font-semibold whitespace-nowrap">
              {{ (reg.sueldo_registro || 0).toFixed(2) }} €
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
