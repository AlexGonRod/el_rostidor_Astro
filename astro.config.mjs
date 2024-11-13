// @ts-check
import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import icon from 'astro-icon';

import netlify from '@astrojs/netlify';

// https://astro.build/config
export default defineConfig({
  image: {
    domains: ["astro.build"],
    remotePatterns: [{ hostname: "**.cdninstagram.com" }]
  },
  integrations: [tailwind(), icon({
    include: {
      mdi: ["*"],
    },
  })],

  output: "hybrid",
  adapter: netlify(),
});
