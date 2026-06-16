<template>
  <div class="bg-base-100 rounded-box shadow p-3 md:p-6 mb-6">
    <!-- Header calendario -->
    <div
      class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4"
    >
      <div>
        <h3 class="text-base md:text-xl font-bold">Calendario de jornadas</h3>
        <p class="text-xs md:text-sm text-gray-500">
          {{ monthName }} {{ currentYear }}
        </p>
      </div>
      <div class="flex gap-2 justify-end">
        <button class="btn btn-xs md:btn-sm btn-outline" @click="prevMonth">
          ◀ Mes
        </button>
        <button class="btn btn-xs md:btn-sm btn-outline" @click="nextMonth">
          Mes ▶
        </button>
      </div>
    </div>

    <!-- Días de la semana -->
    <div
      class="grid grid-cols-7 gap-1 md:gap-2 mb-2 text-center text-[10px] md:text-xs font-semibold text-gray-500"
    >
      <div>Lu</div>
      <div>Ma</div>
      <div>Mi</div>
      <div>Ju</div>
      <div>Vi</div>
      <div>Sá</div>
      <div>Do</div>
    </div>

    <!-- Grid del mes -->
    <div class="grid grid-cols-7 gap-1 md:gap-2 calendario">
      <div
        v-for="day in calendarDays"
        :key="day.key"
        class="h-20 md:h-24 border-2 rounded-lg p-1 md:p-1.5 text-[10px] md:text-xs relative cursor-pointer transition-all flex flex-col overflow-hidden"
        :class="dayCellClass(day)"
        @click="clickDia(day)"
      >
        <!-- Número de día + punto horas -->
        <div class="flex justify-between items-start">
          <span class="font-semibold text-xs md:text-sm">
            {{ day.dayOfMonth || "" }}
          </span>
          <span
            v-if="day.totalHours > 0"
            class="w-2 h-2 rounded-full mt-1 flex-shrink-0"
            :class="dotClass(day.totalHours)"
          />
        </div>

        <!-- Contenido variable -->
        <div class="mt-1 space-y-0.5">
          <div v-if="day.totalHours > 0">
            <span
              class="block text-[10px] md:text-[11px] font-medium text-purple-700 truncate"
            >
              ⏱️ {{ day.totalHours.toFixed(1) }}h
            </span>
          </div>

          <div v-if="day.totalSueldo > 0">
            <span
              class="block text-[10px] md:text-[11px] text-green-700 truncate"
            >
              {{ day.totalSueldo.toFixed(0) }} €
            </span>
          </div>
        </div>

        <!-- Badge hoy -->
        <div
          v-if="day.isToday"
          class="absolute bottom-1 right-1 text-[9px] md:text-[10px] px-2 py-[2px] rounded-full bg-blue-500 text-white"
        >
          Hoy
        </div>

        <!-- Solo admin: botón detalle -->
        <div
          v-if="esAdmin && day.totalHours > 0"
          class="absolute top-1 right-1"
        >
          <button
            @click.stop="verDetalleDia(day)"
            class="text-[9px] md:text-xs bg-purple-600 text-white px-1.5 py-[2px] rounded hover:bg-purple-700"
          >
            Detalle
          </button>
        </div>
      </div>
    </div>

    <!-- Leyenda bajo el calendario -->
    <div
      class="mt-4 grid grid-cols-1 md:grid-cols-3 gap-2 md:gap-3 text-[11px] md:text-xs text-gray-600"
    >
      <div class="flex items-center gap-2">
        <span
          class="inline-block w-3 h-3 rounded-full bg-purple-200 border border-purple-400"
        />
        <span>Días con pocas horas (&lt; 4h)</span>
      </div>
      <div class="flex items-center gap-2">
        <span
          class="inline-block w-3 h-3 rounded-full bg-purple-300 border border-purple-500"
        />
        <span>Días normales (4–8h)</span>
      </div>
      <div class="flex items-center gap-2">
        <span
          class="inline-block w-3 h-3 rounded-full bg-purple-500 border border-purple-700"
        />
        <span>Días intensos (&gt; 8h)</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from "vue";

const props = defineProps({
  registros: {
    type: Array,
    default: () => [],
  },
  esAdmin: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(["ver-detalle-dia"]);

const today = new Date();
const currentMonth = ref(today.getMonth());
const currentYear = ref(today.getFullYear());

const monthNames = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

const monthName = computed(() => monthNames[currentMonth.value]);

const registrosPorDia = computed(() => {
  const map = {};

  for (const reg of props.registros) {
    if (!reg.fecha) continue;
    const fechaStr = reg.fecha.split("T")[0];

    if (!map[fechaStr]) {
      map[fechaStr] = {
        totalSegundos: 0,
        totalSueldo: 0,
      };
    }

    const seg =
      typeof reg.duracion_trabajada === "number" ? reg.duracion_trabajada : 0;
    const sueldo =
      typeof reg.sueldo_registro === "number" ? reg.sueldo_registro : 0;

    map[fechaStr].totalSegundos += seg;
    map[fechaStr].totalSueldo += sueldo;
  }

  return map;
});

const calendarDays = computed(() => {
  const days = [];

  const firstDay = new Date(currentYear.value, currentMonth.value, 1);
  const firstDayWeekday = firstDay.getDay();
  const daysInMonth = new Date(
    currentYear.value,
    currentMonth.value + 1,
    0,
  ).getDate();

  // Lunes como primer día (0 = lunes)
  const offset = (firstDayWeekday + 6) % 7;

  // Huecos antes del día 1
  for (let i = 0; i < offset; i++) {
    days.push({
      key: `blank-${i}`,
      dayOfMonth: null,
      dateStr: null,
      totalHours: 0,
      totalSueldo: 0,
      isToday: false,
      isCurrentMonth: false,
    });
  }

  // Días del mes
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(currentYear.value, currentMonth.value, day);
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const dd = String(day).padStart(2, "0");
    const dateStr = `${yyyy}-${mm}-${dd}`;

    const info = registrosPorDia.value[dateStr] || {
      totalSegundos: 0,
      totalSueldo: 0,
    };

    const totalHours = info.totalSegundos / 3600;
    const totalSueldo = info.totalSueldo;

    const isToday =
      day === today.getDate() &&
      currentMonth.value === today.getMonth() &&
      currentYear.value === today.getFullYear();

    days.push({
      key: dateStr,
      dayOfMonth: day,
      dateStr,
      totalHours,
      totalSueldo,
      isToday,
      isCurrentMonth: true,
    });
  }

  return days;
});

function dayCellClass(day) {
  if (!day.isCurrentMonth) {
    return "bg-gray-50 border-dashed border-gray-200 text-gray-300 cursor-default";
  }

  if (day.totalHours === 0) {
    return "bg-white border-gray-200 hover:bg-gray-50";
  }

  if (day.totalHours < 4) {
    return "bg-purple-50 border-purple-200 hover:bg-purple-100";
  }

  if (day.totalHours <= 8) {
    return "bg-purple-100 border-purple-300 hover:bg-purple-200";
  }

  return "bg-purple-200 border-purple-400 hover:bg-purple-300";
}

function dotClass(totalHours) {
  if (totalHours < 4) return "bg-purple-300";
  if (totalHours <= 8) return "bg-purple-500";
  return "bg-purple-700";
}

function prevMonth() {
  if (currentMonth.value === 0) {
    currentMonth.value = 11;
    currentYear.value -= 1;
  } else {
    currentMonth.value -= 1;
  }
}

function nextMonth() {
  if (currentMonth.value === 11) {
    currentMonth.value = 0;
    currentYear.value += 1;
  } else {
    currentMonth.value += 1;
  }
}

// click general en la celda (admin y no-admin)
function clickDia(day) {
  if (!day.dateStr) return;

  const dateStr = day.dateStr;

  const registrosDia = props.registros.filter((reg) => {
    if (!reg.fecha) return false;
    return reg.fecha.split("T")[0] === dateStr;
  });

  emit("ver-detalle-dia", {
    dateStr,
    day,
    registros: registrosDia,
  });
}

// Admin: botón Detalle reutiliza la misma lógica
function verDetalleDia(day) {
  clickDia(day);
}
</script>

<style scoped>
.calendario > div {
  transition: all 0.2s ease;
}
</style>
