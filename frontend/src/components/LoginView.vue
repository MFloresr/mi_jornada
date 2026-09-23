<template>
  <div class="min-h-screen bg-base-200 flex items-center justify-center px-4">
    <div class="w-full max-w-md">
      <div class="mb-7 flex justify-center"><Logo grande /></div>

      <!-- Card de recuperación de contraseña -->
      <div
        v-if="modoRecuperar"
        class="card rounded-[24px] border border-base-300 bg-base-100"
      >
        <div class="card-body">
          <h1 class="card-title justify-center text-lg">
            Recuperar contraseña
          </h1>

          <div v-if="recuperarEnviado" class="mt-2 space-y-4">
            <div class="alert alert-success text-sm">
              Si el email está registrado, recibirás un enlace para cambiar la
              contraseña. Caduca en 1 hora.
            </div>
            <button class="btn btn-outline w-full" @click="volverALogin">
              Volver al inicio de sesión
            </button>
          </div>

          <form v-else class="mt-2 space-y-3" @submit.prevent="onRecuperar">
            <p class="text-sm text-base-content/70 text-center">
              Introduce tu email y te enviaremos un enlace para elegir una
              contraseña nueva.
            </p>
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
              <span v-if="!loading">Enviar enlace</span>
              <span v-else class="flex items-center gap-2">
                <span class="loading loading-spinner loading-xs" />
                Enviando...
              </span>
            </button>
            <button
              type="button"
              class="btn btn-ghost btn-sm w-full"
              @click="volverALogin"
            >
              Volver al inicio de sesión
            </button>
          </form>
        </div>
      </div>

      <!-- Card de login -->
      <div v-else class="card rounded-[24px] border border-base-300 bg-base-100">
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
              <button
                type="button"
                class="link link-hover text-xs"
                @click="abrirRecuperar"
              >
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
          </form>

          <!-- Cuenta de demostración -->
          <div class="divider my-1 text-xs text-base-content/50">o</div>
          <button type="button" class="btn btn-outline w-full" :disabled="loading" @click="entrarDemo">
            Probar la demo
          </button>
          <p class="text-center text-xs text-base-content/60">
            Cuenta de ejemplo con datos ficticios. Lo que cambies se borra solo.
          </p>
        </div>
      </div>

      <p class="mt-4 text-center text-[11px] text-base-content/50">
        Tus credenciales se envían de forma segura. No compartas tu contraseña.
      </p>
    </div>
  </div>
</template>

<script setup>
import Logo from "./Logo.vue";
import { onMounted, ref } from "vue";
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

// Cuenta de demostración pública (los datos se regeneran en el servidor)
const DEMO = { email: "demo@example.com", password: "demo-mi-jornada" };

const entrarDemo = () => {
  email.value = DEMO.email;
  password.value = DEMO.password;
  onSubmit();
};

// /?demo=1 entra directamente con la cuenta demo (enlace del portfolio)
onMounted(() => {
  const url = new URL(window.location.href);
  if (url.searchParams.has("demo")) {
    url.searchParams.delete("demo");
    window.history.replaceState(null, "", url.pathname + url.search + url.hash);
    entrarDemo();
  }
});

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

/* ---------- Recuperar contraseña ---------- */
const modoRecuperar = ref(false);
const recuperarEnviado = ref(false);

const abrirRecuperar = () => {
  modoRecuperar.value = true;
  recuperarEnviado.value = false;
  error.value = null;
};

const volverALogin = () => {
  modoRecuperar.value = false;
  error.value = null;
};

const onRecuperar = async () => {
  loading.value = true;
  error.value = null;

  try {
    await api.post("password-reset/", { email: email.value });
    recuperarEnviado.value = true;
  } catch (err) {
    error.value = "No se pudo enviar la solicitud. Inténtalo de nuevo.";
  } finally {
    loading.value = false;
  }
};
</script>
