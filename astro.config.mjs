// astro.config.mjs
import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import react from '@astrojs/react';
import vercel from '@astrojs/vercel';

export default defineConfig({
  output: 'server', // ⬅️ ACTIVE LE SERVEUR
  adapter: vercel(), // ⬅️ DIT "JE SUIS SUR VERCEL"
  integrations: [
    tailwind(),
    react()
  ],
});
