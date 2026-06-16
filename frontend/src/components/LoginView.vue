<template>
  <div class="min-h-screen bg-base-200 flex items-center justify-center px-4">
    <div class="w-full max-w-md">
      <!-- Logo -->
      <div class="flex items-center justify-center gap-2 mb-6">
        <div
          class="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-success flex items-center justify-center text-base-100 font-bold shadow-md"
        >
          MJ
        </div>
        <div
          class="text-xs font-semibold tracking-[0.2em] uppercase text-base-content/70"
        >
          Mi Jornada
        </div>
      </div>

      <!-- Card de login -->
      <div class="card bg-base-100 shadow-xl border border-base-300">
        <div class="card-body">
          <h1 class="card-title justify-center text-lg">Inicia sesión</h1>
          <p class="text-sm text-base-content/70 text-center">
            Introduce tu email y contraseña para acceder a tu panel.
          </p>

          <form class="mt-4 space-y-3" @submit.prevent="onSubmit">
            <!-- Email -->
            <div class="form-control">
              <label class="label">
                <span class="label-text">Email</span>
              </label>
              <input
                type="email"
                v-model.trim="email"
                placeholder="nombre@empresa.com"
                autocomplete="email"
                required
                class="input input-bordered w-full"
                :class="{ 'input-error': emailError }"
              />
              <label v-if="emailError" class="label">
                <span class="label-text-alt text-error text-xs">
                  Introduce un email válido.
                </span>
              </label>
            </div>

            <!-- Password -->
            <div class="form-control">
              <label class="label">
                <span class="label-text">Contraseña</span>
              </label>
              <input
                type="password"
                v-model.trim="password"
                placeholder="Tu contraseña"
                minlength="6"
                autocomplete="current-password"
                required
                class="input input-bordered w-full"
                :class="{ 'input-error': passwordError }"
              />
              <label v-if="passwordError" class="label">
                <span class="label-text-alt text-error text-xs">
                  La contraseña debe tener al menos 6 caracteres.
                </span>
              </label>
            </div>

            <!-- Opciones -->
            <div class="flex items-center justify-between text-xs mt-1">
              <label class="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  v-model="remember"
                  class="checkbox checkbox-xs"
                />
                <span class="label-text">Recordar sesión</span>
              </label>
              <button type="button" class="link link-hover text-xs">
                ¿Olvidaste la contraseña?
              </button>
            </div>

            <!-- Error backend -->
            <p v-if="error" class="text-xs text-error mt-1">
              {{ error }}
            </p>

            <!-- Botón -->
            <div class="form-control mt-3">
              <button
                type="submit"
                class="btn btn-primary w-full"
                :disabled="loading"
              >
                <span v-if="!loading">Entrar</span>
                <span v-else class="flex items-center gap-2">
                  <span class="loading loading-spinner loading-xs" />
                  Entrando...
                </span>
              </button>
            </div>

            <!-- Footer -->
            <p class="text-center text-xs text-base-content/70 mt-2">
              ¿Todavía no tienes cuenta?
              <a href="#" class="link link-primary link-hover"
                >Crear una nueva</a
              >
            </p>
          </form>
        </div>
      </div>

      <p class="mt-4 text-center text-[11px] text-base-content/50">
        Tus credenciales se envían de forma segura. No compartas tu contraseña.
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref } from "vue";
import api from "../api";

const emit = defineEmits(["logged-in"]);

const email = ref("");
const password = ref("");
const remember = ref(false);
const loading = ref(false);
const error = ref(null);

const emailError = ref(false);
const passwordError = ref(false);

const validate = () => {
  emailError.value = !email.value || !email.value.includes("@");
  passwordError.value = !password.value || password.value.length < 6;
  return !emailError.value && !passwordError.value;
};

const onSubmit = async () => {
  if (!validate()) return;

  loading.value = true;
  error.value = null;

  try {
    const res = await api.post("login/", {
      email: email.value,
      password: password.value,
      remember: remember.value,
    });
    emit("logged-in", res.data);
  } catch (err) {
    error.value =
      err?.response?.data?.detail ||
      "Credenciales inválidas o error al iniciar sesión.";
  } finally {
    loading.value = false;
  }
};
</script>
