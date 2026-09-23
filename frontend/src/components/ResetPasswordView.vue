<template>
  <div class="min-h-screen bg-base-200 flex items-center justify-center px-4">
    <div class="w-full max-w-md">
      <div class="mb-7 flex justify-center"><Logo grande /></div>

      <div class="card rounded-[24px] border border-base-300 bg-base-100">
        <div class="card-body">
          <h1 class="card-title justify-center text-lg">Nueva contraseña</h1>

          <div v-if="hecho" class="mt-2 space-y-4">
            <div class="alert alert-success text-sm">
              Contraseña actualizada. Ya puedes iniciar sesión.
            </div>
            <a href="/" class="btn btn-primary w-full">Ir al inicio de sesión</a>
          </div>

          <form v-else class="mt-2 space-y-3" @submit.prevent="onSubmit">
            <div class="form-control">
              <label class="label">
                <span class="label-text">Contraseña nueva</span>
              </label>
              <input
                type="password"
                v-model="password"
                autocomplete="new-password"
                minlength="8"
                required
                class="input input-bordered w-full"
              />
            </div>

            <div class="form-control">
              <label class="label">
                <span class="label-text">Repite la contraseña</span>
              </label>
              <input
                type="password"
                v-model="password2"
                autocomplete="new-password"
                minlength="8"
                required
                class="input input-bordered w-full"
              />
            </div>

            <p v-if="error" class="text-xs text-error mt-1">
              {{ error }}
            </p>

            <button
              type="submit"
              class="btn btn-primary w-full"
              :disabled="loading"
            >
              <span v-if="!loading">Cambiar contraseña</span>
              <span v-else class="flex items-center gap-2">
                <span class="loading loading-spinner loading-xs" />
                Guardando...
              </span>
            </button>
            <a href="/" class="btn btn-ghost btn-sm w-full">Cancelar</a>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import Logo from "./Logo.vue";
import { ref } from "vue";
import api from "../api";

const props = defineProps({
  token: { type: String, required: true },
});

const password = ref("");
const password2 = ref("");
const loading = ref(false);
const error = ref(null);
const hecho = ref(false);

const onSubmit = async () => {
  if (password.value !== password2.value) {
    error.value = "Las contraseñas no coinciden.";
    return;
  }

  loading.value = true;
  error.value = null;

  try {
    await api.post(`password-reset/${props.token}/`, {
      password: password.value,
    });
    hecho.value = true;
  } catch (err) {
    error.value =
      err?.response?.data?.detail ||
      "No se pudo cambiar la contraseña. Pide un enlace nuevo.";
  } finally {
    loading.value = false;
  }
};
</script>
