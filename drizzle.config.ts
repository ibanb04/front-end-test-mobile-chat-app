import type { Config } from 'drizzle-kit';

export default {
  schema: './database/schema',
  out: './database/migrations',
  dialect: 'sqlite',
  driver: 'expo',
} satisfies Config; 