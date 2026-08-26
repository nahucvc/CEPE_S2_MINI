import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// La salida de compilación se guarda en la carpeta data del proyecto
// para que el ESP32 la sirva desde SPIFFS.
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: "../data",
    emptyOutDir: true,
  },
  server: {
    host: true,
    port: 5173,
  },
});