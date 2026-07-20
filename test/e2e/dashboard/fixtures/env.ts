import z from 'zod';

const envSchema = z.object({
  projectId: z.string({
    required_error: 'TEST_E2E_PROJECT_ID is required.',
  }).uuid(),
  environmentId: z.string({
    required_error: 'TEST_E2E_ENVIRONMENT_ID is required.',
  }).uuid(),
  apiKey: z.string({
    required_error: 'TEST_E2E_API_KEY is required.',
  }).uuid(),
  internalServiceSecret: z.string({
    required_error: 'TEST_E2E_INTERNAL_SERVICE_SECRET is required.',
  }),
});

export const envData = envSchema.parse({
  projectId: process.env.TEST_E2E_PROJECT_ID,
  environmentId: process.env.TEST_E2E_ENVIRONMENT_ID,
  apiKey: process.env.TEST_E2E_API_KEY,
  internalServiceSecret: process.env.TEST_E2E_INTERNAL_SERVICE_SECRET,
});
