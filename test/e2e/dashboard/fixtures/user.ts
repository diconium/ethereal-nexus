import z from 'zod'

const user = z.object({
  username: z.string({
    required_error: 'Username is required, please add TEST_VALID_USERNAME to the .env.'
  }).email(),
  password: z.string({
    message: 'Password is required, please add TEST_VALID_PASSWORD to the .env.'
  }).min(8, { message: 'Password has a minimum of 8 chars, please review TEST_VALID_PASSWORD.' })
});

export const userData = {
  validUser: user.parse({
    username: process.env.TEST_VALID_USERNAME,
    password: process.env.TEST_VALID_PASSWORD
  }),
  invalidUser: {
    username: "wronguser",
    password: "wrongpassword"
  }
} as const