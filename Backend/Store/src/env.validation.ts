import { z } from 'zod';

const jwtExpiresPattern = /^(?:\d+|\d+[smhd])$/;

const EnvSchema = z
  .object({
    NODE_ENV: z.string().default('development'),
    DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
    REDIS_URL: z.string().optional(),
    RABBITMQ_URL: z.string().optional(),
    JWT_SECRET: z.string().optional(),
    JWT_EXPIRES_IN: z
      .string()
      .default('7d')
      .refine((value) => jwtExpiresPattern.test(value), {
        message:
          'JWT_EXPIRES_IN must be a positive integer (seconds) or a duration like 15m, 7d, 12h',
      }),
    PORT: z.coerce.number().int().min(1).max(65535).default(4000),
    HOST: z.string().min(1).default('0.0.0.0'),
  })
  .superRefine((env, ctx) => {
    if (env.NODE_ENV === 'production' && !env.JWT_SECRET) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['JWT_SECRET'],
        message: 'JWT_SECRET is required when NODE_ENV=production',
      });
    }
  });

export type ValidatedEnv = z.infer<typeof EnvSchema>;

export function validateEnvironment(rawEnv: NodeJS.ProcessEnv): ValidatedEnv {
  const parsed = EnvSchema.safeParse(rawEnv);

  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `- ${issue.path.join('.') || 'env'}: ${issue.message}`)
      .join('\n');

    throw new Error(`Environment validation failed:\n${details}`);
  }

  return parsed.data;
}
