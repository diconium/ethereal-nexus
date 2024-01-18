import * as bcrypt from 'bcryptjs';
import Credential from 'next-auth/providers/credentials';
import type { NextAuthConfig } from 'next-auth';
import { userLoginSchema } from '@/data/users/dto';
import { getUserByEmail } from '@/data/users/actions';

export const authConfig = {
  trustHost: true,
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
          const user = await getUserByEmail(email);

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
  callbacks: {
    async session({ session, token }) {
      if(token.sub && session.user) {
        session.user.id = token.sub
      }

      return session
    }
  }
} satisfies NextAuthConfig
