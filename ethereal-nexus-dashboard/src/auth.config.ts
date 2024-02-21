import * as bcrypt from 'bcryptjs';
import Credential from 'next-auth/providers/credentials';
import { userLoginSchema } from '@/data/users/dto';
import { getUserByEmail } from '@/data/users/actions';
import { getMembersByUser } from '@/data/member/actions';
import { NextAuthConfig } from 'next-auth';

type Role = "viewer" | "user" | "admin"

declare module "next-auth" {
  interface User {
    role?: Role
  }

  interface Session {
    user?: User;
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    /** OpenID ID Token */
    role?: Role
  }
}

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
      const members = await getMembersByUser(token.sub)
      if(members.success && members.data.length > 0) {
        session.permissions = members.data.reduce((acc,member) => {
          acc[member.resource] = member.permissions;
          return acc;
        }, {})
      }

      if(token.sub && session.user) {
        session.user.id = token.sub;
        session.user.role = token.role;
      }

      return session
    },
  }
} satisfies NextAuthConfig
