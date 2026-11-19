import { createApp } from "vue";
import App from "./App.vue";
import "./style.css";
import { iniciarPWA } from "./pwa";

iniciarPWA();

createApp(App).mount("#app");
