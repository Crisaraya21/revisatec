import react from '@vitejs/plugin-react'
import { execSync } from 'child_process'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify(execSync('git describe --tags --always').toString().trim()),
  },
})