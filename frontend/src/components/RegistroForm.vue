<script setup>
import { ref, watch } from "vue";

// Recibe un registro opcional cuando estamos editando
const props = defineProps({
  registro: {
    type: Object,
    default: null,
  },
});

const emit = defineEmits(["crear"]);

const formFecha = ref("");
const formEntrada = ref("");
const formSalida = ref("");
const formDescripcion = ref("");
const formLugar = ref("");
const formDescanso = ref(false);
const formSueldoHora = ref("");

// Cuando cambia props.registro (o al montar), rellenamos o limpiamos
watch(
  () => props.registro,
  (reg) => {
    if (!reg) {
      formFecha.value = "";
      formEntrada.value = "";
      formSalida.value = "";
      formDescripcion.value = "";
      formLugar.value = "";
      formDescanso.value = false;
      formSueldoHora.value = "";
      return;
    }
    formFecha.value = reg.fecha || "";
    formEntrada.value = reg.hora_entrada || "";
    formSalida.value = reg.hora_salida || "";
    formDescripcion.value = reg.descripcion || "";
    formLugar.value = reg.lugar || "";
    formDescanso.value = reg.descanso_comida || false;
    formSueldoHora.value =
      reg.sueldo_por_hora != null ? String(reg.sueldo_por_hora) : "";
  },
  { immediate: true },
);

function submit() {
  if (!formFecha.value || !formEntrada.value || !formSalida.value) {
    emit("crear", null);
    return;
  }

  const payload = {
    fecha: formFecha.value,
    hora_entrada: formEntrada.value,
    hora_salida: formSalida.value,
    descripcion: formDescripcion.value,
    lugar: formLugar.value,
    descanso_comida: formDescanso.value,
    sueldo_por_hora: formSueldoHora.value
      ? parseFloat(formSueldoHora.value)
      : null,
  };

  emit("crear", payload);
}
</script>

<template>
  <div class="card bg-base-100 shadow">
    <div class="card-body grid gap-4 md:grid-cols-2">
      <div class="md:col-span-2">
        <h2 class="card-title text-base md:text-lg">
          {{
            registro
              ? "Editar registro de jornada"
              : "Nuevo registro de jornada"
          }}
        </h2>
        <p class="text-xs md:text-sm opacity-70">
          Rellena los datos y se guardarán para el usuario autenticado.
        </p>
      </div>

      <!-- Fecha -->
      <div>
        <label class="label py-1">
          <span class="label-text text-xs md:text-sm">Fecha</span>
        </label>
        <input
          v-model="formFecha"
          type="date"
          class="input input-bordered w-full input-sm md:input-md"
        />
      </div>

      <!-- Hora de entrada -->
      <div>
        <label class="label py-1">
          <span class="label-text text-xs md:text-sm">Hora de entrada</span>
        </label>
        <input
          v-model="formEntrada"
          type="time"
          class="input input-bordered w-full input-sm md:input-md"
        />
      </div>

      <!-- Hora de salida -->
      <div>
        <label class="label py-1">
          <span class="label-text text-xs md:text-sm">Hora de salida</span>
        </label>
        <input
          v-model="formSalida"
          type="time"
          class="input input-bordered w-full input-sm md:input-md"
        />
      </div>

      <!-- Descripción -->
      <div class="md:col-span-2">
        <label class="label py-1">
          <span class="label-text text-xs md:text-sm">Descripción</span>
        </label>
        <textarea
          v-model="formDescripcion"
          class="textarea textarea-bordered w-full textarea-sm md:textarea-md"
          rows="2"
        ></textarea>
      </div>

      <!-- Lugar -->
      <div>
        <label class="label py-1">
          <span class="label-text text-xs md:text-sm">Lugar</span>
        </label>
        <input
          v-model="formLugar"
          type="text"
          class="input input-bordered w-full input-sm md:input-md"
        />
      </div>

      <!-- Descanso comida -->
      <div class="flex items-center gap-2">
        <input
          v-model="formDescanso"
          type="checkbox"
          class="checkbox checkbox-sm"
        />
        <span class="text-xs md:text-sm">Incluye descanso de comida</span>
      </div>

      <!-- Sueldo por hora -->
      <div>
        <label class="label py-1">
          <span class="label-text text-xs md:text-sm">
            Sueldo por hora (opcional)
          </span>
        </label>
        <input
          v-model="formSueldoHora"
          type="number"
          step="0.01"
          class="input input-bordered w-full input-sm md:input-md"
        />
      </div>

      <div class="md:col-span-2 flex justify-end pt-1">
        <button class="btn btn-primary btn-sm md:btn-md" @click="submit">
          {{ registro ? "Guardar cambios" : "Guardar registro" }}
        </button>
      </div>
    </div>
  </div>
</template>
