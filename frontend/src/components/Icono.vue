<script setup>
// Iconos de trazo (24x24). Heredan el color del texto.
defineProps({
  nombre: { type: String, required: true },
  tam: { type: [Number, String], default: 22 },
  grosor: { type: [Number, String], default: 1.8 },
});

const TRAZOS = {
  reloj: ["M12 7v5l3 2", "circle:12,12,9"],
  calendario: ["M3 10h18M8 3v4M16 3v4", "rect:3,5,18,16,3"],
  lista: ["M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01"],
  grafico: ["M4 20V10M10 20V4M16 20v-7M22 20H2"],
  usuario: ["M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6", "circle:12,8,4"],
  mas: ["M12 5v14M5 12h14"],
  atras: ["M15 5l-7 7 7 7"],
  adelante: ["M9 5l7 7-7 7"],
  cerrar: ["M6 6l12 12M18 6L6 18"],
  luna: ["M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"],
  sol: ["M12 3v2M12 19v2M5 5l1.4 1.4M17.6 17.6 19 19M3 12h2M19 12h2M5 19l1.4-1.4M17.6 6.4 19 5", "circle:12,12,4"],
  chispa: ["M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8z", "M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z"],
  micro: ["M5 11a7 7 0 0 0 14 0M12 18v3", "rect:9,3,6,11,3"],
  info: ["M12 8v5M12 16h.01", "circle:12,12,9"],
  descargar: ["M12 4v11M7 10l5 5 5-5M5 20h14"],
  salir: ["M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 17l-5-5 5-5M5 12h11"],
  papelera: ["M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"],
  copiar: ["M8 8h11v12H8zM5 16V4h11"],
  repetir: ["M4 12a8 8 0 0 1 14-5.3L20 9M20 4v5h-5M20 12a8 8 0 0 1-14 5.3L4 15M4 20v-5h5"],
  pausa: ["M9 5v14M15 5v14"],
  lugar: ["M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z", "circle:12,10,2.5"],
};

function partes(nombre) {
  return (TRAZOS[nombre] || []).map((t) => {
    if (t.startsWith("circle:")) {
      const [cx, cy, r] = t.slice(7).split(",");
      return { tipo: "circle", cx, cy, r };
    }
    if (t.startsWith("rect:")) {
      const [x, y, w, h, rx] = t.slice(5).split(",");
      return { tipo: "rect", x, y, w, h, rx };
    }
    return { tipo: "path", d: t };
  });
}
</script>

<template>
  <svg
    :width="tam"
    :height="tam"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    :stroke-width="grosor"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
    class="shrink-0"
  >
    <template v-for="(p, i) in partes(nombre)" :key="i">
      <circle v-if="p.tipo === 'circle'" :cx="p.cx" :cy="p.cy" :r="p.r" />
      <rect v-else-if="p.tipo === 'rect'" :x="p.x" :y="p.y" :width="p.w" :height="p.h" :rx="p.rx" />
      <path v-else :d="p.d" />
    </template>
  </svg>
</template>
