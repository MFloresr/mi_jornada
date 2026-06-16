<script setup>
const props = defineProps({
  registros: {
    type: Array,
    default: () => [],
  },
});
</script>

<template>
  <div class="mt-4">
    <p class="mb-2 text-xs md:text-sm text-gray-600">
      Registros en memoria: {{ registros.length }}
    </p>

    <div v-if="!registros.length" class="text-xs md:text-sm text-gray-500">
      No hay registros todavía.
    </div>

    <div v-else class="space-y-2">
      <div
        v-for="r in registros"
        :key="r.id"
        class="card bg-base-100 shadow-sm hover:shadow-md transition"
      >
        <div class="card-body py-2.5 md:py-3 px-3 md:px-4">
          <div class="flex justify-between items-start gap-3">
            <div class="min-w-0">
              <h2 class="font-semibold text-xs md:text-sm truncate">
                {{ r.fecha }} — {{ r.hora_entrada }}–{{ r.hora_salida }}
              </h2>
              <p class="text-[11px] md:text-xs opacity-70 truncate">
                {{ r.lugar || "Sin lugar" }}
              </p>
            </div>
            <div class="text-right flex-shrink-0">
              <p class="font-bold text-sm md:text-base">
                {{ (r.duracion_trabajada / 3600).toFixed(2) }} h
              </p>
              <p class="text-xs md:text-sm text-primary">
                {{ r.sueldo_registro.toFixed(2) }} €
              </p>
            </div>
          </div>

          <p
            v-if="r.descripcion"
            class="text-[11px] md:text-sm mt-1 line-clamp-2 md:line-clamp-3"
          >
            {{ r.descripcion }}
          </p>
        </div>
      </div>
    </div>
  </div>
</template>
