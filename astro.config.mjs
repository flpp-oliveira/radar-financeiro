// @ts-check
import { defineConfig } from 'astro/config'

import react from '@astrojs/react'
import tailwindcss from '@tailwindcss/vite'

// https://astro.build/config
// SITE_URL e BASE_PATH vêm do workflow de deploy (ex.: GitHub Pages em
// https://<dono>.github.io/radar-financeiro/). Localmente o site roda na raiz.
export default defineConfig({
  site: process.env.SITE_URL,
  base: process.env.BASE_PATH ?? '/',
  integrations: [react()],
  vite: {
    plugins: [tailwindcss()],
  },
})
