<template>
  <div class="grid min-h-dvh bg-base-200 md:grid-cols-[1.05fr_1fr]">
    <!-- Panel de marca: la tarjeta de fichaje es la pieza central -->
    <aside
      class="panel-puntos relative hidden flex-col justify-between gap-10 overflow-hidden bg-primary p-12 text-primary-content md:flex lg:p-14"
    >
      <div class="relative flex items-center gap-2.5 font-display text-[22px] font-bold">
        <span class="flex size-9 items-center justify-center rounded-[10px] bg-primary-content/15">
          <Icono nombre="reloj" :tam="20" grosor="2.2" />
        </span>
        Mi Jornada
      </div>

      <div class="relative flex flex-col gap-4">
        <h2 class="max-w-[12ch] font-display text-5xl leading-[1.04] font-bold text-balance lg:text-6xl">
          Tus horas, claras.
        </h2>
        <p class="max-w-[38ch] text-primary-content/80">
          Ficha al llegar, apunta lo que haces y ve cuánto llevas ganado. Sin hojas de cálculo.
        </p>

        <div
          class="mt-6 w-full max-w-[340px] -rotate-2 rounded-[22px] bg-base-100 p-4 text-base-content shadow-[0_30px_60px_-20px_rgb(0_0_0/0.55)]"
          aria-hidden="true"
        >
          <div class="flex items-center gap-3">
            <span class="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-content">
              <Icono nombre="reloj" :tam="22" />
            </span>
            <div class="flex flex-col leading-tight">
              <strong class="font-semibold">Jornada en curso</strong>
              <small class="text-base-content/60">Desde las 08:00</small>
            </div>
          </div>
          <dl class="my-3.5 grid grid-cols-[auto_1fr] gap-x-3.5 gap-y-1 text-[13px]">
            <dt class="text-base-content/60">Lugar</dt>
            <dd class="font-medium">Obra Diagonal</dd>
            <dt class="text-base-content/60">Hoy</dt>
            <dd class="font-medium tabular-nums">6 h 20 min</dd>
            <dt class="text-base-content/60">Ganado</dt>
            <dd class="font-medium tabular-nums">79,17 €</dd>
          </dl>
          <div class="flex gap-2 text-sm font-semibold">
            <span class="flex-1 rounded-xl border border-base-300 bg-base-200 p-2.5 text-center">Descanso</span>
            <span class="flex-1 rounded-xl bg-primary p-2.5 text-center text-primary-content">Terminar</span>
          </div>
        </div>
      </div>

      <p class="relative text-[13px] text-primary-content/70">
        Tus registros son tuyos: puedes descargarlos en CSV cuando quieras.
      </p>
    </aside>

    <main class="flex items-center justify-center px-4 py-10 md:px-10">
      <div class="flex w-full max-w-md flex-col gap-6">
        <div class="flex justify-center md:hidden"><Logo grande /></div>

        <section class="card rounded-[24px] border border-base-300 bg-base-100">
          <div class="card-body gap-0 p-6 md:p-9">
            <!-- ============ Recuperar contraseña ============ -->
            <template v-if="modo === 'recuperar'">
              <h1 class="font-display text-[28px] leading-tight font-bold text-balance">Recuperar contraseña</h1>

              <div v-if="recuperarEnviado" class="mt-4 space-y-4">
                <div class="alert alert-success text-sm" role="status">
                  Si el email está registrado, recibirás un enlace para cambiar la contraseña. Caduca en 1 hora.
                </div>
                <button class="btn btn-outline w-full" @click="ir('login')">Volver al inicio de sesión</button>
              </div>

              <form v-else class="mt-4 space-y-3.5" novalidate @submit.prevent="onRecuperar">
                <p class="text-sm text-base-content/70">
                  Introduce tu email y te enviaremos un enlace para elegir una contraseña nueva.
                </p>
                <div>
                  <label for="rec-email" class="mb-1.5 block text-sm font-medium">Email</label>
                  <input
                    id="rec-email"
                    v-model.trim="email"
                    type="email"
                    placeholder="nombre@correo.com"
                    autocomplete="email"
                    required
                    class="input input-bordered h-12 w-full"
                  />
                </div>
                <p v-if="error" class="text-sm text-error" role="alert">{{ error }}</p>
                <button type="submit" class="btn btn-primary h-12 w-full" :disabled="loading">
                  <span v-if="!loading">Enviar enlace</span>
                  <span v-else class="flex items-center gap-2">
                    <span class="loading loading-spinner loading-xs" /> Enviando...
                  </span>
                </button>
                <button type="button" class="btn btn-ghost btn-sm w-full" @click="ir('login')">
                  Volver al inicio de sesión
                </button>
              </form>
            </template>

            <!-- ============ Entrar / Crear cuenta ============ -->
            <template v-else>
              <h1 class="font-display text-[28px] leading-tight font-bold text-balance">
                {{ modo === "login" ? "Inicia sesión" : "Crea tu cuenta" }}
              </h1>
              <p class="mt-1.5 mb-5 text-[15px] text-base-content/70">
                {{
                  modo === "login"
                    ? "Entra para ver tu jornada y tus registros."
                    : "Gratis, en menos de un minuto."
                }}
              </p>

              <div
                class="mb-5 grid grid-cols-2 gap-1 rounded-[14px] border border-base-300 bg-base-200 p-1"
                role="tablist"
                aria-label="Acceso"
              >
                <button
                  v-for="t in PESTANAS"
                  :key="t.modo"
                  type="button"
                  role="tab"
                  :aria-selected="modo === t.modo"
                  class="h-10 rounded-[10px] text-sm font-semibold transition"
                  :class="modo === t.modo ? 'bg-base-100 shadow-sm' : 'text-base-content/60 hover:text-base-content'"
                  @click="ir(t.modo)"
                >
                  {{ t.texto }}
                </button>
              </div>

              <form class="space-y-3.5" novalidate @submit.prevent="onSubmit">
                <div v-if="modo === 'registro'">
                  <label for="nombre" class="mb-1.5 block text-sm font-medium">Nombre</label>
                  <input
                    id="nombre"
                    v-model.trim="nombre"
                    type="text"
                    placeholder="Cómo quieres que te llamemos"
                    autocomplete="given-name"
                    maxlength="40"
                    required
                    class="input input-bordered h-12 w-full"
                    :class="{ 'input-error': errores.nombre }"
                    :aria-invalid="!!errores.nombre"
                    aria-describedby="nombre-error"
                  />
                  <p v-if="errores.nombre" id="nombre-error" class="mt-1 text-xs text-error" role="alert">
                    {{ errores.nombre }}
                  </p>
                </div>

                <div>
                  <label for="email" class="mb-1.5 block text-sm font-medium">Email</label>
                  <input
                    id="email"
                    v-model.trim="email"
                    type="email"
                    placeholder="nombre@correo.com"
                    autocomplete="email"
                    required
                    class="input input-bordered h-12 w-full"
                    :class="{ 'input-error': errores.email }"
                    :aria-invalid="!!errores.email"
                    aria-describedby="email-error"
                  />
                  <p v-if="errores.email" id="email-error" class="mt-1 text-xs text-error" role="alert">
                    {{ errores.email }}
                  </p>
                </div>

                <div>
                  <label for="password" class="mb-1.5 block text-sm font-medium">Contraseña</label>
                  <div class="relative">
                    <input
                      id="password"
                      v-model="password"
                      :type="verClave ? 'text' : 'password'"
                      :placeholder="modo === 'login' ? 'Tu contraseña' : 'Mínimo 8 caracteres'"
                      :autocomplete="modo === 'login' ? 'current-password' : 'new-password'"
                      required
                      class="input input-bordered h-12 w-full pr-12"
                      :class="{ 'input-error': errores.password }"
                      :aria-invalid="!!errores.password"
                      aria-describedby="password-error"
                    />
                    <button
                      type="button"
                      class="absolute right-1.5 bottom-1.5 flex size-9 items-center justify-center rounded-lg text-base-content/60 hover:text-base-content"
                      :aria-label="verClave ? 'Ocultar contraseña' : 'Mostrar contraseña'"
                      :aria-pressed="verClave"
                      @click="verClave = !verClave"
                    >
                      <Icono nombre="ojo" :tam="19" />
                    </button>
                  </div>
                  <p v-if="errores.password" id="password-error" class="mt-1 text-xs text-error" role="alert">
                    {{ errores.password }}
                  </p>
                </div>

                <div v-if="modo === 'login'" class="flex items-center justify-between gap-3 text-[13.5px]">
                  <label class="flex cursor-pointer items-center gap-2">
                    <input v-model="remember" type="checkbox" class="checkbox checkbox-sm" />
                    <span>Recordar sesión</span>
                  </label>
                  <button type="button" class="link link-hover font-medium text-primary" @click="ir('recuperar')">
                    ¿Olvidaste la contraseña?
                  </button>
                </div>

                <p v-if="error" class="text-sm text-error" role="alert">{{ error }}</p>

                <button type="submit" class="btn btn-primary h-12 w-full text-base" :disabled="loading">
                  <span v-if="!loading">{{ modo === "login" ? "Entrar" : "Crear cuenta y empezar" }}</span>
                  <span v-else class="flex items-center gap-2">
                    <span class="loading loading-spinner loading-xs" />
                    {{ modo === "login" ? "Entrando..." : "Creando tu cuenta..." }}
                  </span>
                </button>
              </form>

              <!-- Cuenta de demostración -->
              <div class="my-5 flex items-center gap-3 text-[13px] text-base-content/50" aria-hidden="true">
                <span class="h-px flex-1 bg-base-300" />o<span class="h-px flex-1 bg-base-300" />
              </div>
              <button type="button" class="btn btn-outline h-12 w-full text-base" :disabled="loading" @click="entrarDemo">
                Probar la demo
              </button>
              <p class="mt-2 text-center text-[13px] text-base-content/60">
                Cuenta de ejemplo con datos ficticios. Lo que cambies se borra solo.
              </p>
            </template>
          </div>
        </section>

        <p class="text-center text-[11px] text-base-content/50">
          Tus credenciales se envían de forma segura. No compartas tu contraseña.
        </p>
      </div>
    </main>
  </div>
</template>

<script setup>
import Icono from "./Icono.vue";
import Logo from "./Logo.vue";
import { onMounted, reactive, ref } from "vue";
import api from "../api";

const emit = defineEmits(["logged-in"]);

const PESTANAS = [
  { modo: "login", texto: "Entrar" },
  { modo: "registro", texto: "Crear cuenta" },
];

const modo = ref("login"); // "login" | "registro" | "recuperar"
const nombre = ref("");
const email = ref("");
const password = ref("");
const remember = ref(false);
const verClave = ref(false);
const loading = ref(false);
const error = ref(null);
const errores = reactive({ nombre: "", email: "", password: "" });
const recuperarEnviado = ref(false);

function limpiarErrores() {
  error.value = null;
  Object.assign(errores, { nombre: "", email: "", password: "" });
}

function ir(destino) {
  modo.value = destino;
  recuperarEnviado.value = false;
  verClave.value = false;
  limpiarErrores();
}

function validar() {
  limpiarErrores();
  if (modo.value === "registro" && !nombre.value) errores.nombre = "Escribe tu nombre.";
  if (!email.value || !/^\S+@\S+\.\S+$/.test(email.value)) errores.email = "Introduce un email válido.";
  const minimo = modo.value === "registro" ? 8 : 6;
  if (!password.value || password.value.length < minimo)
    errores.password = `La contraseña debe tener al menos ${minimo} caracteres.`;
  return !errores.nombre && !errores.email && !errores.password;
}

const onSubmit = async () => {
  if (!validar()) return;
  loading.value = true;
  try {
    const registro = modo.value === "registro";
    const res = await api.post(registro ? "register/" : "login/", {
      nombre: nombre.value,
      email: email.value,
      password: password.value,
      remember: remember.value,
    });
    emit("logged-in", res.data);
  } catch (err) {
    const datos = err?.response?.data;
    if (datos?.errores) Object.assign(errores, datos.errores);
    else
      error.value =
        datos?.detail ||
        (modo.value === "registro"
          ? "No se pudo crear la cuenta. Inténtalo de nuevo."
          : "Credenciales inválidas o error al iniciar sesión.");
  } finally {
    loading.value = false;
  }
};

/* ---------- Cuenta de demostración pública (los datos se regeneran en el servidor) ---------- */
const DEMO = { email: "demo@example.com", password: "demo-mi-jornada" };

const entrarDemo = async () => {
  modo.value = "login";
  limpiarErrores();
  email.value = DEMO.email;
  password.value = DEMO.password;
  await onSubmit();
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

/* ---------- Recuperar contraseña ---------- */
const onRecuperar = async () => {
  loading.value = true;
  error.value = null;
  try {
    await api.post("password-reset/", { email: email.value });
    recuperarEnviado.value = true;
  } catch {
    error.value = "No se pudo enviar la solicitud. Inténtalo de nuevo.";
  } finally {
    loading.value = false;
  }
};
</script>
