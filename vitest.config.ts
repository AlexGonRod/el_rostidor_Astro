import { getViteConfig } from 'astro/config';
import 'vitest/config';

export default getViteConfig({
  test: {
    include: ['tests/unit/**/*.test.ts'],
    environment: 'node',
  },
});
