<script setup>
// Panel modal: hoja inferior en móvil y diálogo centrado en escritorio
import { nextTick, onBeforeUnmount, ref, watch } from "vue";
import Icono from "./Icono.vue";

const props = defineProps({
  abierta: Boolean,
  titulo: { type: String, required: true },
});
const emit = defineEmits(["cerrar"]);

const panel = ref(null);
let focoPrevio = null;

function alTeclear(e) {
  if (e.key === "Escape") emit("cerrar");
}

watch(
  () => props.abierta,
  async (abierta) => {
    if (abierta) {
      focoPrevio = document.activeElement;
      document.addEventListener("keydown", alTeclear);
      document.body.style.overflow = "hidden";
      await nextTick();
      panel.value?.focus();
    } else {
      document.removeEventListener("keydown", alTeclear);
      document.body.style.overflow = "";
      focoPrevio?.focus?.();
    }
  },
);

onBeforeUnmount(() => {
  document.removeEventListener("keydown", alTeclear);
  document.body.style.overflow = "";
});
</script>

<template>
  <Teleport to="body">
    <Transition name="hoja">
      <div
        v-if="abierta"
        class="fixed inset-0 z-50 flex items-end justify-center bg-black/50 md:items-center md:p-6"
        @click.self="emit('cerrar')"
      >
        <section
          ref="panel"
          role="dialog"
          aria-modal="true"
          :aria-label="titulo"
          tabindex="-1"
          class="hoja-panel flex max-h-[92dvh] w-full flex-col rounded-t-[28px] bg-base-200 outline-none md:max-w-lg md:rounded-[24px]"
        >
          <span class="mx-auto mt-3 h-1.5 w-10 rounded-full bg-base-300 md:hidden" aria-hidden="true"></span>
          <header class="flex items-center justify-between gap-3 px-5 pt-3 pb-2 md:pt-5">
            <h2 class="font-display text-2xl font-bold">{{ titulo }}</h2>
            <button class="btn btn-ghost btn-circle" aria-label="Cerrar" @click="emit('cerrar')">
              <Icono nombre="cerrar" />
            </button>
          </header>
          <div class="flex-1 overflow-y-auto px-5 pb-4">
            <slot />
          </div>
          <footer v-if="$slots.pie" class="border-t border-base-300 bg-base-100 px-5 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] md:rounded-b-[24px]">
            <slot name="pie" />
          </footer>
        </section>
      </div>
    </Transition>
  </Teleport>
</template>
