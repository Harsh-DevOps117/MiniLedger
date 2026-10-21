import { config as dotenv } from 'dotenv';
import path from 'node:path';
import { z } from 'zod';

dotenv({ path: path.resolve(__dirname, '../../../.env'), quiet: true });
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(32),
  OTP_SECRET: z.string().min(32),
  CORS_ORIGINS: z.string().default('http://localhost:8081,http://localhost:8080'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error', 'silent']).default('info'),
});
export function readConfig(env: NodeJS.ProcessEnv = process.env) {
  const result = envSchema.safeParse(env);
  if (!result.success)
    throw new Error(
      `Invalid environment: ${result.error.issues.map((issue) => issue.path.join('.') + ': ' + issue.message).join('; ')}`,
    );
  return {
    ...result.data,
    corsOrigins: result.data.CORS_ORIGINS.split(',').map((origin) => origin.trim()),
  };
}
export type Config = ReturnType<typeof readConfig>;
