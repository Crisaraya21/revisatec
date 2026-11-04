import react from '@vitejs/plugin-react'
import { execSync } from 'child_process'
import { defineConfig } from 'vite'

// URL base de Azure APIM (unico punto de entrada)
const APIM_BASE = 'https://apimanagementcristopherarayavega.azure-api.net/revisatec';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // MS1 — Gestion academica (cursos, grupos, calendario)
      '/revisatec-api': {
        target: APIM_BASE,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/revisatec-api/, ''),
      },
      // MS3 — Notificaciones (Cris): todas las rutas /notifications/* van al mismo APIM
      // APIM enruta internamente via set-backend-service backend-id="ms-notifications"
      '/notifications': {
        target: APIM_BASE,
        changeOrigin: true,
        // No se reescribe el path: /notifications -> APIM /revisatec/notifications
      },
    },
  },
  define: {
    __APP_VERSION__: JSON.stringify(
      (() => { try { return execSync('git describe --tags --always').toString().trim(); } catch { return 'dev'; } })()
    ),
  },
})
