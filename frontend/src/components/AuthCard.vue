<script setup>
import { ref } from "vue";
import api from "../api";

const props = defineProps({
  userInfo: Object,
});

const emit = defineEmits(["logged-in", "logged-out"]);

const username = ref("");
const password = ref("");
const authLoading = ref(false);
const error = ref(null);

async function hacerLogin() {
  authLoading.value = true;
  error.value = null;
  try {
    const resp = await api.post("login/", {
      username: username.value,
      password: password.value,
    });
    emit("logged-in", resp.data);
    await api.get("csrf-ping/");
  } catch (err) {
    console.error("Error login:", err);
    error.value = "Login incorrecto";
  } finally {
    authLoading.value = false;
  }
}

async function hacerLogout() {
  authLoading.value = true;
  error.value = null;
  try {
    await api.post("logout/");
    emit("logged-out");
    username.value = "";
    password.value = "";
  } catch (err) {
    console.error("Error logout:", err);
    error.value = "Error cerrando sesión";
  } finally {
    authLoading.value = false;
  }
}
</script>

<template>
  <!-- Contenedor centrado (el App.vue ya añade min-h-screen, aquí solo la tarjeta) -->
  <div class="card bg-base-100 shadow-lg w-full max-w-sm mx-auto">
    <div class="card-body space-y-3">
      <div>
        <h2 class="card-title text-lg md:text-xl">Autenticación</h2>
        <p class="text-xs md:text-sm text-gray-500">
          Inicia sesión para gestionar tu jornada.
        </p>
      </div>

      <div v-if="!userInfo" class="space-y-2">
        <input
          v-model="username"
          type="text"
          placeholder="Usuario"
          class="input input-bordered w-full input-sm md:input-md"
          autocomplete="username"
        />
        <input
          v-model="password"
          type="password"
          placeholder="Contraseña"
          class="input input-bordered w-full input-sm md:input-md"
          autocomplete="current-password"
        />
        <button
          class="btn btn-primary w-full btn-sm md:btn-md"
          :disabled="authLoading"
          @click="hacerLogin"
        >
          {{ authLoading ? "Entrando..." : "Entrar" }}
        </button>
        <p v-if="error" class="text-error text-xs md:text-sm mt-1">
          {{ error }}
        </p>
      </div>

      <div
        v-else
        class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"
      >
        <p class="text-xs md:text-sm">
          Sesión iniciada como
          <span class="font-semibold">{{ userInfo.username }}</span>
        </p>
        <button
          class="btn btn-outline btn-xs md:btn-sm"
          :disabled="authLoading"
          @click="hacerLogout"
        >
          {{ authLoading ? "Saliendo..." : "Logout" }}
        </button>
      </div>
    </div>
  </div>
</template>
