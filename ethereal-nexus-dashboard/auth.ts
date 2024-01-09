import NextAuth from "next-auth"
import Credential from "next-auth/providers/credentials"
import * as bcrypt from 'bcryptjs';

import { db } from '@/db';
import { users } from '@/data/users/schema';
import { eq } from 'drizzle-orm';
import { userLoginSchema, userSchema } from '@/data/users/dto';

export const {
  handlers: { GET, POST },
  auth,
} = NextAuth({
  session: { strategy: 'jwt' },
  secret: process.env.NEXT_AUTH_SECRET,
  providers: [
    Credential({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "text", placeholder: "jsmith@yourcompany.com" },
        password: {  label: "Password", type: "password" }
      },
      async authorize(credentials, req) {
        const safeCredentials = userLoginSchema.safeParse(credentials)
        if(safeCredentials.success) {
          const { password, email } = safeCredentials.data;

          const userSelect = await db
            .select()
            .from(users)
            .where(eq(users.email, email));

          const user = userSchema.safeParse(userSelect[0])

          if(user.success && user.data.password && password) {
            const passwordMatches = await bcrypt.compare(
              password,
              user.data.password
            )

            if(passwordMatches) {
              return user.data
            }
          }
        }
        return null;
      }
    })
  ],
})